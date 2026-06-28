/**
 * Convert a mock-data `RiderJob` (RS3 entity with geo legs) into the local
 * `JobRequest` view model the Jobs shell renders. Keeps the AvailableTab
 * decoupled from the full RiderJob shape.
 */

import type { RiderJob, GeoPoint } from '@chinooz/types'
import type { JobRequest, VehicleHint } from './types'

/** Haversine distance in km between two lat/lng points. */
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}

/** Pick a vehicle hint from the trip distance (mock heuristic). */
function vehicleFor(tripKm: number): VehicleHint {
  if (tripKm <= 1.5) return 'cycle'
  if (tripKm <= 3.5) return 'scooter'
  return 'bike'
}

/**
 * Convert a RiderJob to a JobRequest. `riderLocation` is the rider's current
 * point so we can compute the pickup distance. `expiresInSeconds` gives every
 * available job a freshness window from now.
 */
export function riderJobToJobRequest(
  job: RiderJob,
  riderLocation: GeoPoint,
  opts: { expiresInSeconds?: number; zone?: string } = {},
): JobRequest {
  const pickupDistKm = haversineKm(riderLocation, job.pickup)
  const tripKm = Math.max(
    0.1,
    Math.round((job.legToDropoff.distanceMeters / 1000) * 10) / 10,
  )
  const etaSeconds = job.legToPickup.etaSeconds + job.legToDropoff.etaSeconds
  const itemCount = (job as unknown as { items?: unknown[] }).items?.length ?? 1
  const totalNpr = (job as unknown as { totalNpr?: number }).totalNpr
  const now = Date.now()

  return {
    id: job.id,
    orderRef: job.orderRef,
    pickupLabel: job.pickup.label,
    dropoffLabel: job.dropoff.label,
    pickupDistanceKm: pickupDistKm,
    tripDistanceKm: tripKm,
    payout: job.payout,
    etaDropoffMs: now + etaSeconds * 1000,
    codAmount: job.isCod ? job.codAmount : 0,
    itemSummary:
      itemCount === 1 ? '1 item' : `${itemCount} items`,
    itemCount,
    vehicle: vehicleFor(tripKm),
    expiresAtMs: opts.expiresInSeconds
      ? now + opts.expiresInSeconds * 1000
      : now + 180_000,
    zone: opts.zone ?? (job.dropoff as { area?: string }).area,
    totalNpr,
  }
}
