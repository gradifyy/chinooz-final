import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { validateDateRange } from '../analytics'
import { validateAuditDateRange } from '../audit'
import { isoDateArb, isoUtcTimestampArb } from './arbitraries'

/**
 * Property test for date-range validation boundary (Property 13).
 *
 * For any start and end date, `validateDateRange` (analytics — Req 7.5) and
 * `validateAuditDateRange` (audit — Req 9.6) return `ok` if and only if `start`
 * is on or before `end`. Bounds are compared as instants via `Date.parse`, so
 * the boundary where `start === end` is accepted. Both validators reject a
 * reversed range (`start` strictly after `end`).
 *
 * Validates Requirements 7.5, 9.6.
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/**
 * A valid, parseable ISO date string at either day or second precision —
 * exercises both bound precisions the validators support.
 */
const dateStringArb: fc.Arbitrary<string> = fc.oneof(
  isoDateArb,
  isoUtcTimestampArb,
)

/**
 * A pair of valid date strings. Half the time the pair is independent (random
 * ordering); the other half forces `start === end` so the inclusive boundary
 * is reliably probed.
 */
const datePairArb: fc.Arbitrary<[string, string]> = fc.oneof(
  fc.tuple(dateStringArb, dateStringArb),
  dateStringArb.map((d) => [d, d] as [string, string]),
)

describe('date-range validation boundary (Property 13)', () => {
  // Feature: admin-dashboard, Property 13: Date-range validation boundary
  // Validates: Requirements 7.5, 9.6
  it('validateDateRange and validateAuditDateRange return ok iff start is on or before end', () => {
    fc.assert(
      fc.property(datePairArb, ([start, end]) => {
        const expectedOk = Date.parse(start) <= Date.parse(end)

        // Analytics validator (Req 7.5).
        const analytics = validateDateRange(start, end)
        expect(analytics.ok).toBe(expectedOk)
        if (!analytics.ok) {
          expect(analytics.reason).toBe('start_after_end')
        }

        // Audit validator (Req 9.6) — same boundary behaviour on valid bounds.
        const audit = validateAuditDateRange(start, end)
        expect(audit.ok).toBe(expectedOk)
      }),
      { numRuns: RUNS },
    )
  })
})
