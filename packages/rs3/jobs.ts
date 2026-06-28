import type { DeliveryLeg, GeoPoint, RiderJob, RouteStop } from '@chinooz/types'
import { RS3_BOUNDARY, rs3Clamp, RIDER_START } from './boundary'
import { haversineMeters, legDistanceMeters, legEtaSeconds } from './geometry'
import { RS3_DRIVER_SPEED_MPS } from './tripSimulator'

/** Lerp between two geo points. */
function lerp(a: GeoPoint, b: GeoPoint, t: number): GeoPoint {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

/**
 * Build a leg polyline from `from` to `to` by subdividing into `segments`
 * equal pieces. Mid-segment points get a tiny deterministic jitter so the route
 * looks like a real road instead of a straight diagonal. All points are clamped
 * to the RS3 boundary.
 */
export function buildLeg(from: GeoPoint, to: GeoPoint, segments = 8): DeliveryLeg {
  const points: GeoPoint[] = [from]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const base = lerp(from, to, t)
    // Deterministic "road" jitter inside the RS3 box (no RNG so jobs are stable).
    const jLat = Math.sin(t * 12.9898) * 0.00045
    const jLng = Math.cos(t * 78.233) * 0.00045
    points.push(rs3Clamp({ lat: base.lat + jLat, lng: base.lng + jLng }))
  }
  points.push(rs3Clamp(to))
  const distanceMeters = legDistanceMeters({ points, distanceMeters: 0, etaSeconds: 0 })
  const etaSeconds = legEtaSeconds(distanceMeters, RS3_DRIVER_SPEED_MPS)
  return { points, distanceMeters, etaSeconds }
}

function stop(
  point: GeoPoint,
  label: string,
  address: string,
  contactName: string,
  contactPhone: string,
  extra: { items?: string[]; prepNote?: string; area?: string } = {},
): RouteStop {
  return { ...rs3Clamp(point), label, address, contactName, contactPhone, ...extra }
}

/**
 * Build a realistic rider job from two endpoints inside RS3. Used by the mock
 * fixtures and by the "Accept" entry point on Home/Jobs.
 */
export function buildJobFromLegs(opts: {
  id: string
  orderRef: string
  customerName: string
  riderStart: GeoPoint
  pickup: RouteStop
  dropoff: RouteStop
  payout: number
  isCod: boolean
  codAmount: number
  createdAt: string
}): RiderJob {
  const legToPickup = buildLeg(opts.riderStart, opts.pickup)
  const legToDropoff = buildLeg(opts.pickup, opts.dropoff)
  return {
    id: opts.id,
    orderRef: opts.orderRef,
    customerName: opts.customerName,
    pickup: opts.pickup,
    dropoff: opts.dropoff,
    legToPickup,
    legToDropoff,
    payout: opts.payout,
    isCod: opts.isCod,
    codAmount: opts.codAmount,
    currency: 'NPR',
    createdAt: opts.createdAt,
  }
}

