import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  ActiveDelivery as Rs3ActiveDelivery,
  DeliveryLeg,
  DeliveryStatus,
  GeoPoint,
  RiderJob,
  RouteStop,
} from '@chinooz/types'
import { RS3_TRIP_SIMULATOR, type TripSimState } from '@chinooz/rs3'

/**
 * RJ5 — shared rider active-delivery store.
 *
 * Single source of truth for the rider's currently-assigned delivery. Home,
 * Jobs (Active tab), and the full-screen Active Delivery route all read from
 * this store so the resume banner, the per-status bottom sheet, and the map
 * always agree.
 *
 * The store owns:
 *  - the delivery state machine (assigned → ... → delivered, + cancelled/failed)
 *  - the full RS3 job payload (legs, pickup/dropoff stops, payout, COD)
 *  - the RS3 trip simulator state for the currently-active leg
 *
 * Callers only push high-level intents: acceptJob(job), advanceStatus(),
 * cancel(reason), minimize(), resume(), tick(deltaSeconds), clear().
 */

export type ActiveDeliveryStage = DeliveryStatus

/**
 * Public RJ5 active-delivery shape. Extends the RS3 entity with the legacy
 * Jobs-tab compat fields (pickupLabel, dropoffLabel, acceptedAt, etaDropoffMs).
 */
export type ActiveDelivery = Rs3ActiveDelivery

interface ActiveDeliveryState {
  activeDelivery: ActiveDelivery | null
  /** The active leg's simulator state, kept in sync with `activeDelivery`. */
  sim: TripSimState | null

  /** Accept a job and begin the delivery (entry point from Jobs/Home). */
  acceptJob: (job: RiderJob) => void
  /** Replace the active delivery wholesale (legacy RJ5 setter). */
  setActiveDelivery: (delivery: ActiveDelivery | null) => void
  /** Advance to the next status in the state machine. */
  advanceStatus: () => void
  /** Set the stage directly (legacy RJ5 setter; clamped to the flow). */
  setStage: (stage: ActiveDeliveryStage) => void
  /** Mark the delivery as cancelled. */
  cancel: (reason?: string) => void
  /** Mark the delivery as failed. */
  fail: (reason?: string) => void
  /** Pause the delivery (issue reported, pending dispatch). */
  pause: (reason: string) => void
  /** Escalate to support (keeps state, logs the escalation). */
  escalate: (reason: string) => void
  /** Minimize to a resume banner on Home/Jobs. */
  minimize: () => void
  /** Resume from the minimized banner into the Active route. */
  resume: () => void
  /** Drive the trip simulator forward by `deltaSeconds`. */
  tick: (deltaSeconds: number) => void
  /** Clear the delivery once delivered / cancelled / failed and dismissed. */
  clearActiveDelivery: () => void
}

/** Ordered happy-path statuses. */
const FLOW: DeliveryStatus[] = [
  'assigned',
  'heading_to_pickup',
  'at_pickup',
  'picked_up',
  'in_transit',
  'at_dropoff',
  'delivered',
]

const TERMINAL: ReadonlySet<DeliveryStatus> = new Set(['delivered', 'cancelled', 'failed'])

/** The leg that should be animating for a given status. */
function legForStatus(status: DeliveryStatus): 'legToPickup' | 'legToDropoff' | null {
  switch (status) {
    case 'heading_to_pickup':
      return 'legToPickup'
    case 'picked_up':
    case 'in_transit':
      return 'legToDropoff'
    default:
      return null
  }
}

/** Progress within the active leg for a freshly-entered status. */
function startingProgress(status: DeliveryStatus): number {
  if (status === 'in_transit') return 0.0001
  return 0
}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return createJSONStorage(() => localStorage)
  }
  return createJSONStorage(() => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }))
}

