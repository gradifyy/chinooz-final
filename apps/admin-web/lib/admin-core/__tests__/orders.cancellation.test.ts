import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  cancelOrder,
  buildCancellationAuditRecord,
  validateCancellationReason,
  ORDER_CANCEL_ACTION,
  CANCELLATION_REASON_MIN_LENGTH,
  CANCELLATION_REASON_MAX_LENGTH,
} from '../orders'
import type { AdminOrder, OrderStatus } from '../types'
import { idArb, adminOrderArb, boundedReasonArb } from './arbitraries'

/**
 * Property test for the guarded, audited order cancellation (Property 17).
 *
 * For any order and cancellation reason, `cancelOrder` succeeds if and only if
 * the order is **not** in `completed` status **and** the reason is valid
 * (length 1..500). A successful cancellation returns a fresh order copy with
 * status `cancelled` and `cancellationReason` recorded — never mutating the
 * input — and yields (via `buildCancellationAuditRecord`) an audit record
 * carrying the acting identity, affected identity, action type, the
 * cancellation reason, and a UTC second-precision timestamp. Cancelling with
 * an invalid reason (length 0 or > 500) is blocked (`invalid_reason`) and
 * leaves the order unchanged; cancelling an already-`completed` order is
 * blocked (`already_completed`) and leaves the order unchanged — even when the
 * reason would otherwise be valid, since the completed-status guard is checked
 * before the reason check.
 *
 * Validates Requirements 5.6 (cancel non-completed order with valid reason →
 * cancelled, reason recorded, audited, input non-mutated), 5.7 (invalid reason
 * blocked, order unchanged), and 5.8 (completed order blocked, order
 * unchanged, completed guard precedes reason check).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Lower bound for generated instants (2000-01-01). */
const MIN_INSTANT = Date.UTC(2000, 0, 1)
/** Upper bound for generated instants (2030-12-31). */
const MAX_INSTANT = Date.UTC(2030, 11, 31)

/** ISO UTC at second precision, e.g. `2024-01-01T00:00:00Z` — no sub-second part. */
const UTC_SECOND_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

/** An epoch-millisecond instant within the domain's supported range. */
const nowArb: fc.Arbitrary<number> = fc.integer({
  min: MIN_INSTANT,
  max: MAX_INSTANT,
})

/** A valid cancellation reason whose length is within `[1, 500]`. */
const validReasonArb: fc.Arbitrary<string> = boundedReasonArb(
  CANCELLATION_REASON_MIN_LENGTH,
  CANCELLATION_REASON_MAX_LENGTH,
)

/**
 * An invalid cancellation reason: either empty (length 0, below the minimum) or
 * longer than the maximum (length 501..520, above the maximum).
 */
const invalidReasonArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.string({
    minLength: CANCELLATION_REASON_MAX_LENGTH + 1,
    maxLength: CANCELLATION_REASON_MAX_LENGTH + 20,
  }),
)

/** Any non-completed order status — the statuses from which cancellation is permitted. */
const nonCompletedStatusArb: fc.Arbitrary<OrderStatus> = fc.constantFrom(
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
)

/** An order forced into a specific status. */
function orderWithStatus(base: AdminOrder, status: OrderStatus): AdminOrder {
  return { ...base, status }
}

