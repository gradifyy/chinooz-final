import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { filterByType } from '../users'
import { filterByStatus } from '../orders'
import { filterByModerationStatus } from '../listings'
import { filterRecords } from '../audit'
import type {
  AdminListing,
  AdminOrder,
  AuditRecord,
  MarketplaceUser,
  ModerationStatus,
  OrderStatus,
  UserType,
} from '../types'
import {
  adminListingArb,
  adminOrderArb,
  auditRecordArb,
  marketplaceUserArb,
  moderationStatusArb,
  orderStatusArb,
  userTypeArb,
} from './arbitraries'

/**
 * Cross-cutting property test for filtering across the admin-core modules
 * (Property 10).
 *
 * Property 10 — "Filtering is sound and complete": for any collection and any
 * selected filter value (user type, order status, listing moderation status, or
 * audit actor/date), the filtered result contains exactly those elements
 * matching the filter — every match is included (completeness) and no non-match
 * is included (soundness). This is verified against an independent reference
 * predicate for each of the four filter functions:
 *
 * - `filterByType`            — user type            (Req 3.2)
 * - `filterByStatus`          — order status         (Req 5.2)
 * - `filterByModerationStatus`— listing moderation status (Req 6.2)
 * - `filterRecords`           — audit actor and/or date range (Req 9.5)
 *
 * Each property runs a minimum of 100 iterations per the design Testing
 * Strategy.
 *
 * Validates: Requirements 3.2, 5.2, 6.2, 9.5
 */

const RUNS = 100

/**
 * Asserts that `result` is exactly the elements of `items` satisfying
 * `predicate`, in input order (soundness + completeness in one shot), and that
 * filtering did not mutate or alias the input collection.
 */
function expectSoundAndComplete<T>(
  items: readonly T[],
  result: readonly T[],
  predicate: (item: T) => boolean,
): void {
  const expected = items.filter(predicate)

  // Sound AND complete: precisely the matching elements, original ordering.
  expect(result).toEqual(expected)

  // Soundness, stated independently: every returned element matches.
  for (const item of result) {
    expect(predicate(item)).toBe(true)
  }

  // Completeness, stated independently: every excluded element does not match.
  const returned = new Set(result)
  for (const item of items) {
    if (!returned.has(item)) {
      expect(predicate(item)).toBe(false)
    }
  }

  // Non-mutating: a fresh array is returned, the input is untouched.
  expect(result).not.toBe(items)
}

