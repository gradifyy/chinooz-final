import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Svg, {
  Path,
  Circle as SvgCircle,
  Rect,
  Line as SvgLine,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
} from 'react-native-svg'
import { colors } from '../../lib/theme'
import type {
  SellerKpi,
  SellerKpiKey,
  SellerChartPoint,
  SellerDateRange,
  SellerDateRangeKey,
} from '@chinooz/mock-data'
import { useA11y } from '../A11yProvider'
import { DateRangeSelector } from './DateRangeSelector'
import { styles, HERO_CHART_W, HERO_CHART_H, HC_PAD_L, HC_PAD_R, HC_PAD_T, HC_PAD_B } from './styles'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** Animated count-up for the revenue figure (cubic-eased). Disabled under reduced motion. */
function useCountUp(target: number, enabled: boolean, durationMs = 700): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = Date.now()
    let raf: ReturnType<typeof setInterval> | null = null
    raf = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      setValue(target * (1 - Math.pow(1 - t, 3)))
      if (t >= 1 && raf) clearInterval(raf)
    }, 16)
    return () => {
      if (raf) clearInterval(raf)
    }
  }, [target, enabled, durationMs])
  return value
}

/** Smooth cubic-bezier line (midpoint control points — no overshoot, Apple-Stocks-like). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cx = (prev.x + curr.x) / 2
    d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

function comparisonCaption(range: SellerDateRange, t: Translate): string {
  switch (range.key) {
    case 'today':
      return t('seller.dashboard.heroCompareYesterday')
    case '7d':
      return t('seller.dashboard.heroComparePrevDays', { days: 7 })
    case '30d':
      return t('seller.dashboard.heroComparePrevDays', { days: 30 })
    case '90d':
      return t('seller.dashboard.heroComparePrevDays', { days: 90 })
    case 'year':
      return t('seller.dashboard.heroComparePrevYear')
    default:
      return t('seller.dashboard.heroComparePrevDays', { days: range.days })
  }
}

const METRIC_LABEL_KEYS: { key: SellerKpiKey; labelKey: string }[] = [
  { key: 'orders', labelKey: 'seller.dashboard.heroMetricOrders' },
  { key: 'units', labelKey: 'seller.dashboard.heroMetricUnits' },
  { key: 'aov', labelKey: 'seller.dashboard.heroMetricAov' },
  { key: 'conversion', labelKey: 'seller.dashboard.heroMetricConversion' },
]

function AnalyticsHeroSkeleton() {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroSkLabel} />
      <View style={styles.heroSkValue} />
      <View style={styles.heroSkTrend} />
      <View style={styles.heroSkChart} />
      <View style={styles.heroSkRange} />
      <View style={styles.heroSkMetrics}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.heroSkMetric, i > 0 && styles.heroSkMetricDivided]}>
            <View style={styles.heroSkMetricLabel} />
            <View style={styles.heroSkMetricValue} />
          </View>
        ))}
      </View>
    </View>
  )
}

export const AnalyticsHero = React.memo(function AnalyticsHero({
  kpis,
  chart,
  range,
  onRangeChange,
  loading,
  refreshing,
  t,
}: {
  kpis: SellerKpi[]
  chart: SellerChartPoint[]
  range: SellerDateRange
  onRangeChange: (key: SellerDateRangeKey) => void
  loading: boolean
  refreshing: boolean
  t: Translate
}) {
  const { reducedMotion } = useA11y()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [drawProgress, setDrawProgress] = useState(reducedMotion ? 1 : 0)

  const find = (key: SellerKpiKey) => kpis.find(k => k.key === key)
  const revenueKpi = find('revenue')

  const animatedRevenue = useCountUp(revenueKpi?.numericValue ?? 0, !reducedMotion && !loading)
  const revenueNum = Math.round(animatedRevenue).toLocaleString()
  const revenuePrefix = revenueKpi?.prefix

  const trend = revenueKpi?.trend ?? 'flat'
  const deltaPct = revenueKpi?.deltaPct ?? 0
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.textMuted
  const caret = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'
  const deltaText = `${deltaPct > 0 ? '+' : ''}${deltaPct}%`
  const caption = comparisonCaption(range, t)

  const values = useMemo(() => chart.map(p => p.revenue), [chart])
  const maxVal = Math.max(1, ...values)
  const allZero = values.length === 0 || values.every(v => v === 0)

  const coords = useMemo(() => {
    const innerW = HERO_CHART_W - HC_PAD_L - HC_PAD_R
    const innerH = HERO_CHART_H - HC_PAD_T - HC_PAD_B
    const n = chart.length
    return chart.map((p, i) => {
      const x = HC_PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const y = HC_PAD_T + innerH - (p.revenue / maxVal) * innerH
      return { x, y, p }
    })
  }, [chart, maxVal])

  const linePath = useMemo(() => smoothPath(coords.map(c => ({ x: c.x, y: c.y }))), [coords])
  const areaPath = useMemo(() => {
    if (coords.length === 0) return ''
    const base = HERO_CHART_H - HC_PAD_B
    return `${linePath} L ${coords[coords.length - 1].x} ${base} L ${coords[0].x} ${base} Z`
  }, [linePath, coords])

  useEffect(() => {
    if (reducedMotion || allZero) {
      setDrawProgress(1)
      return
    }
    setDrawProgress(0)
    const start = Date.now()
    const dur = 750
    const raf = setInterval(() => {
      const tt = Math.min(1, (Date.now() - start) / dur)
      setDrawProgress(1 - Math.pow(1 - tt, 3))
      if (tt >= 1) clearInterval(raf)
    }, 16)
    return () => clearInterval(raf)
  }, [linePath, reducedMotion, allZero])

  const markerScale = allZero ? 0 : Math.min(1, Math.max(0, (drawProgress - 0.55) / 0.45))
  const revealWidth = HERO_CHART_W * drawProgress

  const chartAriaSummary = useMemo(() => {
    if (allZero) return t('seller.dashboard.chartEmpty')
    return t('seller.dashboard.chartAriaSummary', {
      metric: t('seller.dashboard.kpiRevenue'),
      range: range.label,
      from: `NPR ${Math.min(...values).toLocaleString()}`,
      to: `NPR ${Math.max(...values).toLocaleString()}`,
    })
  }, [allZero, values, range.label, t])

  if (loading) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={t('seller.dashboard.heroLoading')}
        aria-busy
      >
        <AnalyticsHeroSkeleton />
      </View>
    )
  }

  const hovered = hoverIdx != null ? chart[hoverIdx] : null

  return (
    <View style={[styles.heroCard, refreshing && { opacity: 0.6 }]}>
      <Text style={styles.heroEyebrow}>{t('seller.dashboard.kpiRevenue')}</Text>

      <View style={styles.heroValueRow}>
        {revenuePrefix && <Text style={styles.heroPrefix}>{revenuePrefix}</Text>}
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {revenueNum}
        </Text>
      </View>

      <View style={styles.heroTrendRow}>
        <Text style={[styles.heroTrendCaret, { color: trendColor }]} accessibilityElementsHidden>
          {caret}
        </Text>
        <Text style={[styles.heroTrendDelta, { color: trendColor }]}>{deltaText}</Text>
        <Text style={styles.heroTrendCaption}>{caption}</Text>
      </View>

      {allZero ? (
        <View style={styles.heroEmpty}>
          <Text style={styles.heroEmptyText}>{t('seller.dashboard.chartEmpty')}</Text>
          <Text style={styles.heroEmptySub}>{t('seller.dashboard.chartEmptySub')}</Text>
        </View>
      ) : (
        <View style={styles.heroChartWrap} accessibilityLabel={chartAriaSummary} accessibilityRole="image">
          <Svg width="100%" height={HERO_CHART_H} viewBox={`0 0 ${HERO_CHART_W} ${HERO_CHART_H}`}>
            <Defs>
              <ClipPath id="heroReveal">
                <Rect x={0} y={0} width={revealWidth} height={HERO_CHART_H} />
              </ClipPath>
              <LinearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.16} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {areaPath !== '' && <Path d={areaPath} fill="url(#heroArea)" clipPath="url(#heroReveal)" />}

            <Path
              d={linePath}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#heroReveal)"
            />

            {hoverIdx != null && coords[hoverIdx] && (
              <>
                <SvgLine
                  x1={coords[hoverIdx].x}
                  x2={coords[hoverIdx].x}
                  y1={HC_PAD_T}
                  y2={HERO_CHART_H - HC_PAD_B}
                  stroke={colors.primary}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  opacity={0.35}
                />
                <SvgCircle
                  cx={coords[hoverIdx].x}
                  cy={coords[hoverIdx].y}
                  r={5}
                  fill={colors.white}
                  stroke={colors.primary}
                  strokeWidth={2.5}
                />
              </>
            )}

            {coords.length > 0 && hoverIdx == null && markerScale > 0.01 && (
              <>
                <SvgCircle
                  cx={coords[coords.length - 1].x}
                  cy={coords[coords.length - 1].y}
                  r={7 * markerScale}
                  fill={colors.primary}
                  opacity={0.18}
                />
                <SvgCircle
                  cx={coords[coords.length - 1].x}
                  cy={coords[coords.length - 1].y}
                  r={3.5 * markerScale}
                  fill={colors.primary}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
              </>
            )}
          </Svg>

          <View style={styles.heroChartTouchLayer}>
            {coords.map((c, i) => (
              <TouchableOpacity
                key={'hit' + i}
                accessibilityRole="button"
                accessibilityLabel={`${c.p.label}: NPR ${c.p.revenue.toLocaleString()}`}
                onPressIn={() => setHoverIdx(i)}
                onPressOut={() => setHoverIdx(null)}
                style={[
                  styles.heroChartTouchPoint,
                  { left: `${(c.x / HERO_CHART_W) * 100}%`, top: `${(c.y / HERO_CHART_H) * 100}%` },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {hovered && !allZero && (
        <View style={styles.heroTooltip} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View style={styles.heroTooltipDot} />
          <Text style={styles.heroTooltipValue}>NPR {hovered.revenue.toLocaleString()}</Text>
          <Text style={styles.heroTooltipDate}>{hovered.label}</Text>
        </View>
      )}

      <View style={styles.heroRangeWrap}>
        <DateRangeSelector
          activeKey={range.key}
          onChange={onRangeChange}
          accessibilityLabel={t('seller.dashboard.rangeAriaLabel')}
        />
      </View>

      <View style={styles.heroMetrics}>
        {METRIC_LABEL_KEYS.map((m, i) => {
          const kpi = find(m.key)
          return (
            <View key={m.key} style={[styles.heroMetric, i > 0 && styles.heroMetricDivided]}>
              <Text style={styles.heroMetricLabel}>{t(m.labelKey)}</Text>
              <Text style={styles.heroMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                {kpi?.value ?? '0'}
              </Text>
            </View>
          )
        })}
      </View>

      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${t('seller.dashboard.chartDataTable')}. ${chart
          .map(p => `${p.label}: NPR ${p.revenue.toLocaleString()}`)
          .join(', ')}`}
        style={styles.heroA11yHidden}
      />
    </View>
  )
})
