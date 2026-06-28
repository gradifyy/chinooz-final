/**
 * Unified rider mock API.
 *
 * Promise-based with per-call latency + error simulation knobs. Every write
 * mutation is idempotent via an operation ref so retries never double-count,
 * double-pay, or double-claim. Delivery status changes propagate to the
 * shared `orders` fixture so buyer order tracking (O4) + seller Order
 * Management see the same updates.
 *
 * Boundaries are swappable for Supabase + a real dispatch provider: the
 * function signatures here are the contract a real backend would implement.
 */

import type {
  RiderJob,
  ActiveDelivery,
  DeliveryStatus,
  OrderStatus,
  Order,
} from '@chinooz/types'
import { orders } from './fixtures'
import {
  riderJobs,
  getAvailableJobsSync,
  getJobByIdSync,
  removeJobFromPool,
  totalJobDistance,
  totalJobEta,
} from './riderJobs'
import { getRiderProfile, type RiderProfileHub } from './riderProfile'
import {
  getRiderEarnings,
  type RiderEarningsOverview,
} from './riderEarnings'
import { getCODWallet, type CODWalletSnapshot } from './riderEarnings'
import { getIncentives, type RiderIncentives } from './riderIncentives'
import {
  getDemandZones,
  getSurgeZones,
  getDemandForecast,
  getRiderRecommendations,
  type DemandZone,
  type SurgeZone,
  type DemandForecast,
  type RiderRecommendation,
  type GeoPoint,
} from './riderDemand'

// ---------------------------------------------------------------------------
// Latency + error simulation knobs
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 200, max = 600): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

/**
 * Simulate an error rate. Pass a fraction 0..1. In dev/mock we keep a low
 * default so the happy path is exercisable, but every call honours it so
 * error/loading states can be tested.
 */
const DEFAULT_ERROR_RATE = 0.05

function maybeThrow(errorRate = DEFAULT_ERROR_RATE): void {
  if (Math.random() < errorRate) {
    throw new Error('Mock network error — please retry')
  }
}

export interface ApiError extends Error {
  code: 'network' | 'not_found' | 'conflict' | 'validation' | 'offline'
}

function apiError(code: ApiError['code'], message: string): ApiError {
  const e = new Error(message) as ApiError
  e.code = code
  return e
}

// ---------------------------------------------------------------------------
// Idempotency — operation refs prevent double-count/double-pay/double-claim
// ---------------------------------------------------------------------------

interface IdempotentOp {
  ref: string
  kind: 'accept' | 'decline' | 'status' | 'collect_cod' | 'deposit' | 'withdraw' | 'claim_quest'
  targetId: string
  result: unknown
  completedAt: number
}

const idempotencyLog: Map<string, IdempotentOp> = new Map()

/**
 * Run an idempotent operation. If `ref` was already completed for the same
 * `targetId`, return the cached result instead of re-executing. This is the
 * pattern screens use for optimistic updates + retries.
 */
async function runIdempotent<T>(
  ref: string,
  kind: IdempotentOp['kind'],
  targetId: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const existing = idempotencyLog.get(ref)
  if (existing && existing.kind === kind && existing.targetId === targetId) {
    return existing.result as T
  }
  const result = await fn()
  idempotencyLog.set(ref, {
    ref,
    kind,
    targetId,
    result,
    completedAt: Date.now(),
  })
  return result
}

/** Clear the idempotency log (test/dev only). */
export function __resetIdempotency(): void {
  idempotencyLog.clear()
}

// ---------------------------------------------------------------------------
// Shared order-store propagation
// ---------------------------------------------------------------------------

/**
 * Map a rider DeliveryStatus to a buyer OrderStatus so the buyer order
 * tracking (O4) + seller Order Management stay in sync with the rider.
 */
export function deliveryStatusToOrderStatus(
  delivery: DeliveryStatus,
): OrderStatus {
  switch (delivery) {
    case 'assigned':
    case 'heading_to_pickup':
      return 'confirmed'
    case 'at_pickup':
    case 'picked_up':
      return 'processing'
    case 'in_transit':
    case 'at_dropoff':
      return 'shipped'
    case 'delivered':
      return 'delivered'
    case 'cancelled':
      return 'cancelled'
    case 'failed':
      return 'cancelled'
    default:
      return 'confirmed'
  }
}

/**
 * Propagate a delivery status change to the shared `orders` fixture so buyer
 * + seller screens that read from the same mock store see the update.
 * Returns the matched order (or null) for the caller to surface.
 */
