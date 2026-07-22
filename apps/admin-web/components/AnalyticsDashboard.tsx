'use client'

/**
 * Analytics dashboard (client island) — Analytics_Module (Requirement 7).
 *
 * The interactive surface of the analytics route. The surrounding page is a
 * Server Component that fetches the default most-recent-30-day metrics
 * (Req 7.1) and passes them in as the initial state; this island owns the
 * date-range selection, the invalid-range messaging, the retry control, and
 * the empty state:
 *
 * - Date-range selection (Req 7.2): picking a start/end day and applying it
 *   re-fetches metrics for the inclusive range via the `fetchMetricsAction`
 *   server action.
 * - NPR two-decimal display (Req 7.3): the monetary metric is rendered with the
 *   pure `formatMetricNPR`, which always emits exactly two decimal places.
 * - Empty state (Req 7.4): when the retrieved metrics carry no data
 *   (`isEmptyMetrics`), an empty-state message is shown for the selected range.
 * - Invalid range (Req 7.5): when the start day is after the end day, the
 *   selection is rejected with an error message and the previously displayed
 *   metrics are retained (no fetch is issued).
 * - Load error + retry (Req 7.6): when retrieval fails, an error message and a
 *   retry control are shown while the previously displayed metrics are
 *   retained; retry re-attempts the last applied range.
 *
 * The range validity check reuses the pure `validateDateRange` from
 * `lib/admin-core` — the single source of truth, never re-encoded here. Every
 * user-visible string is resolved against `@chinooz/i18n` by the server page
 * and passed in as props, so this island holds no hard-coded strings
 * (Req 10.1). Presentation uses `@chinooz/ui-web` primitives and
 * `@chinooz/theme` token utility classes only — no hard-coded
 * color/dimension literals (Req 11.1).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
 */

import { useState, useTransition } from 'react'
import { Button, Card, EmptyState, Heading, Text } from '@chinooz/ui-web'

import {
  type CurrencyLocale,
  formatMetricNPR,
  isEmptyMetrics,
  validateDateRange,
} from '@/lib/admin-core/analytics'
import type { Metrics } from '@/lib/admin-core/types'
import {
  fetchMetricsAction,
  type SelectedDateRange,
} from '@/app/actions/analytics'

interface AnalyticsLabels {
  /** Label for the date-range fieldset. */
  dateRange: string
  /** Label for the start-day field. */
  startDate: string
  /** Label for the end-day field. */
  endDate: string
  /** Apply-selection button label. */
  apply: string
  /** Monetary (total revenue) metric label. */
  metricRevenue: string
  /** Total-orders metric label. */
  metricOrders: string
  /** Active-sellers metric label. */
  metricActiveSellers: string
  /** Active-riders metric label. */
  metricActiveRiders: string
  /** Invalid-range error message, shown when start day is after end day (Req 7.5). */
  rangeError: string
  /** Empty-state message for a range with no data (Req 7.4). */
  empty: string
  /** Metrics-load error message (Req 7.6). */
  error: string
  /** Retry-control label (Req 7.6). */
  retry: string
}

interface AnalyticsDashboardProps {
  /** Pre-localized, user-visible labels resolved by the server page. */
  labels: AnalyticsLabels
  /** Active locale, used for NPR metric formatting (Req 7.3). */
  locale: CurrencyLocale
  /** Default inclusive range (`YYYY-MM-DD`) — the most-recent-30-day window. */
  initialRange: SelectedDateRange
  /**
   * The server-fetched default metrics, or `null` when the initial retrieval
   * failed (the island then shows the load error + retry control, Req 7.6).
   */
  initialMetrics: Metrics | null
}

/** Transient UI status driving which message (if any) is shown. */
type Status = 'idle' | 'invalid_range' | 'load_error'

