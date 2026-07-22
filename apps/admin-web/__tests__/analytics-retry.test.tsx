import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resources } from '@chinooz/i18n'

import type { Metrics } from '@/lib/admin-core/types'
import type { FetchMetricsResult } from '@/app/actions/analytics'

/**
 * Component / render test for the analytics error + retry surface (task 19.11).
 *
 * Requirement 7.6: when metrics retrieval fails the dashboard shows an error
 * message and presents a retry control while retaining the previously displayed
 * metrics; retry re-attempts the last applied range.
 *
 * The `AnalyticsDashboard` client island is rendered with `initialMetrics:
 * null`, the state the server page passes when the initial 30-day load failed.
 * The island's only non-pure dependency — the `fetchMetricsAction` server
 * action — is replaced with a controllable double so the retry path can be
 * driven deterministically.
 *
 * Validates: Requirements 7.6
 */

const mocks = vi.hoisted(() => ({
  fetchMetricsAction:
    vi.fn<(range: { start: string; end: string }) => Promise<FetchMetricsResult>>(),
}))

vi.mock('@/app/actions/analytics', () => ({
  fetchMetricsAction: mocks.fetchMetricsAction,
}))

import AnalyticsDashboard from '../components/AnalyticsDashboard'

const labels = (() => {
  const a = resources.en.translation.admin.analytics
  return {
    dateRange: a.dateRange,
    startDate: a.startDate,
    endDate: a.endDate,
    apply: a.apply,
    metricRevenue: a.metricRevenue,
    metricOrders: a.metricOrders,
    metricActiveSellers: a.metricActiveSellers,
    metricActiveRiders: a.metricActiveRiders,
    rangeError: a.rangeError,
    empty: a.empty,
    error: a.error,
    retry: a.retry,
  }
})()

const INITIAL_RANGE = { start: '2024-01-01', end: '2024-01-30' }

const SAMPLE_METRICS: Metrics = {
  totalOrders: 12,
  totalSalesPaisa: 4_500_000,
  activeSellers: 3,
  activeRiders: 2,
}

beforeEach(() => {
  mocks.fetchMetricsAction.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('analytics metrics load error + retry (Req 7.6)', () => {
  it('shows the error message and a retry control when initial metrics failed to load', () => {
    render(
      <AnalyticsDashboard
        labels={labels}
        locale="en"
        initialRange={INITIAL_RANGE}
        initialMetrics={null}
      />,
    )

    const errorRegion = screen.getByTestId('admin-analytics-error')
    expect(errorRegion).toBeInTheDocument()
    expect(errorRegion).toHaveTextContent(labels.error)
    // The retry control is present.
    expect(screen.getByTestId('admin-analytics-retry')).toBeInTheDocument()
    // No metrics are shown while the load failed.
    expect(screen.queryByTestId('admin-analytics-metrics')).toBeNull()
  })

  it('re-attempts the last range and clears the error when retry succeeds', async () => {
    mocks.fetchMetricsAction.mockResolvedValue({
      ok: true,
      metrics: SAMPLE_METRICS,
    })

    render(
      <AnalyticsDashboard
        labels={labels}
        locale="en"
        initialRange={INITIAL_RANGE}
        initialMetrics={null}
      />,
    )

    await userEvent.click(screen.getByTestId('admin-analytics-retry'))

    // Retry re-attempts the last applied range (the initial 30-day window).
    await waitFor(() => {
      expect(mocks.fetchMetricsAction).toHaveBeenCalledWith(INITIAL_RANGE)
    })

    // On success the error clears and the metrics are shown.
    await waitFor(() => {
      expect(screen.queryByTestId('admin-analytics-error')).toBeNull()
    })
    expect(screen.getByTestId('admin-analytics-metrics')).toBeInTheDocument()
    expect(screen.getByTestId('admin-analytics-metric-orders')).toHaveTextContent(
      '12',
    )
  })

  it('keeps the error and retry control visible when retry fails again', async () => {
    mocks.fetchMetricsAction.mockResolvedValue({
      ok: false,
      reason: 'load_failed',
    })

    render(
      <AnalyticsDashboard
        labels={labels}
        locale="en"
        initialRange={INITIAL_RANGE}
        initialMetrics={null}
      />,
    )

    await userEvent.click(screen.getByTestId('admin-analytics-retry'))

    await waitFor(() => {
      expect(mocks.fetchMetricsAction).toHaveBeenCalledWith(INITIAL_RANGE)
    })

    // The error message and retry control remain available for another attempt.
    expect(screen.getByTestId('admin-analytics-error')).toBeInTheDocument()
    expect(screen.getByTestId('admin-analytics-retry')).toBeInTheDocument()
  })
})
