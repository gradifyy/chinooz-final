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

/**
 * RP2 — per-metric detail + trends.
 *
 * Each metric exposes a definition, a current value vs an honest target/
 * threshold, a trend series over the selected period (for the SD3-style
 * chart), a neutral breakdown of why deliveries did or didn't complete, and a
 * "what affects this" explainer. Targets are visible but framed supportively
 * (not threats); the breakdown is neutral, never blaming the rider.
 */

export type RiderMetricId = RiderPerformanceMetric['id']

export interface RiderMetricTrendPoint {
  /** Bucket label, e.g. "Mon", "W1". */
  label: string
  /** Raw value for this bucket (e.g. 96 for 96%, or 4.8 for rating). */
  value: number
}

export interface RiderMetricBreakdownRow {
  id: string
  /** i18n key for the breakdown label (neutral, non-blaming). */
  labelKey: string
  /** Count of deliveries in this bucket for the period. */
  count: number
  /** Share of the total (0..1). */
  share: number
}

export interface RiderMetricDetail {
  metricId: RiderMetricId
  period: RiderPerformanceRange
  /** i18n key for the metric label (matches the scorecard tile). */
  labelKey: string
  /** i18n key for a plain-language definition of the metric. */
  definitionKey: string
  /** Pre-formatted current value (matches the scorecard). */
  value: string
  rawValue: number
  /** i18n key for the unit suffix. */
  unitKey: string
  status: RiderMetricStatus
  statusWordKey: string
  /** The honest target/threshold for this metric (raw, same scale as value). */
  target: number
  /** Pre-formatted target, e.g. "95%" or "4.7". */
  targetValue: string
  /** i18n key for the target label, e.g. "Target". */
  targetLabelKey: string
  /** i18n key for a one-line target framing (supportive, not a threat). */
  targetFramingKey: string
  /** Whether the current value meets or beats the target. */
  meetsTarget: boolean
  /** Trend series for the SD3-style chart over the selected period. */
  trend: RiderMetricTrendPoint[]
  /** Neutral breakdown (acceptance/completion/cancellation reasons). */
  breakdown: RiderMetricBreakdownRow[]
  /** i18n key for the breakdown section title. */
  breakdownTitleKey: string
  /** Total count the breakdown shares sum to. */
  breakdownTotal: number
  /** i18n key for the "what affects this" explainer body. */
  explainerKey: string
  /** i18n key for the explainer section title. */
  explainerTitleKey: string
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

/** Per-metric config: target, definition, explainer, breakdown shape. */
interface MetricConfig {
  target: number
  targetValue: string
  targetLabelKey: string
  targetFramingKey: string
  definitionKey: string
  explainerKey: string
  explainerTitleKey: string
  breakdownTitleKey: string
  /** Breakdown bucket i18n keys + base counts (scaled by period). */
  breakdown: { id: string; labelKey: string; base: number }[]
}

const METRIC_CONFIG: Record<RiderMetricId, MetricConfig> = {
  rating: {
    target: 4.7,
    targetValue: fmtRating(4.7),
    targetLabelKey: 'rider.performance.detailTargetRating',
    targetFramingKey: 'rider.performance.detailTargetRatingFraming',
    definitionKey: 'rider.performance.detailRatingDef',
    explainerKey: 'rider.performance.detailRatingExplainer',
    explainerTitleKey: 'rider.performance.detailAffectsTitle',
    breakdownTitleKey: 'rider.performance.detailBreakdownRating',
    breakdown: [
      { id: 'five', labelKey: 'rider.performance.detailRatingFive', base: 820 },
      { id: 'four', labelKey: 'rider.performance.detailRatingFour', base: 320 },
      { id: 'three', labelKey: 'rider.performance.detailRatingThree', base: 96 },
      { id: 'two', labelKey: 'rider.performance.detailRatingTwo', base: 32 },
      { id: 'one', labelKey: 'rider.performance.detailRatingOne', base: 16 },
    ],
  },
  acceptance: {
    target: 90,
    targetValue: fmtPct(90),
    targetLabelKey: 'rider.performance.detailTargetAcceptance',
    targetFramingKey: 'rider.performance.detailTargetAcceptanceFraming',
    definitionKey: 'rider.performance.detailAcceptanceDef',
    explainerKey: 'rider.performance.detailAcceptanceExplainer',
    explainerTitleKey: 'rider.performance.detailAffectsTitle',
    breakdownTitleKey: 'rider.performance.detailBreakdownAcceptance',
    breakdown: [
      { id: 'accepted', labelKey: 'rider.performance.detailAcceptAccepted', base: 27 },
      { id: 'declined_far', labelKey: 'rider.performance.detailAcceptDeclinedFar', base: 1 },
      { id: 'declined_busy', labelKey: 'rider.performance.detailAcceptDeclinedBusy', base: 0 },
      { id: 'expired', labelKey: 'rider.performance.detailAcceptExpired', base: 0 },
    ],
  },
  completion: {
    target: 95,
    targetValue: fmtPct(95),
    targetLabelKey: 'rider.performance.detailTargetCompletion',
    targetFramingKey: 'rider.performance.detailTargetCompletionFraming',
    definitionKey: 'rider.performance.detailCompletionDef',
    explainerKey: 'rider.performance.detailCompletionExplainer',
    explainerTitleKey: 'rider.performance.detailAffectsTitle',
    breakdownTitleKey: 'rider.performance.detailBreakdownCompletion',
    breakdown: [
      { id: 'completed', labelKey: 'rider.performance.detailCompleted', base: 27 },
      { id: 'cancelled_rider', labelKey: 'rider.performance.detailCancelledRider', base: 1 },
      { id: 'cancelled_customer', labelKey: 'rider.performance.detailCancelledCustomer', base: 1 },
      { id: 'unreachable', labelKey: 'rider.performance.detailUnreachable', base: 0 },
    ],
  },
  on_time: {
    target: 90,
    targetValue: fmtPct(90),
    targetLabelKey: 'rider.performance.detailTargetOnTime',
    targetFramingKey: 'rider.performance.detailTargetOnTimeFraming',
    definitionKey: 'rider.performance.detailOnTimeDef',
    explainerKey: 'rider.performance.detailOnTimeExplainer',
    explainerTitleKey: 'rider.performance.detailAffectsTitle',
    breakdownTitleKey: 'rider.performance.detailBreakdownOnTime',
    breakdown: [
      { id: 'on_time', labelKey: 'rider.performance.detailOnTimeBucket', base: 25 },
      { id: 'late_traffic', labelKey: 'rider.performance.detailLateTraffic', base: 2 },
      { id: 'late_pickup', labelKey: 'rider.performance.detailLatePickup', base: 1 },
      { id: 'late_dropoff', labelKey: 'rider.performance.detailLateDropoff', base: 0 },
    ],
  },
  total_deliveries: {
    target: 30,
    targetValue: fmtNum(30),
    targetLabelKey: 'rider.performance.detailTargetTotal',
    targetFramingKey: 'rider.performance.detailTargetTotalFraming',
    definitionKey: 'rider.performance.detailTotalDef',
    explainerKey: 'rider.performance.detailTotalExplainer',
    explainerTitleKey: 'rider.performance.detailAffectsTitle',
    breakdownTitleKey: 'rider.performance.detailBreakdownTotal',
    breakdown: [
      { id: 'completed', labelKey: 'rider.performance.detailCompleted', base: 27 },
      { id: 'cancelled', labelKey: 'rider.performance.detailCancelledTotal', base: 2 },
      { id: 'missed', labelKey: 'rider.performance.detailMissed', base: 1 },
    ],
  },
}

/** Trend labels per period (mirrors the earnings chart cadence). */
const TREND_LABELS: Record<RiderPerformancePeriodKey, string[]> = {
  week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  month: ['W1', 'W2', 'W3', 'W4'],
  all_time: ['Q1', 'Q2', 'Q3', 'Q4'],
}

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n * 99.13) * 10000
  return x - Math.floor(x)
}