export const useActiveDeliveryStore = create<ActiveDeliveryState>()(
  persist(
    (set, get) => ({
      activeDelivery: null,
      sim: null,

      acceptJob: job => {
        const now = Date.now()
        const delivery: ActiveDelivery = {
          jobId: job.id,
          orderRef: job.orderRef,
          customerName: job.customerName,
          pickup: job.pickup,
          dropoff: job.dropoff,
          legToPickup: job.legToPickup,
          legToDropoff: job.legToDropoff,
          payout: job.payout,
          isCod: job.isCod,
          codAmount: job.codAmount,
          currency: job.currency,
          proof: job.proof,
          status: 'assigned',
          legProgress: 0,
          currentPoint: job.legToPickup.points[0],
          etaSeconds: job.legToPickup.etaSeconds,
          distanceMeters: job.legToPickup.distanceMeters,
          minimized: false,
          startedAt: now,
          updatedAt: now,
          // Legacy RJ5 fields derived from the RS3 stops.
          pickupLabel: job.pickup.label,
          dropoffLabel: job.dropoff.label,
          etaDropoffMs: now + (job.legToPickup.etaSeconds + job.legToDropoff.etaSeconds) * 1000,
          acceptedAt: now,
        }
        set({ activeDelivery: delivery, sim: null })
      },

      setActiveDelivery: delivery => set({ activeDelivery: delivery, sim: null }),

      advanceStatus: () => {
        const { activeDelivery, sim } = get()
        if (!activeDelivery) return
        if (TERMINAL.has(activeDelivery.status)) return
        const idx = FLOW.indexOf(activeDelivery.status)
        if (idx < 0 || idx >= FLOW.length - 1) return
        const nextStatus = FLOW[idx + 1]
        const now = Date.now()

        let nextPoint: GeoPoint = activeDelivery.currentPoint
        let eta = activeDelivery.etaSeconds
        let distance = activeDelivery.distanceMeters
        let legProgress = 0
        let nextSim: TripSimState | null = sim

        const legKey = legForStatus(nextStatus)
        if (legKey) {
          const legData: DeliveryLeg = activeDelivery[legKey]
          legProgress = startingProgress(nextStatus)
          if (nextStatus === 'heading_to_pickup') {
            nextPoint = activeDelivery.legToPickup.points[0]
          } else if (nextStatus === 'picked_up') {
            nextPoint = activeDelivery.pickup
          }
          eta = legData.etaSeconds
          distance = legData.distanceMeters
          nextSim = RS3_TRIP_SIMULATOR.resume(legData, legProgress)
        } else {
          nextSim = null
          if (nextStatus === 'at_pickup') {
            nextPoint = activeDelivery.pickup
            legProgress = 1
            eta = 0
            distance = 0
          } else if (nextStatus === 'at_dropoff') {
            nextPoint = activeDelivery.dropoff
            legProgress = 1
            eta = 0
            distance = 0
          } else if (nextStatus === 'delivered') {
            nextPoint = activeDelivery.dropoff
            legProgress = 1
            eta = 0
            distance = 0
          } else if (nextStatus === 'assigned') {
            nextPoint = activeDelivery.legToPickup.points[0]
            eta = activeDelivery.legToPickup.etaSeconds
            distance = activeDelivery.legToPickup.distanceMeters
          }
        }

        set({
          sim: nextSim,
          activeDelivery: {
            ...activeDelivery,
            status: nextStatus,
            legProgress,
            currentPoint: nextPoint,
            etaSeconds: eta,
            distanceMeters: distance,
            updatedAt: now,
            etaDropoffMs: now + eta * 1000,
            completedAt: nextStatus === 'delivered' ? now : activeDelivery.completedAt,
          },
        })
      },

      setStage: stage => {
        const { activeDelivery } = get()
        if (!activeDelivery) return
        if (TERMINAL.has(stage) || FLOW.includes(stage)) {
          set({ activeDelivery: { ...activeDelivery, status: stage, updatedAt: Date.now() } })
        }
      },

      cancel: reason => {
        const { activeDelivery } = get()
        if (!activeDelivery) return
        set({
          sim: null,
          activeDelivery: {
            ...activeDelivery,
            status: 'cancelled',
            cancelReason: reason,
            minimized: false,
            updatedAt: Date.now(),
          },
        })
      },

      fail: reason => {
        const { activeDelivery } = get()
        if (!activeDelivery) return
        set({
          sim: null,
          activeDelivery: {
            ...activeDelivery,
            status: 'failed',
            failureReason: reason,
            minimized: false,
            completedAt: Date.now(),
            updatedAt: Date.now(),
          },
        })
      },

      pause: reason => {
        const { activeDelivery } = get()
        if (!activeDelivery) return
        if (TERMINAL.has(activeDelivery.status)) return
        set({
          sim: null,
          activeDelivery: {
            ...activeDelivery,
            minimized: false,
            updatedAt: Date.now(),
            failureReason: `PAUSED: ${reason}`,
          },
        })
      },

      escalate: _reason => {
        const { activeDelivery } = get()
        if (!activeDelivery) return
        set({
          activeDelivery: {
            ...activeDelivery,
            updatedAt: Date.now(),
          },
        })
      },

      minimize: () => {
        const { activeDelivery } = get()
        if (!activeDelivery) return
        if (TERMINAL.has(activeDelivery.status)) return
        set({ activeDelivery: { ...activeDelivery, minimized: true, updatedAt: Date.now() } })
      },

      resume: () => {
        const { activeDelivery } = get()
        if (!activeDelivery || !activeDelivery.minimized) return
        set({ activeDelivery: { ...activeDelivery, minimized: false, updatedAt: Date.now() } })
      },

      tick: deltaSeconds => {
        const { activeDelivery, sim } = get()
        if (!activeDelivery || !sim) return
        const legKey = legForStatus(activeDelivery.status)
        if (!legKey) return
        const nextSim = RS3_TRIP_SIMULATOR.advance(sim, deltaSeconds)
        if (nextSim === sim) return
        set({
          sim: nextSim,
          activeDelivery: {
            ...activeDelivery,
            currentPoint: nextSim.point,
            legProgress: nextSim.progress,
            etaSeconds: nextSim.remainingSeconds,
            distanceMeters: nextSim.remainingMeters,
            updatedAt: Date.now(),
            etaDropoffMs: Date.now() + nextSim.remainingSeconds * 1000,
          },
        })
      },

      clearActiveDelivery: () => set({ activeDelivery: null, sim: null }),
    }),
    {
      name: 'chinooz-rider-active-delivery',
      storage: getStorage(),
      partialize: state => ({ activeDelivery: state.activeDelivery }),
    },
  ),
)

