/**
 * Trip simulator + map boundary.
 *
 * A clean, swappable boundary that animates a rider marker along a route
 * (pickup → drop-off) with ETA/distance ticking. Pausable, reduced-motion
 * aware, and ready for a real maps SDK + dispatch provider to drop in
 * untouched — the interface is the contract.
 *
 * The simulator is framework-agnostic (no React). Screens subscribe via
 * `onTick` callbacks. A real maps SDK would replace the mock renderer but
 * keep the same `MapBoundary` interface.
 */

import type { GeoPoint, DeliveryLeg, ActiveDelivery, DeliveryStatus } from '@chinooz/types'
import { haversineMeters, etaSecondsFor } from './riderJobs'

// ---------------------------------------------------------------------------
// Map boundary interface (swappable for a real maps SDK)
// ---------------------------------------------------------------------------

export interface MapRoute {
  /** Ordered stops: [rider start, pickup, dropoff]. */
  stops: GeoPoint[]
  /** Full polyline (interpolated points across all legs). */
  polyline: GeoPoint[]
  /** Total route distance in meters. */
  distanceMeters: number
  /** Total route ETA in seconds. */
  etaSeconds: number
}

export interface RiderMarker {
  point: GeoPoint
  /** 0..1 progress along the active leg. */
  legProgress: number
  /** Remaining distance to the next stop, meters. */
  remainingMeters: number
  /** Remaining ETA to the next stop, seconds. */
  remainingSeconds: number
}

export interface MapState {
  route: MapRoute
  marker: RiderMarker
  /** Current status label for the map overlay. */
  status: DeliveryStatus
  isPaused: boolean
}

export interface MapBoundary {
  /** Current map state (route, marker, status, paused). */
  getState(): MapState
  /** Subscribe to tick updates (marker moves, ETA/distance tick). */
  onTick(cb: (state: MapState) => void): () => void
  /** Pause the simulation (battery/data conscious when backgrounded). */
  pause(): void
  /** Resume the simulation. */
  resume(): void
  /** Recenter the map on the rider marker. No-op in mock; real SDK pans. */
  recenter(): void
  /** Advance the status (called by updateDeliveryStatus). */
  setStatus(status: DeliveryStatus): void
  /** Tear down the simulator. */
  destroy(): void
}

// ---------------------------------------------------------------------------
// Trip engine
// ---------------------------------------------------------------------------

interface TripEngineOptions {
  /** Reduced-motion: if true, snaps the marker to the destination instantly. */
  reducedMotion?: boolean
  /** Tick interval in ms (default 1000 = 1s realtime). */
  tickMs?: number
  /** Speed multiplier for the simulation (1 = realtime, 10 = 10x faster). */
  speedMultiplier?: number
}

/**
 * Create a trip simulator for an active delivery. Animates the rider marker
 * along the route (rider → pickup → dropoff) with ETA/distance ticking.
 *
 * The engine is pausable (battery/data conscious) and reduced-motion aware
 * (snaps instead of animating). The returned `MapBoundary` is the stable
 * interface a real maps SDK would implement.
 */