describe('orders.cancelOrder (guarded, audited order cancellation)', () => {
  // Feature: admin-dashboard, Property 17: Order cancellation is guarded and audited
  // Validates: Requirements 5.6
  it('cancelling a non-completed order with a valid reason succeeds, sets cancelled, records the reason, never mutates the input + a complete audit record (Req 5.6)', () => {
    fc.assert(
      fc.property(
        adminOrderArb,
        nonCompletedStatusArb,
        validReasonArb,
        idArb,
        nowArb,
        (base, status, reason, actor, now) => {
          const order = orderWithStatus(base, status)
          const before = { ...order }

          // Sanity: the reason is within the accepted bounds.
          expect(validateCancellationReason(reason).ok).toBe(true)

          const result = cancelOrder(order, reason)

          // The cancellation succeeds and sets the status to cancelled.
          expect(result.ok).toBe(true)
          if (!result.ok) return
          expect(result.order.status).toBe('cancelled')
          expect(result.order.cancellationReason).toBe(reason)

          // Non-mutating: a fresh object is returned, the input is untouched.
          expect(result.order).not.toBe(order)
          expect(order).toEqual(before)

          // Other identifying fields are preserved.
          expect(result.order.id).toBe(order.id)
          expect(result.order.createdAt).toBe(order.createdAt)
          expect(result.order.buyer).toEqual(order.buyer)
          expect(result.order.seller).toEqual(order.seller)

          // The audit record carries the required fields, including the reason.
          const record = buildCancellationAuditRecord(actor, result.order, now)
          expect(record.actorId).toBe(actor)
          expect(record.entityId).toBe(order.id)
          expect(record.details?.affectedId).toBe(order.id)
          expect(record.details?.cancellationReason).toBe(reason)
          expect(record.actionType).toBe(ORDER_CANCEL_ACTION)
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          const parsed = Date.parse(record.timestamp)
          expect(Number.isNaN(parsed)).toBe(false)
          expect(parsed).toBe(Math.floor(now / 1000) * 1000)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 17: Order cancellation is guarded and audited
  // Validates: Requirements 5.7
  it('cancelling a non-completed order with an invalid reason (length 0 or > 500) is blocked and leaves the order unchanged (Req 5.7)', () => {
    fc.assert(
      fc.property(
        adminOrderArb,
        nonCompletedStatusArb,
        invalidReasonArb,
        (base, status, reason) => {
          const order = orderWithStatus(base, status)
          const before = { ...order }

          // Sanity: the reason is outside the accepted bounds.
          expect(validateCancellationReason(reason).ok).toBe(false)

          const result = cancelOrder(order, reason)

          // The cancellation is blocked with the documented reason.
          expect(result.ok).toBe(false)
          if (result.ok) return
          expect(result.reason).toBe('invalid_reason')

          // The input order (status included) is left unchanged.
          expect(order).toEqual(before)
          expect(order.status).toBe(status)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 17: Order cancellation is guarded and audited
  // Validates: Requirements 5.8
  it('cancelling a completed order is blocked (already_completed) and leaves the order unchanged, even with an otherwise-valid reason (Req 5.8)', () => {
    fc.assert(
      fc.property(adminOrderArb, validReasonArb, (base, reason) => {
        const order = orderWithStatus(base, 'completed')
        const before = { ...order }

        // The reason would otherwise be valid — confirms the completed guard precedes the reason check.
        expect(validateCancellationReason(reason).ok).toBe(true)

        const result = cancelOrder(order, reason)

        // The cancellation is blocked because the order is already completed.
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.reason).toBe('already_completed')

        // The input order (status included) is left unchanged.
        expect(order).toEqual(before)
        expect(order.status).toBe('completed')
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 17: Order cancellation is guarded and audited
  // Validates: Requirements 5.6, 5.7, 5.8
  it('succeeds exactly when the order is not completed and the reason is valid', () => {
    fc.assert(
      fc.property(
        adminOrderArb,
        fc.oneof(validReasonArb, invalidReasonArb),
        (order, reason) => {
          const result = cancelOrder(order, reason)

          const reasonValid = validateCancellationReason(reason).ok
          const expectedOk = order.status !== 'completed' && reasonValid
          expect(result.ok).toBe(expectedOk)

          if (result.ok) {
            expect(result.order.status).toBe('cancelled')
            expect(result.order.cancellationReason).toBe(reason)
          } else if (order.status === 'completed') {
            // Completed guard precedes the reason check.
            expect(result.reason).toBe('already_completed')
          } else {
            expect(result.reason).toBe('invalid_reason')
          }
        },
      ),
      { numRuns: RUNS },
    )
  })
})