describe('admin-core filtering is sound and complete (Property 10)', () => {
  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 3.2
  it('filterByType returns exactly the users whose type matches the selected type (Req 3.2)', () => {
    fc.assert(
      fc.property(
        fc.array(marketplaceUserArb, { maxLength: 50 }),
        userTypeArb,
        (users: MarketplaceUser[], type: UserType) => {
          const result = filterByType(users, type)
          expectSoundAndComplete(users, result, (user) => user.type === type)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 3.2
  it('filterByType with no selected type returns every user (Req 3.2)', () => {
    fc.assert(
      fc.property(
        fc.array(marketplaceUserArb, { maxLength: 50 }),
        (users: MarketplaceUser[]) => {
          const result = filterByType(users, undefined)
          expectSoundAndComplete(users, result, () => true)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 5.2
  it('filterByStatus returns exactly the orders whose status matches the selected status (Req 5.2)', () => {
    fc.assert(
      fc.property(
        fc.array(adminOrderArb, { maxLength: 50 }),
        orderStatusArb,
        (orders: AdminOrder[], status: OrderStatus) => {
          const result = filterByStatus(orders, status)
          expectSoundAndComplete(orders, result, (order) => order.status === status)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 5.2
  it('filterByStatus with no selected status returns every order (Req 5.2)', () => {
    fc.assert(
      fc.property(
        fc.array(adminOrderArb, { maxLength: 50 }),
        (orders: AdminOrder[]) => {
          const result = filterByStatus(orders, undefined)
          expectSoundAndComplete(orders, result, () => true)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 6.2
  it('filterByModerationStatus returns exactly the listings whose moderation status matches the selected status (Req 6.2)', () => {
    fc.assert(
      fc.property(
        fc.array(adminListingArb, { maxLength: 50 }),
        moderationStatusArb,
        (listings: AdminListing[], status: ModerationStatus) => {
          const result = filterByModerationStatus(listings, status)
          expectSoundAndComplete(
            listings,
            result,
            (listing) => listing.moderationStatus === status,
          )
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 6.2
  it('filterByModerationStatus with no selected status returns every listing (Req 6.2)', () => {
    fc.assert(
      fc.property(
        fc.array(adminListingArb, { maxLength: 50 }),
        (listings: AdminListing[]) => {
          const result = filterByModerationStatus(listings, undefined)
          expectSoundAndComplete(listings, result, () => true)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 10: Filtering is sound and complete
  // Validates: Requirements 9.5
  it('filterRecords returns exactly the audit records matching the actor and/or date-range filter (Req 9.5)', () => {
    // Pair a record collection with a filter biased toward values that occur in
    // the collection, so the soundness/completeness checks exercise non-empty
    // match sets (an actor drawn from the records, a date-range bracketing some
    // of their timestamps) alongside random/absent criteria.
    const recordsAndFilterArb = fc
      .array(auditRecordArb, { maxLength: 40 })
      .chain((records: AuditRecord[]) => {
        const actorArb =
          records.length > 0
            ? fc.constantFrom(...records.map((r) => r.actorId))
            : fc.constant('no-such-actor')
        const boundArb =
          records.length > 0
            ? fc.constantFrom(...records.map((r) => r.timestamp))
            : fc.constant('2024-01-01T00:00:00Z')

        return fc
          .record({
            actorId: fc.option(actorArb, { nil: undefined }),
            a: fc.option(boundArb, { nil: undefined }),
            b: fc.option(boundArb, { nil: undefined }),
          })
          .map(({ actorId, a, b }) => {
            // Normalise the two optional bounds into ordered start/end so the
            // filter range is well-formed (start <= end).
            let start: string | undefined
            let end: string | undefined
            if (a !== undefined && b !== undefined) {
              ;[start, end] = a <= b ? [a, b] : [b, a]
            } else {
              start = a
              end = b
            }
            const filter: {
              actorId?: string
              start?: string
              end?: string
            } = {}
            if (actorId !== undefined) filter.actorId = actorId
            if (start !== undefined) filter.start = start
            if (end !== undefined) filter.end = end
            return { records, filter }
          })
      })

    fc.assert(
      fc.property(recordsAndFilterArb, ({ records, filter }) => {
        const result = filterRecords(records, filter)

        // Reference predicate mirroring the documented matching rule: a record
        // matches when it satisfies every supplied criterion (actor equality,
        // instant >= start, instant <= end). Bounds are compared as instants.
        const startMs =
          filter.start !== undefined ? Date.parse(filter.start) : undefined
        const endMs =
          filter.end !== undefined ? Date.parse(filter.end) : undefined
        const matches = (record: AuditRecord): boolean => {
          if (filter.actorId !== undefined && record.actorId !== filter.actorId) {
            return false
          }
          if (startMs !== undefined || endMs !== undefined) {
            const recordMs = Date.parse(record.timestamp)
            if (Number.isNaN(recordMs)) return false
            if (
              startMs !== undefined &&
              (Number.isNaN(startMs) || recordMs < startMs)
            ) {
              return false
            }
            if (endMs !== undefined && (Number.isNaN(endMs) || recordMs > endMs)) {
              return false
            }
          }
          return true
        }

        const expectedSet = records.filter(matches)

        // Soundness + completeness: the result is exactly the matching records
        // (order-independent — `filterRecords` additionally sorts the matches
        // most-recent-first, which Property 9 covers separately).
        expect(result).toHaveLength(expectedSet.length)
        expect(new Set(result)).toEqual(new Set(expectedSet))

        // Soundness, stated independently: every returned record matches.
        for (const record of result) {
          expect(matches(record)).toBe(true)
        }

        // Completeness, stated independently: every excluded record does not match.
        const returned = new Set(result)
        for (const record of records) {
          if (!returned.has(record)) {
            expect(matches(record)).toBe(false)
          }
        }

        // Non-mutating: a fresh array is returned, the input is untouched.
        expect(result).not.toBe(records)
      }),
      { numRuns: RUNS },
    )
  })
})