export function createTripSimulator(
  delivery: ActiveDelivery,
  options: TripEngineOptions = {},
): MapBoundary {
  const reducedMotion = options.reducedMotion ?? false
  const tickMs = options.tickMs ?? 1000
  const speedMultiplier = options.speedMultiplier ?? 1

  // Build the full route: rider start → pickup → dropoff.
  const stops: GeoPoint[] = [
    delivery.currentPoint,
    delivery.pickup,
    delivery.dropoff,
  ]
  const polyline: GeoPoint[] = [
    ...delivery.legToPickup.points,
    ...delivery.legToDropoff.points,
  ]
  const distanceMeters =
    delivery.legToPickup.distanceMeters + delivery.legToDropoff.distanceMeters
  const etaSeconds =
    delivery.legToPickup.etaSeconds + delivery.legToDropoff.etaSeconds

  const route: MapRoute = { stops, polyline, distanceMeters, etaSeconds }

  // State
  let status: DeliveryStatus = delivery.status
  let isPaused = false
  let currentPoint: GeoPoint = delivery.currentPoint
  let legProgress = delivery.legProgress
  let remainingMeters = distanceMeters
  let remainingSeconds = etaSeconds
  let timer: ReturnType<typeof setInterval> | null = null
  const subscribers = new Set<(state: MapState) => void>()

  function emit(): void {
    const state: MapState = {
      route,
      marker: { point: currentPoint, legProgress, remainingMeters, remainingSeconds },
      status,
      isPaused,
    }
    for (const cb of subscribers) cb(state)
  }

  function tick(): void {
    if (isPaused) return

    if (reducedMotion) {
      // Reduced motion: snap to the final destination immediately.
      currentPoint = delivery.dropoff
      legProgress = 1
      remainingMeters = 0
      remainingSeconds = 0
      emit()
      stop()
      return
    }

    // Advance time by tickMs * speedMultiplier (simulated seconds).
    const advanceSeconds = (tickMs / 1000) * speedMultiplier
    remainingSeconds = Math.max(0, remainingSeconds - advanceSeconds)

    // Advance the marker proportionally along the polyline.
    const totalSeconds = route.etaSeconds
    const elapsedSeconds = totalSeconds - remainingSeconds
    const progress = Math.min(1, elapsedSeconds / totalSeconds)
    legProgress = progress

    // Interpolate position along the polyline.
    const idx = Math.min(
      polyline.length - 1,
      Math.floor(progress * (polyline.length - 1)),
    )
    currentPoint = polyline[idx]

    // Recompute remaining distance from the current point to the destination.
    remainingMeters = haversineMeters(currentPoint, delivery.dropoff)

    emit()

    if (remainingSeconds <= 0) {
      stop()
    }
  }

  function start(): void {
    if (timer) return
    timer = setInterval(tick, tickMs)
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  // Start unless reduced motion (which snaps on first tick).
  if (reducedMotion) {
    tick()
  } else {
    start()
  }

  return {
    getState(): MapState {
      return {
        route,
        marker: { point: currentPoint, legProgress, remainingMeters, remainingSeconds },
        status,
        isPaused,
      }
    },
    onTick(cb: (state: MapState) => void): () => void {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    pause(): void {
      isPaused = true
      stop()
      emit()
    },
    resume(): void {
      isPaused = false
      start()
      emit()
    },
    recenter(): void {
      // No-op in the mock renderer. A real maps SDK pans the camera here.
      emit()
    },
    setStatus(next: DeliveryStatus): void {
      status = next
      emit()
    },
    destroy(): void {
      stop()
      subscribers.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// Realtime dispatch stream boundary (swappable for a socket later)
// ---------------------------------------------------------------------------

export type DispatchEvent =
  | { kind: 'job_offer'; job: import('@chinooz/types').RiderJob }
  | { kind: 'status_push'; jobId: string; status: DeliveryStatus }
  | { kind: 'eta_update'; jobId: string; etaSeconds: number }

export interface DispatchStream {
  /** Subscribe to incoming dispatch events (job offers + status pushes). */
  onEvent(cb: (event: DispatchEvent) => void): () => void
  /** Start polling/listening. */
  start(): void
  /** Stop polling/listening (battery conscious when backgrounded). */
  stop(): void
  /** Whether the stream is currently active. */
  isActive(): boolean
}

/**
 * Create a mock dispatch stream that polls for job offers + status pushes.
 * This is the clean boundary a real WebSocket/SSE dispatcher would replace.
 *
 * Poll interval is configurable (default 8s). When reduced-motion or
 * backgrounded, the consumer calls `stop()` to save battery/data.
 */
export function createDispatchStream(
  options: { pollMs?: number; getJobs?: () => import('@chinooz/types').RiderJob[] } = {},
): DispatchStream {
  const pollMs = options.pollMs ?? 8000
  const getJobs = options.getJobs ?? (() => [])
  const subscribers = new Set<(event: DispatchEvent) => void>()
  let timer: ReturnType<typeof setInterval> | null = null
  let active = false
  let lastJobCount = 0

  function poll(): void {
    const jobs = getJobs()
    if (jobs.length > lastJobCount) {
      // New job(s) appeared — emit offers for the delta.
      for (let i = lastJobCount; i < jobs.length; i++) {
        const job = jobs[i]
        if (job) {
          for (const cb of subscribers) cb({ kind: 'job_offer', job })
        }
      }
    }
    lastJobCount = jobs.length
  }

  return {
    onEvent(cb: (event: DispatchEvent) => void): () => void {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    start(): void {
      if (active) return
      active = true
      timer = setInterval(poll, pollMs)
    },
    stop(): void {
      active = false
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
    isActive(): boolean {
      return active
    },
  }
}
