import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { paginate, sortByCreatedDesc, sortByTimestampDesc } from '../shared'
import type { AuditRecord } from '../types'
import { adminOrderArb, auditRecordArb } from './arbitraries'

/**
 * Property tests for the admin-core shared helpers (`paginate`,
 * `sortByCreatedDesc`, `sortByTimestampDesc`).
 *
 * Each property runs a minimum of 100 iterations per the design Testing
 * Strategy.
 */

const RUNS = 100

/**
 * Removes one reference-equal occurrence of each element of `output` from a
 * mutable copy of `input`, returning true iff `output` is exactly a
 * rearrangement of `input` (same elements, same multiplicities, by identity).
 */
function isPermutation<T>(input: readonly T[], output: readonly T[]): boolean {
  if (input.length !== output.length) return false
  const remaining = [...input]
  for (const element of output) {
    const idx = remaining.indexOf(element)
    if (idx === -1) return false
    remaining.splice(idx, 1)
  }
  return remaining.length === 0
}

describe('shared.paginate', () => {
  // Feature: admin-dashboard, Property 8: Pagination preserves and partitions the input
  // Validates: Requirements 3.1, 5.1, 6.1, 9.3
  it('every page holds at most pageSize items, and pages concatenate back to the original list', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 200 }),
        fc.integer({ min: 1, max: 60 }),
        (items, pageSize) => {
          const total = items.length
          const lastPage = Math.max(1, Math.ceil(total / pageSize))

          const reassembled: number[] = []
          for (let page = 1; page <= lastPage; page++) {
            const result = paginate(items, page, pageSize)

            // At most `pageSize` items per page.
            expect(result.items.length).toBeLessThanOrEqual(pageSize)
            // Metadata reflects the request.
            expect(result.page).toBe(page)
            expect(result.pageSize).toBe(pageSize)
            expect(result.total).toBe(total)

            reassembled.push(...result.items)
          }

          // Concatenating pages in order reproduces the input exactly — no
          // duplicates, no omissions, original order preserved.
          expect(reassembled).toEqual(items)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 8: Pagination preserves and partitions the input
  // Validates: Requirements 3.1, 5.1, 6.1, 9.3
  it('clamps out-of-range and non-integer page requests to the nearest valid page', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 200 }),
        fc.integer({ min: 1, max: 60 }),
        // Page requests spanning well below 1 and well beyond the last page,
        // including fractional values that must be floored.
        fc.double({ min: -50, max: 200, noNaN: true }),
        (items, pageSize, requestedPage) => {
          const total = items.length
          const lastPage = Math.max(1, Math.ceil(total / pageSize))
          const expectedPage = Math.min(
            Math.max(1, Math.floor(requestedPage)),
            lastPage,
          )

          const result = paginate(items, requestedPage, pageSize)

          // The reported page is always the clamped, valid page.
          expect(result.page).toBe(expectedPage)
          expect(result.page).toBeGreaterThanOrEqual(1)
          expect(result.page).toBeLessThanOrEqual(lastPage)
          expect(result.pageSize).toBe(pageSize)
          expect(result.total).toBe(total)
          expect(result.items.length).toBeLessThanOrEqual(pageSize)

          // The slice matches the page the request was clamped to.
          const start = (expectedPage - 1) * pageSize
          expect(result.items).toEqual(items.slice(start, start + pageSize))
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 8: Pagination preserves and partitions the input
  // Validates: Requirements 3.1, 5.1, 6.1, 9.3
  it('disables pagination when pageSize < 1, returning a single page with every item', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 200 }),
        fc.integer({ min: -10, max: 0 }),
        fc.integer(),
        (items, pageSize, requestedPage) => {
          const result = paginate(items, requestedPage, pageSize)

          // A single page holding the whole input, in original order.
          expect(result.page).toBe(1)
          expect(result.total).toBe(items.length)
          expect(result.pageSize).toBe(items.length)
          expect(result.items).toEqual(items)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 8: Pagination preserves and partitions the input
  // Validates: Requirements 3.1, 5.1, 6.1, 9.3
  it('does not mutate the input array', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 200 }),
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 1, max: 60 }),
        (items, page, pageSize) => {
          const snapshot = [...items]
          const result = paginate(items, page, pageSize)

          expect(items).toEqual(snapshot)
          // The returned slice is a fresh array, not the input reference.
          expect(result.items).not.toBe(items)
        },
      ),
      { numRuns: RUNS },
    )
  })
})

describe('shared.sortByTimestampDesc / sortByCreatedDesc', () => {
  // Feature: admin-dashboard, Property 9: Descending-timestamp sort is an order-correct permutation
  // Validates: Requirements 5.1, 5.2, 9.3, 9.5
  it('sortByTimestampDesc returns a permutation whose timestamps are non-increasing', () => {
    fc.assert(
      fc.property(
        fc.array(auditRecordArb, { maxLength: 200 }),
        (records: AuditRecord[]) => {
          const sorted = sortByTimestampDesc(records, 'timestamp')

          // It is a rearrangement of exactly the same records.
          expect(isPermutation(records, sorted)).toBe(true)
          // Input is not mutated.
          expect(sorted).not.toBe(records)

          // Timestamps are non-increasing (ISO UTC strings sort chronologically
          // under lexicographic comparison).
          for (let i = 1; i < sorted.length; i++) {
            expect(
              sorted[i - 1].timestamp >= sorted[i].timestamp,
            ).toBe(true)
          }
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 9: Descending-timestamp sort is an order-correct permutation
  // Validates: Requirements 5.1, 5.2, 9.3, 9.5
  it('sortByCreatedDesc returns a permutation whose createdAt timestamps are non-increasing', () => {
    fc.assert(
      fc.property(fc.array(adminOrderArb, { maxLength: 200 }), (orders) => {
        const sorted = sortByCreatedDesc(orders)

        expect(isPermutation(orders, sorted)).toBe(true)
        expect(sorted).not.toBe(orders)

        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1].createdAt >= sorted[i].createdAt).toBe(true)
        }
      }),
      { numRuns: RUNS },
    )
  })
})