export default function AnalyticsDashboard({
  labels,
  locale,
  initialRange,
  initialMetrics,
}: AnalyticsDashboardProps) {
  const [start, setStart] = useState(initialRange.start)
  const [end, setEnd] = useState(initialRange.end)
  // The currently displayed metrics. Retained across an invalid range (Req 7.5)
  // and a load error (Req 7.6) so the last good metrics stay on screen.
  const [metrics, setMetrics] = useState<Metrics | null>(initialMetrics)
  const [status, setStatus] = useState<Status>(
    initialMetrics === null ? 'load_error' : 'idle',
  )
  // The last range a fetch was attempted for, so the retry control can re-issue
  // exactly that request (Req 7.6).
  const [lastRange, setLastRange] = useState<SelectedDateRange>(initialRange)
  const [isPending, startTransition] = useTransition()

  function load(range: SelectedDateRange) {
    setLastRange(range)
    startTransition(async () => {
      const result = await fetchMetricsAction(range)
      if (result.ok) {
        setMetrics(result.metrics)
        setStatus('idle')
        return
      }
      // Retain the previously displayed metrics on every failure.
      setStatus(result.reason === 'invalid_range' ? 'invalid_range' : 'load_error')
    })
  }

  function handleApply() {
    // Reuse the pure validator (single source of truth for start ≤ end). An
    // invalid range is rejected without a fetch and the metrics are retained
    // (Req 7.5).
    const validation = validateDateRange(start, end)
    if (!validation.ok) {
      setStatus('invalid_range')
      return
    }
    load({ start, end })
  }

  const showEmpty = metrics !== null && isEmptyMetrics(metrics)

  return (
    <div className="flex flex-col gap-6">
      {/* Date-range selection (Req 7.2). */}
      <fieldset className="flex flex-wrap items-end gap-4 rounded-2xl border border-border-light bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-text">
          {labels.dateRange}
        </legend>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">{labels.startDate}</span>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary"
            data-testid="admin-analytics-start"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">{labels.endDate}</span>
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary"
            data-testid="admin-analytics-end"
          />
        </label>
        <Button
          variant="primary"
          size="md"
          disabled={isPending}
          loading={isPending}
          onPress={handleApply}
          testID="admin-analytics-apply"
        >
          {labels.apply}
        </Button>
      </fieldset>

      {/* Invalid-range error (Req 7.5) — metrics below are retained. */}
      {status === 'invalid_range' && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error/15 px-3 py-2 text-sm text-error"
          data-testid="admin-analytics-range-error"
        >
          {labels.rangeError}
        </p>
      )}

      {/* Metrics-load error + retry control (Req 7.6) — metrics retained. */}
      {status === 'load_error' && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error bg-error/15 px-3 py-2"
          data-testid="admin-analytics-error"
        >
          <Text variant="caption" className="text-error">
            {labels.error}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            loading={isPending}
            onPress={() => load(lastRange)}
            testID="admin-analytics-retry"
          >
            {labels.retry}
          </Button>
        </div>
      )}

      {/* Empty state (Req 7.4). */}
      {showEmpty ? (
        <EmptyState title={labels.empty} testID="admin-analytics-empty" />
      ) : metrics !== null ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="admin-analytics-metrics"
        >
          <MetricCard
            label={labels.metricRevenue}
            value={formatMetricNPR(metrics.totalSalesPaisa, locale)}
            testID="admin-analytics-metric-revenue"
          />
          <MetricCard
            label={labels.metricOrders}
            value={String(metrics.totalOrders)}
            testID="admin-analytics-metric-orders"
          />
          <MetricCard
            label={labels.metricActiveSellers}
            value={String(metrics.activeSellers)}
            testID="admin-analytics-metric-sellers"
          />
          <MetricCard
            label={labels.metricActiveRiders}
            value={String(metrics.activeRiders)}
            testID="admin-analytics-metric-riders"
          />
        </div>
      ) : null}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  testID: string
}

/** A single summary-metric tile. */
function MetricCard({ label, value, testID }: MetricCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-2" data-testid={testID}>
        <Text variant="caption" className="text-text-muted">
          {label}
        </Text>
        <Heading variant="h3">{value}</Heading>
      </div>
    </Card>
  )
}
