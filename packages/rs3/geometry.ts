import type { DeliveryLeg, GeoPoint } from '@chinooz/types'

const EARTH_RADIUS_M = 6371000
const RADIANS = Math.PI / 180

function toRad(deg: number): number {
  return deg * RADIANS
}

/** Great-circle distance between two geo points, in meters. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_M * c
}

/** Total length of a leg along its polyline, in meters. */
export function legDistanceMeters(leg: DeliveryLeg): number {
  if (leg.points.length < 2) return 0
  let total = 0
  for (let i = 1; i < leg.points.length; i++) {
    total += haversineMeters(leg.points[i - 1], leg.points[i])
  }
  return total
}

/** Estimated time to traverse a leg, in seconds (a fixed rider speed). */
export function legEtaSeconds(distanceMeters: number, speedMps = 9): number {
  if (speedMps <= 0) return 0
  return Math.round(distanceMeters / speedMps)
}

/**
 * Linearly interpolate along a leg polyline by a normalized progress [0..1].
 * Returns the geo point at that progress and the remaining distance in meters.
 */
export function interpolateLeg(
  leg: DeliveryLeg,
  progress: number,
): { point: GeoPoint; remainingMeters: number } {
  const pts = leg.points
  if (pts.length === 0) return { point: { lat: 0, lng: 0 }, remainingMeters: 0 }
  if (pts.length === 1) return { point: pts[0], remainingMeters: 0 }

  const clamped = Math.min(Math.max(progress, 0), 1)
  const segCount = pts.length - 1
  const target = clamped * segCount
  const segIndex = Math.min(Math.floor(target), segCount - 1)
  const segT = target - segIndex

  const a = pts[segIndex]
  const b = pts[segIndex + 1]
  const point: GeoPoint = {
    lat: a.lat + (b.lat - a.lat) * segT,
    lng: a.lng + (b.lng - a.lng) * segT,
  }

  let remainingMeters = haversineMeters(point, pts[pts.length - 1])
  for (let i = segIndex + 1; i < pts.length - 1; i++) {
    remainingMeters += haversineMeters(pts[i], pts[i + 1])
  }

  return { point, remainingMeters }
}

/**
 * Sample a leg into N equally-spaced points (including endpoints).
 * Useful for drawing the route polyline.
 */
export function sampleLeg(leg: DeliveryLeg, samples = 24): GeoPoint[] {
  const pts = leg.points
  if (pts.length === 0) return []
  if (pts.length === 1) return [pts[0]]
  const out: GeoPoint[] = []
  for (let i = 0; i < samples; i++) {
    const progress = i / (samples - 1)
    out.push(interpolateLeg(leg, progress).point)
  }
  return out
}
