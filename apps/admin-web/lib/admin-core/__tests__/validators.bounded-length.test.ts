import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  validateSearchTerm,
  SEARCH_TERM_MIN_LENGTH,
  SEARCH_TERM_MAX_LENGTH,
} from '../users'
import {
  validateRejectionReason,
  REJECTION_REASON_MIN_LENGTH,
  REJECTION_REASON_MAX_LENGTH,
} from '../approvals'
import {
  validateCancellationReason,
  CANCELLATION_REASON_MIN_LENGTH,
  CANCELLATION_REASON_MAX_LENGTH,
} from '../orders'
import {
  validateRemovalReason,
  REMOVAL_REASON_MIN_LENGTH,
  REMOVAL_REASON_MAX_LENGTH,
} from '../listings'

/**
 * Cross-cutting property test for the admin-core bounded-length validators
 * (Property 12). Each validator accepts a string if and only if its `.length`
 * lies within an inclusive `[min, max]` window:
 *
 *   - `validateSearchTerm`        — search term            2..100  (Req 3.4)
 *   - `validateRejectionReason`   — verification rejection 1..500  (Req 4.6)
 *   - `validateCancellationReason`— order cancellation     1..500  (Req 5.7)
 *   - `validateRemovalReason`     — listing removal        10..500 (Req 6.6)
 *
 * The expected outcome is derived from the actual input length, so the property
 * is decoupled from how strings are generated. Each property runs a minimum of
 * 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Any validator exposes an `ok` discriminant on its result. */
type BoundedValidator = (input: string) => { ok: boolean }

/**
 * Builds a string arbitrary that concentrates probability mass on the lengths
 * that matter for a `[min, max]` window: just below, at, and just above each
 * boundary, plus comfortably-inside and far-outside lengths and a handful of
 * fully-random strings. Lengths are clamped to be non-negative. Generating by
 * length (not by content) keeps the oracle — `min <= length <= max` — exact.
 */
function boundaryStringArb(min: number, max: number): fc.Arbitrary<string> {
  const candidateLengths = [
    0,
    Math.max(0, min - 1),
    min,
    min + 1,
    max - 1,
    max,
    max + 1,
    max + 50,
  ].filter((length) => length >= 0)

  const byLength = fc
    .constantFrom(...candidateLengths)
    .chain((length) => fc.string({ minLength: length, maxLength: length }))

  // Mix in unconstrained strings to cover the broader input space.
  return fc.oneof(
    { weight: 4, arbitrary: byLength },
    { weight: 1, arbitrary: fc.string({ maxLength: max + 10 }) },
  )
}

/**
 * Asserts the core biconditional for a single validator: the result is `ok`
 * exactly when the input length is within `[min, max]` inclusive.
 */
function assertBounded(
  validator: BoundedValidator,
  min: number,
  max: number,
): void {
  fc.assert(
    fc.property(boundaryStringArb(min, max), (input) => {
      const withinBounds = input.length >= min && input.length <= max
      expect(validator(input).ok).toBe(withinBounds)
    }),
    { numRuns: RUNS },
  )
}

describe('admin-core bounded-length validators', () => {
  // Feature: admin-dashboard, Property 12: Bounded-length validation boundaries
  // Validates: Requirements 3.4
  it('validateSearchTerm accepts iff length is within 2..100', () => {
    expect(SEARCH_TERM_MIN_LENGTH).toBe(2)
    expect(SEARCH_TERM_MAX_LENGTH).toBe(100)
    assertBounded(
      validateSearchTerm,
      SEARCH_TERM_MIN_LENGTH,
      SEARCH_TERM_MAX_LENGTH,
    )
  })

  // Feature: admin-dashboard, Property 12: Bounded-length validation boundaries
  // Validates: Requirements 4.6
  it('validateRejectionReason accepts iff length is within 1..500', () => {
    expect(REJECTION_REASON_MIN_LENGTH).toBe(1)
    expect(REJECTION_REASON_MAX_LENGTH).toBe(500)
    assertBounded(
      validateRejectionReason,
      REJECTION_REASON_MIN_LENGTH,
      REJECTION_REASON_MAX_LENGTH,
    )
  })

  // Feature: admin-dashboard, Property 12: Bounded-length validation boundaries
  // Validates: Requirements 5.7
  it('validateCancellationReason accepts iff length is within 1..500', () => {
    expect(CANCELLATION_REASON_MIN_LENGTH).toBe(1)
    expect(CANCELLATION_REASON_MAX_LENGTH).toBe(500)
    assertBounded(
      validateCancellationReason,
      CANCELLATION_REASON_MIN_LENGTH,
      CANCELLATION_REASON_MAX_LENGTH,
    )
  })

  // Feature: admin-dashboard, Property 12: Bounded-length validation boundaries
  // Validates: Requirements 6.6
  it('validateRemovalReason accepts iff length is within 10..500', () => {
    expect(REMOVAL_REASON_MIN_LENGTH).toBe(10)
    expect(REMOVAL_REASON_MAX_LENGTH).toBe(500)
    assertBounded(
      validateRemovalReason,
      REMOVAL_REASON_MIN_LENGTH,
      REMOVAL_REASON_MAX_LENGTH,
    )
  })
})
