import type { GeoPoint, MapBoundary } from '@chinooz/types'

/**
 * RS3 map simulator boundary.
 *
 * A bounding box that encloses the Kathmandu Valley polygon used elsewhere in
 * the rider app (the `VALLEY_BOUNDARY` from @chinooz/mock-data/riderDemand).
 * All simulated rider movement stays inside this box. Kept as a separate
 * rectangular type so the simulator can do fast contain/project math without
 * touching polygon geometry.
 */
export const RS3_BOUNDARY: MapBoundary = {
  id: 'rs3-kathmandu-valley',
  label: 'Kathmandu Valley (RS3)',
  // Encloses the VALLEY_BOUNDARY polygon extents
  // (lat 27.515..27.745, lng 85.135..85.42) with a small margin.
  minLat: 27.51,
  maxLat: 27.755,
  minLng: 85.12,
  maxLng: 85.435,
}

/**
 * Rider's current location (mock) — Baneshwor area.
 * Mirrors `RIDER_LOCATION` in @chinooz/mock-data/riderDemand so the simulator
 * and the demand heatmap share the same starting point.
 */
export const KATHMANDU_CENTER: GeoPoint = { lat: 27.6915, lng: 85.3425 }
export const RIDER_START: GeoPoint = KATHMANDU_CENTER

/** True when a point is inside the RS3 boundary. */
export function rs3Contains(point: GeoPoint): boolean {
  return (
    point.lat >= RS3_BOUNDARY.minLat &&
    point.lat <= RS3_BOUNDARY.maxLat &&
    point.lng >= RS3_BOUNDARY.minLng &&
    point.lng <= RS3_BOUNDARY.maxLng
  )
}

/**
 * Project a geo point to normalized [0..1] coordinates within the RS3 boundary,
 * suitable for rendering on a full-screen map view. (0,0) is the SW corner.
 */
export function rs3Project(point: GeoPoint): { x: number; y: number } {
  const x = (point.lng - RS3_BOUNDARY.minLng) / (RS3_BOUNDARY.maxLng - RS3_BOUNDARY.minLng)
  const y = (RS3_BOUNDARY.maxLat - point.lat) / (RS3_BOUNDARY.maxLat - RS3_BOUNDARY.minLat)
  return { x, y }
}

/** Inverse of {@link rs3Project}. */
export function rs3Unproject(x: number, y: number): GeoPoint {
  const lat = RS3_BOUNDARY.maxLat - y * (RS3_BOUNDARY.maxLat - RS3_BOUNDARY.minLat)
  const lng = RS3_BOUNDARY.minLng + x * (RS3_BOUNDARY.maxLng - RS3_BOUNDARY.minLng)
  return { lat, lng }
}

/** Clamp a point to the RS3 boundary. */
export function rs3Clamp(point: GeoPoint): GeoPoint {
  return {
    lat: Math.min(Math.max(point.lat, RS3_BOUNDARY.minLat), RS3_BOUNDARY.maxLat),
    lng: Math.min(Math.max(point.lng, RS3_BOUNDARY.minLng), RS3_BOUNDARY.maxLng),
  }
}
