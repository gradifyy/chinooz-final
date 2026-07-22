import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { pendingOnly, decide, type Decision } from '../approvals'
import type { VerificationRequest } from '../types'
import { verificationRequestArb, boundedReasonArb } from './arbitraries'

/**
 * Property test for the verification-request pending list (Property 15).
 *
 * For any set of verification requests, `pendingOnly` returns exactly those
 * with `pending` status (sound and complete, in input order); and once a
 * request is decided — approved or rejected — it no longer appears in
 * `pendingOnly`.
 *
 * Validates Requirements 4.1 (the pending list displays the pending requests)
 * and 4.8 (a request whose status changes to approved/rejected is removed from
 * the pending list).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** A list of verification requests, possibly empty, mixed statuses. */
const requestListArb: fc.Arbitrary<VerificationRequest[]> = fc.array(
  verificationRequestArb,
  { maxLength: 30 },
)

/** Either guarded decision. */
const decisionArb: fc.Arbitrary<Decision> = fc.constantFrom('approve', 'reject')

/** A valid rejection reason (1..500 chars) so a `reject` decision succeeds. */
const validReasonArb: fc.Arbitrary<string> = boundedReasonArb(1, 500)

describe('approvals.pendingOnly (pending list)', () => {
  // Feature: admin-dashboard, Property 15: Pending list contains exactly the pending requests
  // Validates: Requirements 4.1
  it('returns exactly the requests whose status is pending (sound + complete, input order)', () => {
    fc.assert(
      fc.property(requestListArb, (requests) => {
        const result = pendingOnly(requests)

        // Completeness + soundness + order: the result equals the input list
        // filtered down to pending requests, preserving relative order.
        const expected = requests.filter((r) => r.status === 'pending')
        expect(result).toEqual(expected)

        // Every returned request is pending (soundness restated explicitly).
        expect(result.every((r) => r.status === 'pending')).toBe(true)

        // No pending request from the input is dropped (completeness restated).
        expect(result.length).toBe(expected.length)

        // Non-mutating: a fresh array is returned.
        expect(result).not.toBe(requests)
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 15: Pending list contains exactly the pending requests
  // Validates: Requirements 4.8
  it('a decided request no longer appears in the pending list (Req 4.8)', () => {
    fc.assert(
      fc.property(
        requestListArb,
        verificationRequestArb,
        decisionArb,
        validReasonArb,
        (others, base, decision, reason) => {
          // Ensure the request under test is pending so the decision succeeds.
          const pendingRequest: VerificationRequest = {
            ...base,
            status: 'pending',
          }

          // Give it an id distinct from every other request so identity is
          // unambiguous when we look for it in the pending list.
          const otherIds = new Set(others.map((r) => r.id))
          const targetId = otherIds.has(pendingRequest.id)
            ? `${pendingRequest.id}-target`
            : pendingRequest.id
          const target: VerificationRequest = {
            ...pendingRequest,
            id: targetId,
          }

          const before = [...others, target]

          // Sanity: while pending, the request IS in the pending list.
          expect(
            pendingOnly(before).some((r) => r.id === targetId),
          ).toBe(true)

          // Decide the request (approve, or reject with a valid reason).
          const result = decide(target, decision, reason)
          expect(result.ok).toBe(true)
          if (!result.ok) return

          // Replace the request with its decided version.
          const after = before.map((r) =>
            r.id === targetId ? result.request : r,
          )

          // Req 4.8: the decided request is gone from the pending list.
          expect(pendingOnly(after).some((r) => r.id === targetId)).toBe(false)
        },
      ),
      { numRuns: RUNS },
    )
  })
})
