/**
 * RJ1 — Rider delivery job fixtures.
 *
 * A delivery job = one seller's sub-order pickup → buyer drop-off. Each job
 * carries pickup/drop-off coords + addresses, distance, payout, COD amount,
 * items, and seller + buyer refs so it can cross-link into the shared order
 * store (buyer order tracking O4 + seller Order Management).
 *
 * Jobs are built from the seller sub-order seed (sellerOrders.ts) so the
 * rider, buyer, and seller all see the same orders. Coordinates are
 * approximate Kathmandu Valley lat/lng (stable + deterministic).
 */

import type { RiderJob, GeoPoint, RouteStop, DeliveryLeg } from '@chinooz/types'
import { RIDER_LOCATION, getDemandZones } from './riderDemand'

/** Haversine distance in meters between two lat/lng points. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/** Estimate ETA seconds from distance (mock ~18 km/h average in valley traffic). */
export function etaSecondsFor(distanceMeters: number): number {
  const speedMs = 18 * 1000 / 3600 // 18 km/h
  return Math.round(distanceMeters / speedMs)
}

/** Build a synthetic route (straight-line interpolation) between two points. */
function buildLeg(from: GeoPoint, to: GeoPoint): DeliveryLeg {
  const dist = haversineMeters(from, to)
  // Interpolate a handful of intermediate points so the trip simulator has
  // a route to animate along. 8 segments is enough for a smooth mock.
  const segments = 8
  const points: GeoPoint[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    points.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    })
  }
  return { points, distanceMeters: dist, etaSeconds: etaSecondsFor(dist) }
}

interface SellerLocation {
  sellerId: string
  name: string
  point: GeoPoint
  address: string
  phone: string
}

/** Seller store locations across the valley (mock). */
const SELLER_LOCATIONS: SellerLocation[] = [
  { sellerId: 'seller-1', name: 'TechHub Nepal', point: { lat: 27.7165, lng: 85.318 }, address: 'Thamel Marg, Kathmandu', phone: '+977-1-4700001' },
  { sellerId: 'seller-2', name: 'Nepal Handicrafts', point: { lat: 27.6715, lng: 85.329 }, address: 'Patan Dhoka, Lalitpur', phone: '+977-1-5530002' },
  { sellerId: 'seller-3', name: 'Snack Distributors', point: { lat: 27.6905, lng: 85.342 }, address: 'New Baneshwor, Kathmandu', phone: '+977-1-4460003' },
  { sellerId: 'seller-4', name: 'Kathmandu Cashmere', point: { lat: 27.714, lng: 85.362 }, address: 'Boudha Stupa Rd, Kathmandu', phone: '+977-1-4710004' },
  { sellerId: 'seller-5', name: 'Ilam Tea House', point: { lat: 27.679, lng: 85.361 }, address: 'Koteshwor, Kathmandu', phone: '+977-1-4750005' },
  { sellerId: 'seller-6', name: 'Bhaktapur Woodcraft', point: { lat: 27.668, lng: 85.407 }, address: 'Durbar Sq, Bhaktapur', phone: '+977-1-6610006' },
  { sellerId: 'seller-7', name: 'Audio Plus', point: { lat: 27.7065, lng: 85.3405 }, address: 'Chabahil, Kathmandu', phone: '+977-1-4410007' },
]

interface BuyerLocation {
  name: string
  phone: string
  point: GeoPoint
  address: string
  area: string
}

/** Buyer drop-off locations across the valley (mock). */
const BUYER_LOCATIONS: BuyerLocation[] = [
  { name: 'Aarav Sharma', phone: '+977-9801112222', point: { lat: 27.7335, lng: 85.34 }, address: 'Maharajgunj Rd 12', area: 'Maharajgunj' },
  { name: 'Sita Rai', phone: '+977-9812334455', point: { lat: 27.676, lng: 85.289 }, address: 'Kirtipur Rd 8', area: 'Kirtipur' },
  { name: 'Bishal Thapa', phone: '+977-9824455667', point: { lat: 27.691, lng: 85.292 }, address: 'Kalanki Chowk 4', area: 'Kalanki' },
  { name: 'Gita Maharjan', phone: '+977-9845677889', point: { lat: 27.672, lng: 85.318 }, address: 'Patan Dhoka 7', area: 'Lalitpur' },
  { name: 'Rohan Tamang', phone: '+977-9861234567', point: { lat: 27.718, lng: 85.31 }, address: 'Thamel Marg 3', area: 'Thamel' },
  { name: 'Nisha Gurung', phone: '+977-9809876543', point: { lat: 27.688, lng: 85.34 }, address: 'Baneshwor Heights 10', area: 'Baneshwor' },
  { name: 'Kabir Shrestha', phone: '+977-9815554433', point: { lat: 27.678, lng: 85.35 }, address: 'Koteshwor Rd 15', area: 'Koteshwor' },
  { name: 'Maya Limbu', phone: '+977-9823332211', point: { lat: 27.715, lng: 85.352 }, address: 'Boudha Stupa 6', area: 'Boudha' },
]

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n * 99.13) * 10000
  return x - Math.floor(x)
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length]
}

interface JobSpec {
  sellerIdx: number
  buyerIdx: number
  itemCount: number
  totalNpr: number
  isCod: boolean
  codAmount: number
  payoutNpr: number
  distanceBoost: number
}

