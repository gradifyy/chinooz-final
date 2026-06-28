/**
 * RP1 — Rider Performance & Ratings overview mock data.
 *
 * Surfaces:
 * - getRiderPerformance():  headline scorecard (overall rating, acceptance,
 *   completion, on-time, total deliveries) for a period, plus the current
 *   tier badge + a short standing line. Period switch is week / month /
 *   all-time and the figures rescale accordingly so the scorecard stays
 *   glanceable and supportive (never anxiety-inducing).
 * - getRiderPerformanceDetail():  RP2 per-metric breakdown rows (kept here so
 *   the overview can offer an entry point without coupling to a future file).
 *
 * Status colors (good / watch / low) are restrained: the UI maps each metric
 * to one of these bands and the mock carries the band so the screen never
 * infers status from the raw value alone (color is never the only signal).
 *
 * The overview is reachable from Profile (a pushed route, NOT a bottom tab).
 */

import type { RiderTier } from './riderProfile'

export type RiderPerformancePeriodKey = 'week' | 'month' | 'all_time'

export interface RiderPerformanceRange {
  key: RiderPerformancePeriodKey
  /** i18n key for the segmented control label. */
  labelKey: string
}

export type RiderMetricStatus = 'good' | 'watch' | 'low'

export interface RiderPerformanceMetric {
  /** Stable id used for tile keys + analytics. */
  id: 'rating' | 'acceptance' | 'completion' | 'on_time' | 'total_deliveries'
  /** i18n key for the metric label. */
  labelKey: string
  /** Pre-formatted tabular figure, e.g. "4.8", "96%", "1,284". */
  value: string
  /** Raw numeric value for aria + sorting. */
  rawValue: number
  /** i18n key for the unit suffix shown after the value (may be empty). */
  unitKey: string
  /** Restrained status band. Never color-only; the UI adds an icon + word. */
  status: RiderMetricStatus
  /** i18n key for the status word ("Good", "Watch", "Low"). */
  statusWordKey: string
  /** Optional one-line supportive hint (i18n key), shown under the value. */
  hintKey?: string
}

export interface RiderPerformanceTierBadge {
  tier: RiderTier
  /** i18n key for the tier label. */
  labelKey: string
  /** Standing line i18n key, e.g. "You're in good standing". */
  standingKey: string
  /** Whether the rider is currently in good standing. */
  inGoodStanding: boolean
}

export interface RiderPerformanceOverview {
  period: RiderPerformanceRange
  /** Headline metrics for the scorecard (order is stable). */
  metrics: RiderPerformanceMetric[]
  /** Current tier badge + standing line. */
  tier: RiderPerformanceTierBadge
  /** ISO date the period ends (yyyy-mm-dd), for the "as of" caption. */
  asOf: string
  /** Number of rated trips behind the overall rating (for aria + hint). */
  ratingCount: number
}

export interface RiderPerformanceDetailRow {
  id: string
  /** i18n key for the metric label. */
  labelKey: string
  /** Pre-formatted value. */
  value: string
  status: RiderMetricStatus
  /** i18n key for the status word. */
  statusWordKey: string
  /** Optional change vs previous period, e.g. "+2%". */
  delta?: string
}

export interface RiderPerformanceDetail {
  period: RiderPerformanceRange
  rows: RiderPerformanceDetailRow[]
}

export const RIDER_PERFORMANCE_PERIODS: RiderPerformanceRange[] = [
  { key: 'week', labelKey: 'rider.performance.periodWeek' },
  { key: 'month', labelKey: 'rider.performance.periodMonth' },
  { key: 'all_time', labelKey: 'rider.performance.periodAllTime' },
]

/** Map a 0-100 percentage to a restrained status band. */
export function bandForRate(pct: number): RiderMetricStatus {
  if (pct >= 90) return 'good'
  if (pct >= 80) return 'watch'
  return 'low'
}

/** Map a 0-5 rating to a restrained status band. */
export function bandForRating(rating: number): RiderMetricStatus {
  if (rating >= 4.7) return 'good'
  if (rating >= 4.2) return 'watch'
  return 'low'
}

const PERIOD_SCALE: Record<RiderPerformancePeriodKey, number> = {
  week: 1,
  month: 4.3,
  all_time: 52,
}

function fmtPct(n: number): string {
  return `${Math.round(n)}%`
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-IN')
}