/** Convenience selector: true when there is an active (non-terminal) delivery. */
export function hasActiveDelivery(d: ActiveDelivery | null): boolean {
  return !!d && !TERMINAL.has(d.status)
}

/** Convenience selector: the next status the machine will move to, or null. */
export function nextDeliveryStatus(status: DeliveryStatus): DeliveryStatus | null {
  const idx = FLOW.indexOf(status)
  if (idx < 0 || idx >= FLOW.length - 1) return null
  return FLOW[idx + 1]
}

/** Ordered happy-path statuses (re-exported for UI steppers). */
export const DELIVERY_FLOW = FLOW

/** Terminal statuses (re-exported for UI). */
export const DELIVERY_TERMINAL = TERMINAL

/** Build an ActiveDelivery-shaped payload from RS3 legs + stops. */
export function buildActiveDelivery(opts: {
  jobId: string
  orderRef: string
  customerName: string
  pickup: RouteStop
  dropoff: RouteStop
  legToPickup: DeliveryLeg
  legToDropoff: DeliveryLeg
  payout: number
  isCod: boolean
  codAmount: number
}): ActiveDelivery {
  const now = Date.now()
  return {
    jobId: opts.jobId,
    orderRef: opts.orderRef,
    customerName: opts.customerName,
    pickup: opts.pickup,
    dropoff: opts.dropoff,
    legToPickup: opts.legToPickup,
    legToDropoff: opts.legToDropoff,
    payout: opts.payout,
    isCod: opts.isCod,
    codAmount: opts.codAmount,
    currency: 'NPR',
    status: 'assigned',
    legProgress: 0,
    currentPoint: opts.legToPickup.points[0],
    etaSeconds: opts.legToPickup.etaSeconds,
    distanceMeters: opts.legToPickup.distanceMeters,
    minimized: false,
    startedAt: now,
    updatedAt: now,
    pickupLabel: opts.pickup.label,
    dropoffLabel: opts.dropoff.label,
    etaDropoffMs: now + (opts.legToPickup.etaSeconds + opts.legToDropoff.etaSeconds) * 1000,
    acceptedAt: now,
  }
}
