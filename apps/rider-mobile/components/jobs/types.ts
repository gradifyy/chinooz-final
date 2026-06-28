/**
 * Local rider-job view models for the Jobs shell.
 *
 * - JobRequest (RJ3): a delivery request available for the rider to accept.
 * - JobHistoryEntry (RJ5): a completed or cancelled past delivery.
 *
 * These are the shapes the Jobs shell renders. The active delivery (RJ5
 * active) is modelled by `ActiveDelivery` in @chinooz/state.
 */

/** Vehicle / size hint shown on the card to set trip expectations. */
export type VehicleHint = 'bike' | 'scooter' | 'cycle' | 'walk'

export interface JobRequest {
  id: string
  orderRef: string
  pickupLabel: string
  dropoffLabel: string
  /** Distance from the rider to pickup, in km. */
  pickupDistanceKm: number
  /** Estimated trip distance pickup -> dropoff, in km. */
  tripDistanceKm: number
  /** Payout in NPR. */
  payout: number
  /** Epoch ms of the drop-off ETA if accepted now. */
  etaDropoffMs: number
  /** Cash-on-delivery amount in NPR to collect at drop-off (0 / undefined = prepaid). */
  codAmount?: number
  /** Short item summary, e.g. "2 items" or "Grocery bag". */
  itemSummary?: string
  /** Number of items (used for the count chip + a11y). */
  itemCount?: number
  /** Vehicle / size hint for the trip. */
  vehicle?: VehicleHint
  /** Epoch ms when this request expires (available jobs only). */
  expiresAtMs?: number
  /** Zone / area the pickup sits in (used by the zone filter + map pins). */
  zone?: string
  /** Order total in NPR (context for the card, not the payout). */
  totalNpr?: number
}

export type JobHistoryStatus = 'completed' | 'cancelled'

export interface JobHistoryEntry {
  id: string
  orderRef: string
  pickupLabel: string
  dropoffLabel: string
  payout: number
  status: JobHistoryStatus
  /** Epoch ms when the job was completed or cancelled. */
  finishedAt: number
  /** Total trip distance pickup -> dropoff, in km. */
  tripDistanceKm?: number
  /** Trip duration in minutes. */
  durationMin?: number
  /** Cash-on-delivery amount in NPR collected (0 / undefined = prepaid). */
  codAmount?: number
  /** Short item summary. */
  itemSummary?: string
  /** Number of items. */
  itemCount?: number
  /** Vehicle / size hint used for the trip. */
  vehicle?: VehicleHint
  /** Epoch ms the job was accepted (for the receipt timeline). */
  acceptedAt?: number
}

export type JobsTabKey = 'available' | 'active' | 'history'

/** Sort order for the Available list. */
export type AvailableSort = 'nearest' | 'bestPayout'

/** List/map view switch for the Available tab. */
export type AvailableView = 'list' | 'map'

/** Payment filter for the Available list. */
export type PaymentFilter = 'all' | 'cod' | 'prepaid'

/** Filter state for the Available list. */
export interface AvailableFilters {
  /** Max pickup distance in km (null/undefined = no cap). */
  maxDistanceKm: number | null
  /** Minimum payout in NPR (null/undefined = no cap). */
  minPayout: number | null
  /** Payment type filter. */
  payment: PaymentFilter
  /** Zone id filter (null/undefined = all zones). */
  zoneId: string | null
}

export const DEFAULT_FILTERS: AvailableFilters = {
  maxDistanceKm: null,
  minPayout: null,
  payment: 'all',
  zoneId: null,
}

/** Distance radius options in km. */
export const DISTANCE_OPTIONS: number[] = [1, 2, 5, 10]

/** Min payout options in NPR. */
export const MIN_PAYOUT_OPTIONS: number[] = [80, 120, 150, 200]
