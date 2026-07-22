/**
 * Admin-core analytics domain logic.
 *
 * Pure helpers backing the Analytics_Module (Requirement 7). No I/O, no React,
 * no cookies, no fetch — plain typed inputs and outputs. Metrics retrieval,
 * the default 30-day window selection, latency, retry, and the
 * error/retry-control UI live in the surrounding page / `AdminApi` layer; this
 * module only validates a selected date range, aggregates order metrics over an
 * inclusive range, formats monetary metrics in NPR with exactly two decimals,
 * and reports whether a metrics result is empty.
 *
 * Date-range bounds and order `createdAt` timestamps are ISO strings compared
 * as instants via `Date.parse`, so inclusivity is well-defined irrespective of
 * bound precision (consistent with `audit.ts`'s `filterRecords` /
 * `validateAuditDateRange`). Monetary values are integer paisa; NPR display
 * strings are derived via `formatNPRFromPaisa` from `@chinooz/utils`
 * (Req 7.3).
 *
 * See design.md "Analytics_Module" / `lib/admin-core/analytics` and
 * Correctness Properties 13, 19, and 22.
 */

import { PAISA_PER_NPR, formatNPRFromPaisa } from '@chinooz/utils'

import type { AdminOrder, DateRange, Metrics } from './types'

/**
 * Locale selector for NPR formatting. Mirrors the `CurrencyLocale` accepted by
 * `formatNPRFromPaisa` in `@chinooz/utils` (`'en'` renders `NPR …`, `'ne'`
 * renders `रु. …` with Devanagari digits). Declared locally to match the
 * pattern used by `orders.ts`.
 */
export type CurrencyLocale = 'en' | 'ne'

// ---------------------------------------------------------------------------
// Date-range validation (Req 7.5 — Property 13)
// ---------------------------------------------------------------------------

/**
 * Outcome of {@link validateDateRange}. The range is accepted (`ok: true`)
 * exactly when its start is on or before its end; otherwise it is rejected
 * with the `'start_after_end'` reason so the caller can surface an
 * invalid-range error and retain the previously displayed metrics (Req 7.5).
 */
export type DateRangeValidation =
  | { ok: true }
  | { ok: false; reason: 'start_after_end' }

/**
 * Validates an inclusive analytics date range (Property 13).
 *
 * Returns `{ ok: true }` if and only if `start` is on or before `end`;
 * otherwise returns `{ ok: false, reason: 'start_after_end' }` (Req 7.5).
 * `start` and `end` are ISO date (or datetime) strings, compared as instants
 * via `Date.parse` so a boundary where start equals end is accepted. Pure and
 * non-mutating.
 */
export function validateDateRange(
  start: string,
  end: string,
): DateRangeValidation {
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (startMs > endMs) {
    return { ok: false, reason: 'start_after_end' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Metrics aggregation (Req 7.1 / 7.2 — Property 22)
// ---------------------------------------------------------------------------

/** Order status that counts toward analytics metrics (Req 7.1 / 7.2). */
const COMPLETED_STATUS = 'completed'

/**
 * Returns true when `order` is completed and its `createdAt` instant lies
 * within the inclusive `[range.start, range.end]` bounds. Bounds and the
 * order timestamp are compared via `Date.parse`; orders dated exactly on the
 * start or end boundary are included, and orders outside the range are
 * excluded (Req 7.2). An order or bound with an unparseable timestamp is
 * treated as outside the range.
 */
function isCompletedInRange(order: AdminOrder, range: DateRange): boolean {
  if (order.status !== COMPLETED_STATUS) return false
  const orderMs = Date.parse(order.createdAt)
  if (Number.isNaN(orderMs)) return false
  const startMs = Date.parse(range.start)
  const endMs = Date.parse(range.end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false
  return orderMs >= startMs && orderMs <= endMs
}

/**
 * Aggregates operational and financial metrics over the inclusive date
 * `range` (Property 22).
 *
 * Only orders with `completed` status whose `createdAt` falls within the
 * inclusive range contribute to the result. From those completed-in-range
 * orders:
 * - `totalOrders` — their count (Req 7.1).
 * - `totalSalesPaisa` — the sum of their integer-paisa `totalPaisa` (Req 7.1).
 * - `activeSellers` — the number of distinct seller ids among them; an active
 *   seller has at least one completed order in the range (Req 7.1 / 7.2).
 * - `activeRiders` — the number of distinct rider ids among them, counting
 *   only orders that have an assigned rider (Req 7.1 / 7.2).
 *
 * Orders dated exactly on the start or end boundary are included; orders
 * outside the range are excluded. This function operates strictly over the
 * supplied range — the default 30-day window is the caller's concern. Pure and
 * non-mutating; the input orders are not modified.
 */
export function aggregateMetrics(
  orders: readonly AdminOrder[],
  range: DateRange,
): Metrics {
  const sellerIds = new Set<string>()
  const riderIds = new Set<string>()
  let totalOrders = 0
  let totalSalesPaisa = 0

  for (const order of orders) {
    if (!isCompletedInRange(order, range)) continue
    totalOrders += 1
    totalSalesPaisa += order.totalPaisa
    sellerIds.add(order.seller.id)
    if (order.rider !== undefined) {
      riderIds.add(order.rider.id)
    }
  }

  return {
    totalOrders,
    totalSalesPaisa,
    activeSellers: sellerIds.size,
    activeRiders: riderIds.size,
  }
}

// ---------------------------------------------------------------------------
// NPR metric formatting (Req 7.3 — Property 19)
// ---------------------------------------------------------------------------

/**
 * Formats an integer-paisa monetary metric as an NPR string with **exactly**
 * two decimal places (Property 19).
 *
 * Builds on `formatNPRFromPaisa` from `@chinooz/utils`, so the result begins
 * with the locale's NPR prefix (`NPR ` for `'en'`, `रु. ` for `'ne'`) and uses
 * locale-appropriate digits and grouping. `formatNPRFromPaisa` renders zero
 * decimals for whole-rupee amounts and exactly two otherwise; this helper
 * appends a locale-appropriate `.00` to whole-rupee amounts so a metric is
 * always displayed with two decimal places (Req 7.3). Pure and non-mutating.
 */
export function formatMetricNPR(
  paisa: number,
  locale: CurrencyLocale = 'en',
): string {
  const base = formatNPRFromPaisa(paisa, locale)
  const isWholeRupee = Math.round(paisa) % PAISA_PER_NPR === 0
  if (!isWholeRupee) {
    // formatNPRFromPaisa already rendered exactly two decimal places.
    return base
  }
  const zeroDecimals = locale === 'ne' ? '.००' : '.00'
  return `${base}${zeroDecimals}`
}

// ---------------------------------------------------------------------------
// Empty-state detection (Req 7.4)
// ---------------------------------------------------------------------------

/**
 * Returns true when a {@link Metrics} result carries no data, driving the
 * empty-state message for the selected date range (Req 7.4).
 *
 * A metrics result is empty when there are no completed orders in the range —
 * i.e. `totalOrders`, `totalSalesPaisa`, `activeSellers`, and `activeRiders`
 * are all zero. Pure and non-mutating.
 */
export function isEmptyMetrics(metrics: Metrics): boolean {
  return (
    metrics.totalOrders === 0 &&
    metrics.totalSalesPaisa === 0 &&
    metrics.activeSellers === 0 &&
    metrics.activeRiders === 0
  )
}
