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

/**
 * RD3 — Rider-specific recommendations.
 *
 * A ranked list of suggested zones for THIS rider, balancing distance +
 * demand + surge. Each suggestion carries a concrete, actionable move
 * hint (distance + expected benefit) so the advice is decision-ready, not
 * nagging.
 *
 * Scoring: score = demand * 0.5 + surgeBoost * 25 - distance * 6
 *  - demand (0..100) is the primary driver.
 *  - surgeBoost (multiplier above 1, e.g. 0.5 for 1.5x) adds a bonus.
 *  - distance (km) penalizes far zones so a nearby high-demand zone wins
 *    over a distant very-high one.
 *  - the rider's current zone is excluded (it gets a reassurance state
 *    instead, via `isInHotspot`).
 */

export interface RiderRecommendation {
  zone: DemandZone
  /** Haversine km from the rider's current location to the zone centroid. */
  distanceKm: number
  /** Surge multiplier for this zone (1 if no surge). */
  surgeMultiplier: number
  /** Composite score (higher = better). */
  score: number
  /** Concrete, actionable move hint, e.g. "Move 1.2km to Jhamsikhel". */
  moveHint: string
  /** Expected benefit, e.g. "High demand, 1.5x surge, ~4 min pickups". */
  benefit: string
  /** Short human reason for the why-hint. */
  reason: string
}

/** Threshold (km) below which a zone is considered "where the rider is". */
const HERE_RADIUS_KM = 1.0

/**
 * Determine whether the rider is already in a good zone (a hotspot).
 * Returns the zone if the rider is within `HERE_RADIUS_KM` of a high/very-high
 * demand zone, else null. Used for the reassurance state.
 */
export function isInHotspot(
  zones: DemandZone[],
  riderLocation: GeoPoint,
): DemandZone | null {
  let nearest: DemandZone | null = null
  let nearestDist = Infinity
  for (const z of zones) {
    const d = distanceKm(riderLocation, z.center)
    if (d < nearestDist) {
      nearestDist = d
      nearest = z
    }
  }
  if (!nearest) return null
  if (nearestDist > HERE_RADIUS_KM) return null
  if (nearest.level !== 'high' && nearest.level !== 'very_high') return null
  return nearest
}

/**
 * Ranked rider recommendations. Excludes the rider's current zone (that gets
 * a reassurance state via `isInHotspot`). Returns `limit` suggestions,
 * best-first.
 */