function metricValueForTrend(metricId: RiderMetricId, i: number, seed: number): number {
  // Each metric wanders around its headline value so the trend looks honest.
  switch (metricId) {
    case 'rating':
      return Math.round((4.6 + seeded(i, seed) * 0.4) * 10) / 10
    case 'acceptance':
      return Math.round(90 + seeded(i, seed) * 10)
    case 'completion':
      return Math.round(88 + seeded(i, seed) * 10)
    case 'on_time':
      return Math.round(84 + seeded(i, seed) * 12)
    case 'total_deliveries':
      return Math.round(3 + seeded(i, seed) * 6)
  }
}

export async function getRiderMetricDetail(
  metricId: RiderMetricId,
  period: RiderPerformanceRange = RIDER_PERFORMANCE_PERIODS[0],
): Promise<RiderMetricDetail> {
  await new Promise(resolve => setTimeout(resolve, 180 + Math.random() * 220))

  const cfg = METRIC_CONFIG[metricId]
  const scale = PERIOD_SCALE[period.key]
  const seed = metricId.length + period.key.length

  // Headline current value (matches the overview for consistency).
  let rawValue: number
  let value: string
  let unitKey: string
  let status: RiderMetricStatus
  let statusWordKey: string
  switch (metricId) {
    case 'rating':
      rawValue = 4.8
      value = fmtRating(rawValue)
      unitKey = 'rider.performance.unitOutOfFive'
      status = bandForRating(rawValue)
      statusWordKey = 'rider.performance.statusGood'
      break
    case 'acceptance':
      rawValue = 96
      value = fmtPct(rawValue)
      unitKey = 'rider.performance.unitEmpty'
      status = bandForRate(rawValue)
      statusWordKey = 'rider.performance.statusGood'
      break
    case 'completion':
      rawValue = 94
      value = fmtPct(rawValue)
      unitKey = 'rider.performance.unitEmpty'
      status = bandForRate(rawValue)
      statusWordKey = 'rider.performance.statusGood'
      break
    case 'on_time':
      rawValue = 91
      value = fmtPct(rawValue)
      unitKey = 'rider.performance.unitEmpty'
      status = bandForRate(rawValue)
      statusWordKey = 'rider.performance.statusGood'
      break
    case 'total_deliveries':
      rawValue = Math.round(28 * scale * (0.9 + 0.08 * (scale / 52)))
      value = fmtNum(rawValue)
      unitKey = 'rider.performance.unitDeliveries'
      status = 'good'
      statusWordKey = 'rider.performance.statusGood'
      break
  }

  // Trend series.
  const labels = TREND_LABELS[period.key]
  const trend: RiderMetricTrendPoint[] = labels.map((label, i) => ({
    label,
    value: metricValueForTrend(metricId, i, seed),
  }))

  // Breakdown — counts scale with the period; shares are relative.
  const breakdown = cfg.breakdown.map(b => {
    const count = Math.max(0, Math.round(b.base * scale * (0.9 + 0.1 * (scale / 52))))
    return { id: b.id, labelKey: b.labelKey, count, share: 0 }
  })
  const breakdownTotal = breakdown.reduce((s, b) => s + b.count, 0) || 1
  breakdown.forEach(b => {
    b.share = Math.round((b.count / breakdownTotal) * 100) / 100
  })

  // For percentage metrics the "total" is the delivery count, not 100.
  const displayBreakdownTotal =
    metricId === 'rating' ? breakdownTotal : breakdownTotal

  const meetsTarget =
    metricId === 'total_deliveries' ? rawValue >= cfg.target : rawValue >= cfg.target

  return {
    metricId,
    period,
    labelKey: `rider.performance.metric${
      metricId === 'on_time'
        ? 'OnTime'
        : metricId === 'total_deliveries'
          ? 'TotalDeliveries'
          : metricId.charAt(0).toUpperCase() + metricId.slice(1)
    }`,
    definitionKey: cfg.definitionKey,
    value,
    rawValue,
    unitKey,
    status,
    statusWordKey,
    target: cfg.target,
    targetValue: cfg.targetValue,
    targetLabelKey: cfg.targetLabelKey,
    targetFramingKey: cfg.targetFramingKey,
    meetsTarget,
    trend,
    breakdown,
    breakdownTitleKey: cfg.breakdownTitleKey,
    breakdownTotal: displayBreakdownTotal,
    explainerKey: cfg.explainerKey,
    explainerTitleKey: cfg.explainerTitleKey,
  }
}
