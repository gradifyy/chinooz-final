/**
 * RS3 / RD1 — rider demand + hotspot mock data.
 *
 * Shared across the rider-mobile app:
 * - VALLEY_BOUNDARY  : the Kathmandu Valley map boundary (RS3) reused by the
 *                      heatmap and the zone mini-map.
 * - getDemandZones() : demand intensity per valley zone, with polygon + label.
 * - getSurgeZones()  : surge multiplier overlay. Shares RI5 surge data — the
 *                      headline surge zone (Thamel) mirrors the RiderSurge
 *                      value from riderIncentives so the heatmap toggle and
 *                      the Incentives hub report the same multiplier.
 *
 * Coordinates are approximate lat/lng for Kathmandu Valley and are stable so
 * the rendered map is deterministic across reloads. No external map tiles are
 * fetched — the heatmap is rendered with react-native-svg to stay light on
 * battery and data.
 */

import { getIncentiveSurge } from './riderIncentives'

export interface GeoPoint {
  lat: number
  lng: number
}

export type DemandLevel = 'low' | 'medium' | 'high' | 'very_high'

export interface DemandZone {
  id: string
  name: string
  /** Polygon outline in lat/lng. */
  polygon: GeoPoint[]
  /** Centroid used for labels + the ranked fallback list. */
  center: GeoPoint
  /** 0..100 demand score (mock). */
  demand: number
  level: DemandLevel
  /** Active delivery requests in this zone (mock). */
  openRequests: number
  /** Avg. ETA to first pickup from the rider's current location (minutes). */
  avgPickupEtaMin: number
  /** Estimated earnings boost vs. baseline (1 = no boost). */
  earningsBoost: number
  /** Short "why" hint explaining the demand driver (e.g. "dinner peak"). */
  whyHint: string
  /** Best-time-of-day note for the zone (e.g. "5pm-8pm peak"). */
  bestTime: string
}

export interface SurgeZone {
  id: string
  /** References a DemandZone id. */
  zoneId: string
  /** Surge multiplier, e.g. 1.4 = +40% on delivery fee. */
  multiplier: number
  /** Epoch ms when the surge window ends. */
  endsAt: number
  /** Polygon (same as the parent zone) so the overlay can render directly. */
  polygon: GeoPoint[]
}

/**
 * RS3 — Kathmandu Valley boundary. A coarse outer ring covering
 * Kathmandu, Lalitpur, and Bhaktapur. Used as the map clip + camera frame.
 */
export const VALLEY_BOUNDARY: GeoPoint[] = [
  { lat: 27.732, lng: 85.215 },
  { lat: 27.745, lng: 85.345 },
  { lat: 27.712, lng: 85.42 },
  { lat: 27.665, lng: 85.43 },
  { lat: 27.6, lng: 85.39 },
  { lat: 27.545, lng: 85.34 },
  { lat: 27.515, lng: 85.27 },
  { lat: 27.525, lng: 85.18 },
  { lat: 27.58, lng: 85.135 },
  { lat: 27.65, lng: 85.135 },
  { lat: 27.71, lng: 85.165 },
]

/** Rider's current location (mock) — Baneshwor area. */
export const RIDER_LOCATION: GeoPoint = { lat: 27.6915, lng: 85.3425 }

