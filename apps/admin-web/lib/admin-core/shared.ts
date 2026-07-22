/**
 * Admin-core shared helpers: pagination, descending-timestamp sorting, and
 * generic filtering.
 *
 * Pure domain logic for the Admin Dashboard. No I/O, no fetch, no cookies, no
 * React — plain typed inputs and outputs. These helpers are reused across the
 * user, order, listing, and audit modules.
 *
 * See design.md "Components and Interfaces" and Correctness Properties 8, 9,
 * and 10.
 */

import type { AdminOrder, Page } from './types'

/**
 * Keys of `T` whose value type is `string`. Used to constrain the sort key of
 * {@link sortByTimestampDesc} to timestamp-bearing (ISO UTC string) fields.
 */
type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never
}[keyof T]

/**
 * Returns a single page slice of `items` together with pagination metadata.
 *
 * Conventions (documented for Property 8 — pagination preserves and partitions
 * the input):
 * - Page numbering is **1-based**. The first page is `page === 1`.
 * - `page` is clamped into the valid range `[1, lastPage]`. Values below 1 or
 *   above the last page resolve to the nearest valid page; non-integer pages
 *   are floored. The returned `page` reflects the clamped value.
 * - With a positive `pageSize`, concatenating the items of pages
 *   `1..ceil(total / pageSize)` in order reproduces `items` exactly — every
 *   page holds at most `pageSize` items, with no duplicates and no omissions.
 * - When `pageSize < 1`, pagination is disabled: a single page containing all
 *   items is returned and the reported `pageSize` is the total count.
 *
 * The input array is never mutated; the returned `items` is a fresh slice.
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): Page<T> {
  const total = items.length

  // pageSize < 1 => pagination disabled: one page with every item.
  if (pageSize < 1) {
    return { items: items.slice(), page: 1, pageSize: total, total }
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const clampedPage = Math.min(Math.max(1, Math.floor(page)), lastPage)
  const startIndex = (clampedPage - 1) * pageSize
  const pageItems = items.slice(startIndex, startIndex + pageSize)

  return { items: pageItems, page: clampedPage, pageSize, total }
}

/**
 * Returns a permutation of `records` sorted by the timestamp at `key` in
 * non-increasing (descending) order.
 *
 * `key` selects the field holding an ISO UTC string; ISO 8601 UTC strings sort
 * chronologically under lexicographic comparison. The sort is stable (records
 * with equal timestamps retain their input order) and non-mutating (the input
 * array is copied first). Satisfies Property 9.
 */
export function sortByTimestampDesc<T>(
  records: readonly T[],
  key: StringKeys<T>,
): T[] {
  return records.slice().sort((a, b) => {
    const av = a[key] as unknown as string
    const bv = b[key] as unknown as string
    if (av < bv) return 1
    if (av > bv) return -1
    return 0
  })
}

/**
 * Convenience wrapper over {@link sortByTimestampDesc} that sorts orders by
 * their `createdAt` timestamp, most recent first. Non-mutating.
 */
export function sortByCreatedDesc(orders: readonly AdminOrder[]): AdminOrder[] {
  return sortByTimestampDesc(orders, 'createdAt')
}

/**
 * Returns exactly the elements of `items` for which `predicate` is true, in
 * input order. Sound and complete (Property 10): every matching element is
 * included and no non-matching element is included. Non-mutating.
 */
export function filterBy<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): T[] {
  return items.filter((item) => predicate(item))
}
