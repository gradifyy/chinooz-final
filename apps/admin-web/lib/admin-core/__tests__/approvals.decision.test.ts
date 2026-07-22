import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  decide,
  buildDecisionAuditRecord,
  validateRejectionReason,
  VERIFICATION_APPROVE_ACTION,
  VERIFICATION_REJECT_ACTION,
  REJECTION_REASON_MIN_LENGTH,
  REJECTION_REASON_MAX_LENGTH,
} from '../approvals'
import type { VerificationRequest, VerificationStatus } from '../types'
import { idArb, verificationRequestArb, boundedReasonArb } from './arbitraries'

/**
 * Property test for the guarded, audited verification decision (Property 16).
 *
 * For any verification request and decision, `decide` succeeds only when the
 * request is pending: approving sets the status to `approved`, and rejecting
 * with a valid reason (length 1..500) sets the status to `rejected` and records
 * the reason — each successful decision yielding (via
 * `buildDecisionAuditRecord`) an audit record carrying the acting identity,
 * affected identity, action type, and a UTC second-precision timestamp.
 * Rejecting with an invalid reason (length 0 or > 500) is blocked
 * (`invalid_rejection_reason`) and leaves the request unchanged; acting on an
 * already-approved or already-rejected request is blocked
 * (`already_processed`) and leaves the request unchanged.
 *
 * Validates Requirements 4.4 (approve → approved + audit), 4.5 (reject with a
 * valid reason → rejected, reason recorded + audit), and 4.7 (a decision on an
 * already-decided request is blocked, status unchanged).
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

/** A valid rejection reason whose length is within `[1, 500]`. */
const validReasonArb: fc.Arbitrary<string> = boundedReasonArb(
  REJECTION_REASON_MIN_LENGTH,
  REJECTION_REASON_MAX_LENGTH,
)

/**
 * An invalid rejection reason: either empty (length 0, below the minimum) or
 * longer than the maximum (length 501..520, above the maximum).
 */
const invalidReasonArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.string({
    minLength: REJECTION_REASON_MAX_LENGTH + 1,
    maxLength: REJECTION_REASON_MAX_LENGTH + 20,
  }),
)

/** An already-decided (non-pending) verification status. */
const decidedStatusArb: fc.Arbitrary<VerificationStatus> = fc.constantFrom(
  'approved',
  'rejected',
)

/** A verification request forced into a specific status. */
function requestWithStatus(
  base: VerificationRequest,
  status: VerificationStatus,
): VerificationRequest {
  return { ...base, status }
}

describe('approvals.decide (guarded, audited verification decision)', () => {
  // Feature: admin-dashboard, Property 16: Verification decision is guarded and audited
  // Validates: Requirements 4.4
  it('approving a pending request yields approved status + a complete audit record (Req 4.4)', () => {
    fc.assert(
      fc.property(
        verificationRequestArb,
        idArb,
        nowArb,
        (base, actor, now) => {
          const request = requestWithStatus(base, 'pending')
          const before = { ...request }

          const result = decide(request, 'approve')

          // The decision succeeds and sets the status to approved.
          expect(result.ok).toBe(true)
          if (!result.ok) return
          expect(result.request.status).toBe('approved')

          // Non-mutating: the input is untouched.
          expect(request).toEqual(before)
          expect(result.request).not.toBe(request)

          // Other identifying fields are preserved.
          expect(result.request.id).toBe(request.id)
          expect(result.request.requesterId).toBe(request.requesterId)

          // The audit record carries the required fields.
          const record = buildDecisionAuditRecord(
            actor,
            result.request,
            'approve',
            now,
          )
          expect(record.actorId).toBe(actor)
          expect(record.entityId).toBe(request.id)
          expect(record.details?.affectedId).toBe(request.id)
          expect(record.actionType).toBe(VERIFICATION_APPROVE_ACTION)
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          expect(Date.parse(record.timestamp)).toBe(
            Math.floor(now / 1000) * 1000,
          )
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 16: Verification decision is guarded and audited
  // Validates: Requirements 4.5
  it('rejecting a pending request with a valid reason yields rejected status, records the reason + a complete audit record (Req 4.5)', () => {
    fc.assert(
      fc.property(
        verificationRequestArb,
        validReasonArb,
        idArb,
        nowArb,
        (base, reason, actor, now) => {
          const request = requestWithStatus(base, 'pending')
          const before = { ...request }

          // Sanity: the reason is within the accepted bounds.
          expect(validateRejectionReason(reason).ok).toBe(true)

          const result = decide(request, 'reject', reason)

          // The decision succeeds, sets the status to rejected, and records the reason.
          expect(result.ok).toBe(true)
          if (!result.ok) return
          expect(result.request.status).toBe('rejected')
          expect(result.request.rejectionReason).toBe(reason)

          // Non-mutating: the input is untouched.
          expect(request).toEqual(before)
          expect(result.request).not.toBe(request)

          // The audit record carries the required fields, including the reason.
          const record = buildDecisionAuditRecord(
            actor,
            result.request,
            'reject',
            now,
          )
          expect(record.actorId).toBe(actor)
          expect(record.entityId).toBe(request.id)
          expect(record.details?.affectedId).toBe(request.id)
          expect(record.details?.rejectionReason).toBe(reason)
          expect(record.actionType).toBe(VERIFICATION_REJECT_ACTION)
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          expect(Date.parse(record.timestamp)).toBe(
            Math.floor(now / 1000) * 1000,
          )
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 16: Verification decision is guarded and audited
  // Validates: Requirements 4.5
  it('rejecting a pending request with an invalid reason (length 0 or > 500) is blocked and leaves the request unchanged (Req 4.5)', () => {
    fc.assert(
      fc.property(
        verificationRequestArb,
        invalidReasonArb,
        (base, reason) => {
          const request = requestWithStatus(base, 'pending')
          const before = { ...request }

          // Sanity: the reason is outside the accepted bounds.
          expect(validateRejectionReason(reason).ok).toBe(false)

          const result = decide(request, 'reject', reason)

          // The decision is blocked with the documented reason.
          expect(result.ok).toBe(false)
          if (result.ok) return
          expect(result.reason).toBe('invalid_rejection_reason')

          // The input request (status included) is left unchanged.
          expect(request).toEqual(before)
          expect(request.status).toBe('pending')
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 16: Verification decision is guarded and audited
  // Validates: Requirements 4.7
  it('acting on an already-decided request is blocked (already_processed) and leaves the status unchanged (Req 4.7)', () => {
    fc.assert(
      fc.property(
        verificationRequestArb,
        decidedStatusArb,
        fc.constantFrom('approve' as const, 'reject' as const),
        validReasonArb,
        (base, status, decision, reason) => {
          const request = requestWithStatus(base, status)
          const before = { ...request }

          const result = decide(request, decision, reason)

          // The decision is blocked because the request is already processed.
          expect(result.ok).toBe(false)
          if (result.ok) return
          expect(result.reason).toBe('already_processed')

          // The input request (status included) is left unchanged.
          expect(request).toEqual(before)
          expect(request.status).toBe(status)
        },
      ),
      { numRuns: RUNS },
    )
  })
})