const ZONE_SEED: Array<{
  id: string
  name: string
  polygon: GeoPoint[]
  center: GeoPoint
  demand: number
  openRequests: number
  avgPickupEtaMin: number
  earningsBoost: number
  whyHint: string
  bestTime: string
}> = [
  {
    id: 'zone-thamel',
    name: 'Thamel',
    polygon: [
      { lat: 27.718, lng: 85.31 },
      { lat: 27.724, lng: 85.315 },
      { lat: 27.716, lng: 85.325 },
      { lat: 27.71, lng: 85.318 },
    ],
    center: { lat: 27.7165, lng: 85.318 },
    demand: 92,
    openRequests: 18,
    avgPickupEtaMin: 4,
    earningsBoost: 1.35,
    whyHint: 'Tourist rush — restaurants and hotels ordering in.',
    bestTime: '5pm-9pm dinner peak',
  },
  {
    id: 'zone-new-baneshwor',
    name: 'New Baneshwor',
    polygon: [
      { lat: 27.688, lng: 85.332 },
      { lat: 27.698, lng: 85.34 },
      { lat: 27.692, lng: 85.352 },
      { lat: 27.682, lng: 85.345 },
    ],
    center: { lat: 27.6905, lng: 85.342 },
    demand: 84,
    openRequests: 14,
    avgPickupEtaMin: 3,
    earningsBoost: 1.3,
    whyHint: 'Office crowd — lunch and evening deliveries.',
    bestTime: '12pm-2pm, 6pm-8pm',
  },
  {
    id: 'zone-lalitpur',
    name: 'Lalitpur (Patan)',
    polygon: [
      { lat: 27.672, lng: 85.318 },
      { lat: 27.682, lng: 85.33 },
      { lat: 27.67, lng: 85.34 },
      { lat: 27.66, lng: 85.328 },
    ],
    center: { lat: 27.6715, lng: 85.329 },
    demand: 68,
    openRequests: 9,
    avgPickupEtaMin: 7,
    earningsBoost: 1.15,
    whyHint: 'Residential — steady grocery and food orders.',
    bestTime: '6pm-9pm evening',
  },
  {
    id: 'zone-koteshwor',
    name: 'Koteshwor',
    polygon: [
      { lat: 27.678, lng: 85.35 },
      { lat: 27.688, lng: 85.36 },
      { lat: 27.68, lng: 85.372 },
      { lat: 27.67, lng: 85.362 },
    ],
    center: { lat: 27.679, lng: 85.361 },
    demand: 76,
    openRequests: 11,
    avgPickupEtaMin: 5,
    earningsBoost: 1.25,
    whyHint: 'Junction traffic — quick pickups from nearby shops.',
    bestTime: '5pm-8pm peak',
  },
  {
    id: 'zone-bhaktapur',
    name: 'Bhaktapur',
    polygon: [
      { lat: 27.67, lng: 85.395 },
      { lat: 27.682, lng: 85.41 },
      { lat: 27.664, lng: 85.42 },
      { lat: 27.655, lng: 85.405 },
    ],
    center: { lat: 27.668, lng: 85.407 },
    demand: 41,
    openRequests: 4,
    avgPickupEtaMin: 12,
    earningsBoost: 1.05,
    whyHint: 'Heritage area — weekend tourists and cafes.',
    bestTime: 'Sat-Sun afternoon',
  },
  {
    id: 'zone-boudha',
    name: 'Boudha',
    polygon: [
      { lat: 27.715, lng: 85.352 },
      { lat: 27.724, lng: 85.362 },
      { lat: 27.712, lng: 85.372 },
      { lat: 27.704, lng: 85.36 },
    ],
    center: { lat: 27.714, lng: 85.362 },
    demand: 58,
    openRequests: 7,
    avgPickupEtaMin: 6,
    earningsBoost: 1.1,
    whyHint: 'Monastery area — visitor and local food orders.',
    bestTime: '6pm-9pm evening',
  },
  {
    id: 'zone-kirtipur',
    name: 'Kirtipur',
    polygon: [
      { lat: 27.678, lng: 85.278 },
      { lat: 27.69, lng: 85.29 },
      { lat: 27.672, lng: 85.3 },
      { lat: 27.662, lng: 85.288 },
    ],
    center: { lat: 27.676, lng: 85.289 },
    demand: 27,
    openRequests: 2,
    avgPickupEtaMin: 15,
    earningsBoost: 1.0,
    whyHint: 'Quiet hill town — low but steady orders.',
    bestTime: 'Midday steady',
  },
  {
    id: 'zone-chabahil',
    name: 'Chabahil',
    polygon: [
      { lat: 27.708, lng: 85.332 },
      { lat: 27.716, lng: 85.342 },
      { lat: 27.704, lng: 85.35 },
      { lat: 27.698, lng: 85.338 },
    ],
    center: { lat: 27.7065, lng: 85.3405 },
    demand: 53,
    openRequests: 6,
    avgPickupEtaMin: 6,
    earningsBoost: 1.08,
    whyHint: 'Temple area — local shops and pharma orders.',
    bestTime: 'Morning + evening',
  },
  {
    id: 'zone-maharajgunj',
    name: 'Maharajgunj',
    polygon: [
      { lat: 27.735, lng: 85.328 },
      { lat: 27.745, lng: 85.34 },
      { lat: 27.732, lng: 85.352 },
      { lat: 27.722, lng: 85.34 },
    ],
    center: { lat: 27.7335, lng: 85.34 },
    demand: 49,
    openRequests: 5,
    avgPickupEtaMin: 8,
    earningsBoost: 1.07,
    whyHint: 'Hospital and college area — food + pharma.',
    bestTime: '11am-2pm lunch',
  },
  {
    id: 'zone-kalanki',
    name: 'Kalanki',
    polygon: [
      { lat: 27.692, lng: 85.28 },
      { lat: 27.702, lng: 85.292 },
      { lat: 27.69, lng: 85.305 },
      { lat: 27.68, lng: 85.292 },
    ],
    center: { lat: 27.691, lng: 85.292 },
    demand: 35,
    openRequests: 3,
    avgPickupEtaMin: 11,
    earningsBoost: 1.04,
    whyHint: 'Highway entry — warehouse and bulk orders.',
    bestTime: 'Morning deliveries',
  },
]