function propagateToOrderStore(
  orderRef: string,
  delivery: DeliveryStatus,
  note?: string,
): Order | null {
  const order = orders.find(o => o.id === orderRef || `ORD-${o.id}` === orderRef)
  if (!order) return null
  const nextStatus = deliveryStatusToOrderStatus(delivery)
  // Only push a timeline entry when the status actually advances.
  if (order.status !== nextStatus) {
    order.status = nextStatus
    order.timeline.push({
      status: nextStatus,
      timestamp: new Date().toISOString(),
      note: note ?? `Rider update: ${delivery}`,
    })
  }
  return order
}

// ---------------------------------------------------------------------------
// Active delivery store (in-memory, single active job)
// ---------------------------------------------------------------------------

let activeDelivery: ActiveDelivery | null = null

/** Internal: build an ActiveDelivery from a RiderJob. */
function toActiveDelivery(job: RiderJob): ActiveDelivery {
  const now = Date.now()
  const eta = totalJobEta(job)
  return {
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
    status: 'assigned',
    legProgress: 0,
    currentPoint: job.legToPickup.points[0],
    etaSeconds: eta,
    distanceMeters: totalJobDistance(job),
    minimized: false,
    startedAt: now,
    updatedAt: now,
    pickupLabel: job.pickup.label,
    dropoffLabel: job.dropoff.label,
    acceptedAt: now,
    etaDropoffMs: now + eta * 1000,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Rider online status (mock — persisted via Zustand in the app). */
export async function setOnlineStatus(
  status: 'online' | 'offline' | 'paused',
): Promise<{ status: string }> {
  await randomDelay(120, 300)
  maybeThrow(0.02)
  return { status }
}

/** Available delivery jobs near the rider. */
export async function getAvailableJobs(limit?: number): Promise<RiderJob[]> {
  await randomDelay(250, 600)
  maybeThrow()
  return getAvailableJobsSync(limit)
}

/** Get a single job by id. */
export async function getJobById(jobId: string): Promise<RiderJob | null> {
  await randomDelay(150, 350)
  maybeThrow()
  return getJobByIdSync(jobId) ?? null
}

/** Accept a job. Idempotent via `opRef`. Removes from the pool + sets active. */
export async function acceptJob(
  jobId: string,
  opRef: string,
): Promise<{ success: boolean; activeDelivery: ActiveDelivery | null; error?: string }> {
  return runIdempotent(
    opRef,
    'accept',
    jobId,
    async () => {
      await randomDelay(300, 700)
      maybeThrow(0.04)
      const job = getJobByIdSync(jobId)
      if (!job) return { success: false, activeDelivery: null, error: 'Job not found' }
      if (activeDelivery) {
        return { success: false, activeDelivery: null, error: 'A delivery is already active' }
      }
      removeJobFromPool(jobId)
      activeDelivery = toActiveDelivery(job)
      propagateToOrderStore(job.orderRef, 'assigned', 'Rider accepted job')
      return { success: true, activeDelivery }
    },
  )
}

/** Decline a job. Idempotent via `opRef`. Removes from the pool. */
export async function declineJob(
  jobId: string,
  opRef: string,
): Promise<{ success: boolean; error?: string }> {
  return runIdempotent(
    opRef,
    'decline',
    jobId,
    async () => {
      await randomDelay(200, 400)
      maybeThrow(0.03)
      const job = getJobByIdSync(jobId)
      if (!job) return { success: false, error: 'Job not found' }
      removeJobFromPool(jobId)
      return { success: true }
    },
  )
}

/**
 * Advance the active delivery's status. Idempotent via `opRef`. Propagates
 * to the shared order store so buyer/seller tracking updates.
 */
export async function updateDeliveryStatus(
  jobId: string,
  next: DeliveryStatus,
  opRef: string,
): Promise<{ success: boolean; activeDelivery: ActiveDelivery | null; error?: string }> {
  return runIdempotent(
    opRef,
    'status',
    `${jobId}:${next}`,
    async () => {
      await randomDelay(300, 600)
      maybeThrow(0.04)
      if (!activeDelivery || activeDelivery.jobId !== jobId) {
        return { success: false, activeDelivery: null, error: 'No active delivery for this job' }
      }
      activeDelivery = { ...activeDelivery, status: next, updatedAt: Date.now() }
      propagateToOrderStore(activeDelivery.orderRef, next)
      if (next === 'delivered' || next === 'cancelled' || next === 'failed') {
        const final = activeDelivery
        activeDelivery = null
        return { success: true, activeDelivery: final }
      }
      return { success: true, activeDelivery }
    },
  )
}

/** Submit proof of delivery (photo/OTP). Idempotent via `opRef`. */
export async function submitProofOfDelivery(
  jobId: string,
  proof: { type: 'photo' | 'otp' | 'signature'; value: string },
  opRef: string,
): Promise<{ success: boolean; error?: string }> {
  return runIdempotent(
    opRef,
    'status',
    `${jobId}:pod`,
    async () => {
      await randomDelay(400, 800)
      maybeThrow(0.05)
      if (!activeDelivery || activeDelivery.jobId !== jobId) {
        return { success: false, error: 'No active delivery for this job' }
      }
      void proof
      return { success: true }
    },
  )
}

/** Collect COD cash for a delivery. Idempotent via `opRef`. Integer-paisa safe. */
export async function collectCOD(
  jobId: string,
  amountNpr: number,
  opRef: string,
): Promise<{ success: boolean; collectedNpr: number; error?: string }> {
  return runIdempotent(
    opRef,
    'collect_cod',
    jobId,
    async () => {
      await randomDelay(300, 600)
      maybeThrow(0.04)
      void jobId
      return { success: true, collectedNpr: Math.round(amountNpr) }
    },
  )
}

/** Get the active delivery (realtime-fresh). */
export async function getActiveDelivery(): Promise<ActiveDelivery | null> {
  await randomDelay(100, 250)
  return activeDelivery
}

/** Get rider earnings overview. */
export async function getRiderEarningsApi(): Promise<RiderEarningsOverview> {
  return getRiderEarnings()
}

/** Get the COD wallet snapshot. */
export async function getCODWalletApi(): Promise<CODWalletSnapshot> {
  return getCODWallet()
}

/** Deposit cash back to Chinooz. Idempotent + integer-paisa safe. */
export async function depositCash(
  amountNpr: number,
  opRef: string,
): Promise<{ success: boolean; depositedNpr: number; error?: string }> {
  return runIdempotent(
    opRef,
    'deposit',
    `deposit-${opRef}`,
    async () => {
      await randomDelay(400, 800)
      maybeThrow(0.05)
      return { success: true, depositedNpr: Math.round(amountNpr) }
    },
  )
}

/** Request a withdrawal of earnings. Idempotent + integer-paisa safe. */
export async function requestWithdrawal(
  amountNpr: number,
  destination: 'esewa' | 'khalti' | 'bank',
  opRef: string,
): Promise<{ success: boolean; withdrawnNpr: number; error?: string }> {
  return runIdempotent(
    opRef,
    'withdraw',
    `withdraw-${opRef}`,
    async () => {
      await randomDelay(500, 1000)
      maybeThrow(0.05)
      void destination
      return { success: true, withdrawnNpr: Math.round(amountNpr) }
    },
  )
}

/** Get incentives/quests. */
export async function getIncentivesApi(): Promise<RiderIncentives> {
  return getIncentives()
}

/** Claim a quest reward. Idempotent via `opRef`. */
export async function claimQuest(
  questId: string,
  opRef: string,
): Promise<{ success: boolean; rewardNpr: number; error?: string }> {
  return runIdempotent(
    opRef,
    'claim_quest',
    questId,
    async () => {
      await randomDelay(300, 600)
      maybeThrow(0.04)
      void questId
      return { success: true, rewardNpr: 150 }
    },
  )
}

/** Get demand zones (heat map). */
export async function getDemandZonesApi(): Promise<DemandZone[]> {
  await randomDelay(200, 400)
  maybeThrow()
  return getDemandZones()
}

/** Get surge zones overlay. */
export async function getSurgeZonesApi(): Promise<SurgeZone[]> {
  await randomDelay(200, 400)
  maybeThrow()
  return getSurgeZones()
}

/** Get rider profile (re-exported for the unified API surface). */
export async function getRiderProfileApi(): Promise<RiderProfileHub> {
  return getRiderProfile()
}

/** Get the hourly demand forecast / peak timeline. */
export async function getDemandForecastApi(): Promise<DemandForecast> {
  await randomDelay(200, 400)
  maybeThrow()
  return getDemandForecast()
}

/** Get zone detail (a single zone + its surge + recommendations). */
export async function getZoneDetailApi(
  zoneId: string,
  riderLocation: GeoPoint,
): Promise<{
  zone: DemandZone | null
  surge: SurgeZone | null
  recommendations: RiderRecommendation[]
}> {
  await randomDelay(150, 300)
  maybeThrow(0.03)
  const allZones = getDemandZones()
  const zone = allZones.find(z => z.id === zoneId) ?? null
  const surge = getSurgeZones().find(s => s.zoneId === zoneId) ?? null
  const recommendations = getRiderRecommendations(
    allZones,
    getSurgeZones(),
    riderLocation,
    { limit: 3 },
  )
  return { zone, surge, recommendations }
}
