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
