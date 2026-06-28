/**
 * Local rider-job view models for the Jobs shell.
 *
 * - JobRequest (RJ3): a delivery request available for the rider to accept.
 * - JobHistoryEntry (RJ5): a completed or cancelled past delivery.
 *
 * These are the shapes the Jobs shell renders. The active delivery (RJ5
 * active) is modelled by `ActiveDelivery` in @chinooz/state.
 */

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
}

export type JobsTabKey = 'available' | 'active' | 'history'
