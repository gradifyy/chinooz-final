'use server'

/**
 * Analytics server action (Analytics_Module — Requirement 7).
 *
 * This is the orchestration layer described in design.md "Layering Rules" #3
 * for the read-only analytics surface: the action re-checks RBAC via
 * `admin-core/rbac`, validates the selected date range with the pure
 * `admin-core/analytics.validateDateRange` (Req 7.5), normalizes the inclusive
 * range to whole-day instant bounds, and retrieves the aggregated metrics via
 * the injected {@link AdminApi}. All correctness-critical decisions live in the
 * pure `lib/admin-core` helpers; this module only sequences the I/O and maps
 * outcomes to a typed result.
 *
 * It backs both the date-range selection (Req 7.2) and the retry control
 * (Req 7.6): the {@link AnalyticsDashboard} client island calls it on every
 * range change and on retry, and maps each failure reason to a user-facing
 * message while retaining the previously displayed metrics.
 *
 * Authorization is enforced as defense-in-depth: even though `middleware.ts`
 * performs a coarse route-level guard, this action re-checks
 * `rbac.canPerform(roles, 'analytics.view')` before reading any data.
 *
 * Server-side only. TypeScript strict mode, no `any`.
 *
 * _Requirements: 7.1, 7.2, 7.5, 7.6_
 */

import { validateDateRange } from '@/lib/admin-core/analytics'
import { canPerform } from '@/lib/admin-core/rbac'
import type { DateRange, Metrics } from '@/lib/admin-core/types'
import type { AdminApi } from '@/lib/api/types'
import { mockAdminApi } from '@/lib/api/mock'
import { readSession } from '@/lib/session'

/** Permission required to view analytics (held by every operational role). */
const VIEW_PERMISSION = 'analytics.view' as const

/**
 * A date range selected in the UI as inclusive calendar days (ISO `YYYY-MM-DD`
 * strings). The action normalizes these to whole-day instant bounds before
 * aggregation so the inclusive end day is fully covered (Req 7.2).
 */
export interface SelectedDateRange {
  /** Inclusive start day, `YYYY-MM-DD`. */
  start: string
  /** Inclusive end day, `YYYY-MM-DD`. */
  end: string
}

/**
 * Discriminated outcome of {@link fetchMetricsAction}.
 *
 * On success the aggregated {@link Metrics} for the selected range are
 * returned. Every failure carries a coarse `reason` the caller maps to a
 * user-facing message while retaining the previously displayed metrics:
 * - `'unauthenticated'` — no valid admin session (the middleware normally
 *   prevents this; re-checked here as defense-in-depth).
 * - `'forbidden'` — the acting roles lack `analytics.view`.
 * - `'invalid_range'` — the start day is after the end day; the selection is
 *   rejected and the previously displayed metrics are retained (Req 7.5).
 * - `'load_failed'` — retrieval failed; the caller shows an error and presents
 *   a retry control while retaining the previous metrics (Req 7.6).
 */
export type FetchMetricsResult =
  | { ok: true; metrics: Metrics }
  | {
      ok: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_range' | 'load_failed'
    }

/**
 * Resolves the {@link AdminApi} implementation backing the action. Currently
 * the in-memory mock; a real HTTP implementation can be substituted here
 * behind the same interface without touching this action's logic.
 */
function getAdminApi(): AdminApi {
  return mockAdminApi
}

/**
 * Normalizes an inclusive calendar-day selection to instant bounds covering
 * the whole start and end days, so an order at any time on the end day is
 * included in the inclusive range (Req 7.2). The pure aggregation compares
 * instants via `Date.parse`, so a date-only end bound would otherwise exclude
 * same-day orders after midnight.
 */
function toInstantRange(selected: SelectedDateRange): DateRange {
  return {
    start: `${selected.start}T00:00:00.000Z`,
    end: `${selected.end}T23:59:59.999Z`,
  }
}

/**
 * Retrieves aggregated metrics for the selected, inclusive date range on
 * behalf of the current administrator (Req 7.1 / 7.2).
 *
 * Sequence:
 * 1. Read the admin session; reject unauthenticated callers.
 * 2. Re-check RBAC — the acting roles must hold `analytics.view` (defense in
 *    depth).
 * 3. Validate the range with the pure `validateDateRange`; a start day after
 *    the end day is rejected as `invalid_range` (Req 7.5).
 * 4. Normalize to whole-day instant bounds and retrieve metrics via
 *    `AdminApi.analytics.getMetrics`; a retrieval failure is surfaced as
 *    `load_failed` so the caller can present a retry control (Req 7.6).
 *
 * @param selected inclusive `YYYY-MM-DD` start/end day selection
 */
export async function fetchMetricsAction(
  selected: SelectedDateRange,
): Promise<FetchMetricsResult> {
  const session = await readSession()
  if (session === null) {
    return { ok: false, reason: 'unauthenticated' }
  }

  if (!canPerform(session.roles, VIEW_PERMISSION)) {
    return { ok: false, reason: 'forbidden' }
  }

  // Validate the selected range up front (Req 7.5). A start day after the end
  // day is rejected before any retrieval.
  const validation = validateDateRange(selected.start, selected.end)
  if (!validation.ok) {
    return { ok: false, reason: 'invalid_range' }
  }

  const api = getAdminApi()
  const result = await api.analytics.getMetrics(toInstantRange(selected))
  if (!result.ok) {
    return { ok: false, reason: 'load_failed' }
  }

  return { ok: true, metrics: result.data }
}
