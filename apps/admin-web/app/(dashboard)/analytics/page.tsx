/**
 * Analytics page (Server Component) — Analytics_Module (Requirement 7).
 *
 * Server-first by design: this RSC resolves the active locale, re-checks the
 * acting administrator's `analytics.view` permission (defense in depth), and
 * fetches the default most-recent-30-day summary metrics (Req 7.1) before
 * rendering. Those metrics — total orders, total sales in NPR, active sellers,
 * and active riders, where an active seller/rider has at least one completed
 * order in the period — are passed as the initial state to the
 * {@link AnalyticsDashboard} client island, which owns the date-range
 * selection (Req 7.2), the NPR two-decimal display (Req 7.3), the empty state
 * (Req 7.4), the invalid-range messaging that retains the previously displayed
 * metrics (Req 7.5), and the metrics-load error with a retry control (Req 7.6).
 *
 * The default window is the inclusive 30-day period ending today (today and
 * the preceding 29 days). Aggregation, validation, and NPR formatting are all
 * performed by the pure `lib/admin-core/analytics` helpers behind the
 * `AdminApi`; this page only sequences the initial retrieval and supplies
 * localized labels.
 *
 * Localization (Req 10.1): every user-visible string comes from the
 * `@chinooz/i18n` EN/NE catalogs. Design-system compliance (Req 11.1): all
 * styling uses `@chinooz/theme` token utility classes only.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resources } from '@chinooz/i18n'
import { Heading, Text } from '@chinooz/ui-web'

import { resolveLocale } from '@/lib/admin-core/i18n'
import { canPerform } from '@/lib/admin-core/rbac'
import { readSession } from '@/lib/session'
import {
  fetchMetricsAction,
  type SelectedDateRange,
} from '@/app/actions/analytics'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

/** Number of inclusive days in the default analytics window (Req 7.1). */
const DEFAULT_WINDOW_DAYS = 30

/** Formats a {@link Date} as an ISO `YYYY-MM-DD` calendar day (UTC). */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Builds the default inclusive range — the most recent 30-day period ending
 * today (today plus the preceding 29 days) (Req 7.1).
 */
function defaultRange(now: Date): SelectedDateRange {
  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - (DEFAULT_WINDOW_DAYS - 1))
  return { start: isoDay(startDate), end: isoDay(now) }
}

export default async function AnalyticsPage() {
  // Defense in depth: re-check session + permission even though middleware guards.
  const session = await readSession()
  if (session === null) redirect('/login?next=/analytics')
  if (!canPerform(session.roles, 'analytics.view')) redirect('/forbidden')

  const locale = resolveLocale((await cookies()).get('chinooz-locale')?.value)
  const t = resources[locale].translation.admin
  const analytics = t.analytics

  const initialRange = defaultRange(new Date())

  // Fetch the default 30-day metrics up front (Req 7.1). On a retrieval failure
  // the island renders the load error + retry control (Req 7.6).
  const initial = await fetchMetricsAction(initialRange)
  const initialMetrics = initial.ok ? initial.metrics : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <Heading variant="h2" testID="admin-analytics-title">
          {analytics.title}
        </Heading>
        <Text variant="caption" className="text-text-muted">
          {analytics.subtitle}
        </Text>
      </header>

      <AnalyticsDashboard
        labels={{
          dateRange: analytics.dateRange,
          startDate: analytics.startDate,
          endDate: analytics.endDate,
          apply: analytics.apply,
          metricRevenue: analytics.metricRevenue,
          metricOrders: analytics.metricOrders,
          metricActiveSellers: analytics.metricActiveSellers,
          metricActiveRiders: analytics.metricActiveRiders,
          rangeError: analytics.rangeError,
          empty: analytics.empty,
          error: analytics.error,
          retry: analytics.retry,
        }}
        locale={locale}
        initialRange={initialRange}
        initialMetrics={initialMetrics}
      />
    </div>
  )
}