function levelFor(demand: number): DemandLevel {
  if (demand >= 80) return 'very_high'
  if (demand >= 60) return 'high'
  if (demand >= 40) return 'medium'
  return 'low'
}

/** Haversine distance in km between two lat/lng points. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
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

/**
 * Mock getter for demand zones. Returns zones ranked by demand (highest first)
 * so the fallback ranked list and the map share the same ordering.
 *
 * Pass `now` to keep surge windows stable within a session.
 */
export function getDemandZones(_opts: { now?: number } = {}): DemandZone[] {
  return ZONE_SEED.map(z => ({
    id: z.id,
    name: z.name,
    polygon: z.polygon,
    center: z.center,
    demand: z.demand,
    level: levelFor(z.demand),
    openRequests: z.openRequests,
    avgPickupEtaMin: z.avgPickupEtaMin,
    earningsBoost: z.earningsBoost,
    whyHint: z.whyHint,
    bestTime: z.bestTime,
  })).sort((a, b) => b.demand - a.demand)
}

/**
 * RI5 — surge overlay. Shares the demand zone polygons so the toggle can
 * render on top of the same heatmap without a second geometry pass.
 *
 * The headline surge zone mirrors `RiderSurge` from riderIncentives so the
 * heatmap toggle and the Incentives hub (RI5) report the same multiplier.
 */
export function getSurgeZones(opts: { now?: number } = {}): SurgeZone[] {
  const now = opts.now ?? Date.now()
  const ri5 = getIncentiveSurge()
  // Only zones with demand >= 60 are surging in the mock.
  const surging = ZONE_SEED.filter(z => z.demand >= 60)
  return surging.map(z => {
    // The RI5 headline zone (Thamel) uses the shared surge multiplier +
    // minutesLeft so the toggle and the Incentives hub stay in sync.
    const isHeadline = z.name === ri5.zoneLabel
    const multiplier = isHeadline
      ? ri5.multiplier
      : Math.round((z.earningsBoost + 0.1) * 10) / 10
    const windowMin = isHeadline ? ri5.minutesLeft : 30 + Math.round((z.demand % 6) * 10)
    return {
      id: `surge-${z.id}`,
      zoneId: z.id,
      multiplier,
      endsAt: now + windowMin * 60_000,
      polygon: z.polygon,
    }
  })
}

/** Recommend the top N zones by demand, with a short human reason. */
export function getZoneRecommendations(
  zones: DemandZone[],
  opts: { riderLocation?: GeoPoint; limit?: number } = {},
): Array<{ zone: DemandZone; reason: string }> {
  const limit = opts.limit ?? 3
  return zones.slice(0, limit).map(zone => {
    const reason =
      zone.demand >= 80
        ? `Very high demand — ${zone.openRequests} open requests, ${zone.avgPickupEtaMin} min pickup.`
        : zone.demand >= 60
          ? `High demand nearby — ${zone.openRequests} open requests.`
          : `Steady demand — ${zone.openRequests} open requests.`
    return { zone, reason }
  })
}