/** Deterministic job specs so fixtures are stable across reloads. */
const JOB_SPECS: JobSpec[] = [
  { sellerIdx: 0, buyerIdx: 3, itemCount: 1, totalNpr: 1299, isCod: true, codAmount: 1299, payoutNpr: 120, distanceBoost: 0 },
  { sellerIdx: 1, buyerIdx: 0, itemCount: 2, totalNpr: 4400, isCod: true, codAmount: 4400, payoutNpr: 160, distanceBoost: 1 },
  { sellerIdx: 4, buyerIdx: 5, itemCount: 1, totalNpr: 450, isCod: false, codAmount: 0, payoutNpr: 85, distanceBoost: 0 },
  { sellerIdx: 2, buyerIdx: 6, itemCount: 3, totalNpr: 2960, isCod: true, codAmount: 2960, payoutNpr: 140, distanceBoost: 1 },
  { sellerIdx: 6, buyerIdx: 7, itemCount: 1, totalNpr: 2499, isCod: false, codAmount: 0, payoutNpr: 130, distanceBoost: 0 },
  { sellerIdx: 3, buyerIdx: 1, itemCount: 1, totalNpr: 3800, isCod: true, codAmount: 3800, payoutNpr: 195, distanceBoost: 1 },
  { sellerIdx: 0, buyerIdx: 2, itemCount: 1, totalNpr: 720, isCod: false, codAmount: 0, payoutNpr: 110, distanceBoost: 1 },
  { sellerIdx: 5, buyerIdx: 4, itemCount: 1, totalNpr: 2800, isCod: true, codAmount: 2800, payoutNpr: 175, distanceBoost: 1 },
]

const ITEM_LABELS = [
  'Daraz 10000mAh Power Bank',
  'Pashmina Shawl — Black',
  'Ilam Masala Tea 250g',
  'Wai Wai Noodles (Pack of 40)',
  'Wireless Earbuds Pro',
  'Handmade Dhaka Topi',
  'Organic Honey 500ml',
  'Bhaktapur Carved Mandala',
]

/** Build the rider job fixtures from the specs. */
function buildJobs(): RiderJob[] {
  const now = Date.now()
  return JOB_SPECS.map((spec, i) => {
    const seller = pick(SELLER_LOCATIONS, spec.sellerIdx)
    const buyer = pick(BUYER_LOCATIONS, spec.buyerIdx)

    const pickup: RouteStop = {
      ...seller.point,
      label: seller.name,
      address: seller.address,
      contactName: seller.name,
      contactPhone: seller.phone,
    }
    const dropoff: RouteStop = {
      ...buyer.point,
      label: buyer.area,
      address: buyer.address,
      contactName: buyer.name,
      contactPhone: buyer.phone,
    }

    const legToPickup = buildLeg(RIDER_LOCATION, seller.point)
    const legToDropoff = buildLeg(seller.point, buyer.point)

    const items = Array.from({ length: spec.itemCount }, (_, j) => ({
      name: ITEM_LABELS[(i + j) % ITEM_LABELS.length],
    }))

    return {
      id: `job-${2000 + i}`,
      orderRef: `CHZ-${2040 + i}`,
      customerName: buyer.name,
      pickup,
      dropoff,
      legToPickup,
      legToDropoff,
      payout: spec.payoutNpr,
      isCod: spec.isCod,
      codAmount: spec.codAmount,
      currency: 'NPR' as const,
      createdAt: new Date(now - i * 90_000).toISOString(),
      // Extra metadata for the job card (not in the shared type but useful).
      ...({ items, totalNpr: spec.totalNpr, sellerId: seller.sellerId } as Record<string, unknown>),
    } as RiderJob
  })
}

/** Available rider jobs (mutable — accept/decline removes from the pool). */
export const riderJobs: RiderJob[] = buildJobs()

/** Snapshot of the demand zones for job distance context. */
export const JOB_DEMAND_ZONES = getDemandZones()

/**
 * Get available delivery jobs near the rider. Sorted by pickup distance.
 * Pass `limit` to cap the returned list.
 */
export function getAvailableJobsSync(limit?: number): RiderJob[] {
  const sorted = [...riderJobs].sort(
    (a, b) => a.legToPickup.distanceMeters - b.legToPickup.distanceMeters,
  )
  return limit ? sorted.slice(0, limit) : sorted
}

/** Find a job by id (sync). */
export function getJobByIdSync(jobId: string): RiderJob | undefined {
  return riderJobs.find(j => j.id === jobId)
}

/** Remove a job from the available pool (after accept/decline). */
export function removeJobFromPool(jobId: string): void {
  const idx = riderJobs.findIndex(j => j.id === jobId)
  if (idx >= 0) riderJobs.splice(idx, 1)
}

/** Total distance for a job (rider → pickup → dropoff) in meters. */
export function totalJobDistance(job: RiderJob): number {
  return job.legToPickup.distanceMeters + job.legToDropoff.distanceMeters
}

/** Total ETA for a job (rider → pickup → dropoff) in seconds. */
export function totalJobEta(job: RiderJob): number {
  return job.legToPickup.etaSeconds + job.legToDropoff.etaSeconds
}