/** A few canned RS3 jobs for the Jobs list / Accept demo. */
export function rs3SampleJobs(): RiderJob[] {
  const now = Date.now()
  const start = RIDER_START
  return [
    buildJobFromLegs({
      id: 'job-rs3-001',
      orderRef: 'CNZ-2041',
      customerName: 'Aarati Sharma',
      riderStart: start,
      pickup: stop(
        { lat: 27.7165, lng: 85.318 },
        'Thamel Mart',
        'Thamel Rd 22, Kathmandu',
        'Bishal (Store)',
        '9801002041',
        {
          area: 'Thamel',
          items: ['1× Handmade pashmina shawl', '2× Singing bowl (medium)', '1× Prayer flag set'],
          prepNote: 'Ask for Bishal at the rear counter. Items are packed and labeled CNZ-2041.',
        },
      ),
      dropoff: stop(
        { lat: 27.676, lng: 85.289 },
        'Home',
        'Kirtipur Marg 7, Kirtipur',
        'Aarati Sharma',
        '9801002041',
        { area: 'Kirtipur' },
      ),
      payout: 180,
      isCod: true,
      codAmount: 1290,
      createdAt: new Date(now - 1000 * 60 * 4).toISOString(),
    }),
    buildJobFromLegs({
      id: 'job-rs3-002',
      orderRef: 'CNZ-2038',
      customerName: 'Prakash Maharjan',
      riderStart: start,
      pickup: stop(
        { lat: 27.6715, lng: 85.329 },
        'Lalitpur Bazaar',
        'Patan Dhoka 3, Lalitpur',
        'Sunita (Store)',
        '9801002038',
        {
          area: 'Patan',
          items: ['1× Dhaka topi (black)', '1× Ceramic tea set (4 cups)'],
          prepNote: 'Fragile — handle with care. Sunita will hand over the sealed box.',
        },
      ),
      dropoff: stop(
        { lat: 27.679, lng: 85.361 },
        'Office',
        'Koteshwor Rd 12, Kathmandu',
        'Prakash Maharjan',
        '9801002038',
        { area: 'Koteshwor' },
      ),
      payout: 220,
      isCod: false,
      codAmount: 0,
      createdAt: new Date(now - 1000 * 60 * 9).toISOString(),
    }),
    buildJobFromLegs({
      id: 'job-rs3-003',
      orderRef: 'CNZ-2035',
      customerName: 'Maya Gurung',
      riderStart: start,
      pickup: stop(
        { lat: 27.714, lng: 85.362 },
        'Boudha Stores',
        'Boudha Stupa Rd 1, Kathmandu',
        'Karma (Store)',
        '9801002035',
        {
          area: 'Boudha',
          items: ['3× Incense gift pack', '1× Singing bowl (large)'],
          prepNote: 'Pickup from the Boudha Stupa Rd entrance. Karma is expecting you.',
        },
      ),
      dropoff: stop(
        { lat: 27.7065, lng: 85.3405 },
        'Apartment',
        'Chabahil Chowk 9, Kathmandu',
        'Maya Gurung',
        '9801002035',
        { area: 'Chabahil' },
      ),
      payout: 150,
      isCod: true,
      codAmount: 840,
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
    }),
  ]
}

/** Total trip distance (both legs) for a job, in meters. */
export function jobTotalDistance(job: RiderJob): number {
  return Math.round(haversineMeters(job.legToPickup.points[0], job.pickup) +
    haversineMeters(job.pickup, job.dropoff))
}

/** Convenience: RS3 boundary token re-export for callers. */
export const RS3_SIM_BOUNDARY = RS3_BOUNDARY

/**
 * Convert a lightweight Jobs-shell `JobRequest`-like payload (labels + payout
 * + eta, no geo) into an RS3 `ActiveDelivery`-shaped payload by matching it to
 * one of the canned sample jobs by id, falling back to the first sample.
 *
 * This is the bridge the rider-mobile Jobs "Accept" action uses to launch the
 * Active Delivery route: the Jobs shell only knows the request summary, while
 * the Active route needs the full legs + stops.
 */
export function jobRequestToActivePayload(req: {
  id: string
  orderRef: string
  pickupLabel: string
  dropoffLabel: string
  payout: number
  etaDropoffMs?: number
}): RiderJob {
  const samples = rs3SampleJobs()
  const match = samples.find(j => j.id === req.id || j.orderRef === req.orderRef)
  if (match) {
    return {
      ...match,
      orderRef: req.orderRef || match.orderRef,
      payout: req.payout || match.payout,
      pickup: { ...match.pickup, label: req.pickupLabel || match.pickup.label },
      dropoff: { ...match.dropoff, label: req.dropoffLabel || match.dropoff.label },
    }
  }
  // Fallback: synthesize a job from the rider start to two stable points.
  const pickup = stop(
    { lat: 27.7165, lng: 85.318 },
    req.pickupLabel || 'Pickup',
    'Pickup address',
    'Store',
    '9801000000',
  )
  const dropoff = stop(
    { lat: 27.676, lng: 85.289 },
    req.dropoffLabel || 'Drop-off',
    'Drop-off address',
    req.orderRef,
    '9801000000',
  )
  return buildJobFromLegs({
    id: req.id,
    orderRef: req.orderRef,
    customerName: 'Customer',
    riderStart: RIDER_START,
    pickup,
    dropoff,
    payout: req.payout,
    isCod: false,
    codAmount: 0,
    createdAt: new Date().toISOString(),
  })
}