function fmtRating(n: number): string {
  return n.toFixed(1)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function getRiderPerformance(
  period: RiderPerformanceRange = RIDER_PERFORMANCE_PERIODS[0],
): Promise<RiderPerformanceOverview> {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 260))

  const scale = PERIOD_SCALE[period.key]

  // Headline figures. Rating is stable across periods (it's a trailing
  // average); rates fluctuate mildly; total deliveries scale with the window.
  const rating = 4.8
  const ratingCount = Math.round(1284 * Math.min(1, scale / 52) * (0.9 + 0.1 * (scale / 52)))

  const acceptancePct = 96
  const completionPct = 94
  const onTimePct = 91
  const totalDeliveries = Math.round(28 * scale * (0.9 + 0.08 * (scale / 52)))

  const metrics: RiderPerformanceMetric[] = [
    {
      id: 'rating',
      labelKey: 'rider.performance.metricRating',
      value: fmtRating(rating),
      rawValue: rating,
      unitKey: 'rider.performance.unitOutOfFive',
      status: bandForRating(rating),
      statusWordKey: 'rider.performance.statusGood',
      hintKey: 'rider.performance.metricRatingHint',
    },
    {
      id: 'acceptance',
      labelKey: 'rider.performance.metricAcceptance',
      value: fmtPct(acceptancePct),
      rawValue: acceptancePct,
      unitKey: 'rider.performance.unitEmpty',
      status: bandForRate(acceptancePct),
      statusWordKey:
        bandForRate(acceptancePct) === 'good'
          ? 'rider.performance.statusGood'
          : bandForRate(acceptancePct) === 'watch'
            ? 'rider.performance.statusWatch'
            : 'rider.performance.statusLow',
      hintKey: 'rider.performance.metricAcceptanceHint',
    },
    {
      id: 'completion',
      labelKey: 'rider.performance.metricCompletion',
      value: fmtPct(completionPct),
      rawValue: completionPct,
      unitKey: 'rider.performance.unitEmpty',
      status: bandForRate(completionPct),
      statusWordKey:
        bandForRate(completionPct) === 'good'
          ? 'rider.performance.statusGood'
          : bandForRate(completionPct) === 'watch'
            ? 'rider.performance.statusWatch'
            : 'rider.performance.statusLow',
      hintKey: 'rider.performance.metricCompletionHint',
    },
    {
      id: 'on_time',
      labelKey: 'rider.performance.metricOnTime',
      value: fmtPct(onTimePct),
      rawValue: onTimePct,
      unitKey: 'rider.performance.unitEmpty',
      status: bandForRate(onTimePct),
      statusWordKey:
        bandForRate(onTimePct) === 'good'
          ? 'rider.performance.statusGood'
          : bandForRate(onTimePct) === 'watch'
            ? 'rider.performance.statusWatch'
            : 'rider.performance.statusLow',
      hintKey: 'rider.performance.metricOnTimeHint',
    },
    {
      id: 'total_deliveries',
      labelKey: 'rider.performance.metricTotalDeliveries',
      value: fmtNum(totalDeliveries),
      rawValue: totalDeliveries,
      unitKey: 'rider.performance.unitDeliveries',
      status: 'good',
      statusWordKey: 'rider.performance.statusGood',
      hintKey: 'rider.performance.metricTotalDeliveriesHint',
    },
  ]

  return {
    period,
    metrics,
    tier: {
      tier: 'gold',
      labelKey: 'rider.profile.tierGold',
      standingKey: 'rider.performance.standingGood',
      inGoodStanding: true,
    },
    asOf: todayISO(),
    ratingCount,
  }
}

export async function getRiderPerformanceDetail(
  period: RiderPerformanceRange = RIDER_PERFORMANCE_PERIODS[0],
): Promise<RiderPerformanceDetail> {
  await new Promise(resolve => setTimeout(resolve, 160 + Math.random() * 200))
  const scale = PERIOD_SCALE[period.key]
  const rows: RiderPerformanceDetailRow[] = [
    {
      id: 'avg_earn_per_trip',
      labelKey: 'rider.performance.detailAvgEarnPerTrip',
      value: `NPR ${fmtNum(165 * (0.95 + 0.05 * (scale / 52)))}`,
      status: 'good',
      statusWordKey: 'rider.performance.statusGood',
      delta: '+3%',
    },
    {
      id: 'avg_pickup_time',
      labelKey: 'rider.performance.detailAvgPickupTime',
      value: '6m 20s',
      status: 'good',
      statusWordKey: 'rider.performance.statusGood',
      delta: '-8%',
    },
    {
      id: 'avg_dropoff_time',
      labelKey: 'rider.performance.detailAvgDropoffTime',
      value: '14m 05s',
      status: 'watch',
      statusWordKey: 'rider.performance.statusWatch',
      delta: '+2%',
    },
    {
      id: 'cancel_rate',
      labelKey: 'rider.performance.detailCancelRate',
      value: fmtPct(4),
      status: 'good',
      statusWordKey: 'rider.performance.statusGood',
      delta: '-1%',
    },
  ]
  return { period, rows }
}