export function getRiderRecommendations(
  zones: DemandZone[],
  surgeZones: SurgeZone[],
  riderLocation: GeoPoint,
  opts: { limit?: number; now?: number } = {},
): RiderRecommendation[] {
  const limit = opts.limit ?? 3
  const surgeByZone = new Map<string, number>()
  for (const s of surgeZones) surgeByZone.set(s.zoneId, s.multiplier)

  const scored = zones
    .filter(z => distanceKm(riderLocation, z.center) > HERE_RADIUS_KM)
    .map(z => {
      const dist = distanceKm(riderLocation, z.center)
      const surgeMult = surgeByZone.get(z.id) ?? 1
      const surgeBoost = Math.max(0, surgeMult - 1)
      const score = z.demand * 0.5 + surgeBoost * 25 - dist * 6
      const levelWord =
        z.level === 'very_high'
          ? 'very high demand'
          : z.level === 'high'
            ? 'high demand'
            : z.level === 'medium'
              ? 'steady demand'
              : 'low demand'
      const moveHint = `Move ${dist}km to ${z.name}`
      const surgeStr = surgeMult > 1 ? `, ${surgeMult}x surge` : ''
      const benefit = `${levelWord}${surgeStr}, ~${z.avgPickupEtaMin} min pickups, ${z.openRequests} open`
      const reason = z.whyHint
      return {
        zone: z,
        distanceKm: dist,
        surgeMultiplier: surgeMult,
        score,
        moveHint,
        benefit,
        reason,
      } satisfies RiderRecommendation
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}

/**
 * RD4 — Demand forecast / peak timeline.
 *
 * An hourly demand forecast for today (6am-11pm), with peak windows
 * highlighted (lunch + dinner) and surge windows tied to RI5 so the
 * timeline lines up with the Incentives hub.
 */

export interface ForecastHour {
  /** Hour of the day (24h), e.g. 12 = noon. */
  hour: number
  /** Display label, e.g. "12p". */
  label: string
  /** Expected demand 0..100 for this hour. */
  demand: number
  /** Whether this hour falls in a peak window. */
  isPeak: boolean
  /** Peak window label if this hour is in a peak, e.g. "Lunch". */
  peakLabel?: string
  /** Surge multiplier for this hour (1 = no surge). Tied to RI5. */
  surgeMultiplier: number
  /** Whether a surge window is scheduled for this hour. */
  hasScheduledSurge: boolean
}

export interface DemandForecast {
  /** Hourly bars, 6am to 11pm (18 hours). */
  hours: ForecastHour[]
  /** Peak windows for the day. */
  peaks: { label: string; startHour: number; endHour: number }[]
  /** The next peak hour after `now`, or null if no more peaks today. */
  nextPeak: { label: string; hour: number; minutesUntil: number } | null
  /** RI5 surge tie-in: the headline surge multiplier + zone. */
  surge: { multiplier: number; zoneLabel: string; minutesLeft: number }
  /** Plan-your-day hint. */
  planHint: string
}

/** Hour label for the chart axis (tabular figures). */
function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

/**
 * The demand curve for a typical weekday in Kathmandu Valley.
 * Two peaks: lunch (11am-2pm) and dinner (5pm-9pm).
 * Values are 0..100 and deterministic so the chart is stable.
 */
const HOURLY_DEMAND: number[] = [
  8,  // 6a
  12, // 7a
  22, // 8a
  35, // 9a
  48, // 10a
  68, // 11a — lunch ramp
  85, // 12p — lunch peak
  78, // 1p
  52, // 2p
  38, // 3p
  42, // 4p
  72, // 5p — dinner ramp
  88, // 6p — dinner peak
  92, // 7p — dinner peak (highest)
  80, // 8p
  55, // 9p
  30, // 10p
  15, // 11p
]

const PEAK_WINDOWS = [
  { label: 'Lunch', startHour: 11, endHour: 14 },
  { label: 'Dinner', startHour: 17, endHour: 21 },
]

/**
 * Get the demand forecast for today. Ties surge windows to RI5 so the
 * timeline lines up with the Incentives hub.
 *
 * @param opts.now - override for deterministic testing
 */
export function getDemandForecast(opts: { now?: number } = {}): DemandForecast {
  const now = opts.now ?? Date.now()
  const nowDate = new Date(now)
  const currentHour = nowDate.getHours()
  const currentMin = nowDate.getMinutes()
  const ri5 = getIncentiveSurge()

  // Surge hours: dinner peak aligns with the RI5 surge window.
  // The headline surge zone (Thamel) surges during 5pm-9pm.
  const surgeHours = new Set<number>()
  for (let h = 17; h <= 21; h++) surgeHours.add(h)
  // Lunch surge is lighter — only 12pm-1pm.
  surgeHours.add(12)
  surgeHours.add(13)

  const hours: ForecastHour[] = []
  for (let i = 0; i < HOURLY_DEMAND.length; i++) {
    const hour = 6 + i
    const demand = HOURLY_DEMAND[i]
    const peak = PEAK_WINDOWS.find(p => hour >= p.startHour && hour < p.endHour)
    const hasSurge = surgeHours.has(hour)
    // Surge multiplier: dinner hours get the RI5 headline multiplier,
    // lunch hours get a lighter 1.2x.
    const surgeMultiplier = hasSurge
      ? hour >= 17
        ? ri5.multiplier
        : 1.2
      : 1

    hours.push({
      hour,
      label: hourLabel(hour),
      demand,
      isPeak: !!peak,
      peakLabel: peak?.label,
      surgeMultiplier,
      hasScheduledSurge: hasSurge,
    })
  }

  // Next peak: the first peak hour after the current time.
  let nextPeak: DemandForecast['nextPeak'] = null
  for (const p of PEAK_WINDOWS) {
    if (currentHour < p.endHour) {
      const peakHour = Math.max(p.startHour, currentHour)
      const minutesUntil =
        (peakHour - currentHour) * 60 - currentMin
      if (minutesUntil > 0 || (currentHour >= p.startHour && currentHour < p.endHour)) {
        nextPeak = {
          label: p.label,
          hour: peakHour,
          minutesUntil: Math.max(0, minutesUntil),
        }
        break
      }
    }
  }

  // Plan-your-day hint.
  const planHint = nextPeak
    ? nextPeak.minutesUntil <= 30
      ? `Peak ${nextPeak.label} starting soon — head toward high-demand zones.`
      : `Next peak ${nextPeak.label} in ${Math.round(nextPeak.minutesUntil / 60)}h ${nextPeak.minutesUntil % 60}m. Plan your breaks before then.`
    : 'No more peaks today — steady evening demand until close.'

  return {
    hours,
    peaks: PEAK_WINDOWS,
    nextPeak,
    surge: {
      multiplier: ri5.multiplier,
      zoneLabel: ri5.zoneLabel,
      minutesLeft: ri5.minutesLeft,
    },
    planHint,
  }
}
