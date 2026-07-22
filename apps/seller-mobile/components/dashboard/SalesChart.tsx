import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Svg, { Path, Circle as SvgCircle, Line as SvgLine, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import { colors } from '../../lib/theme'
import type { SellerChartMetric, SellerChartPoint } from '@chinooz/mock-data'
import { useA11y } from '../A11yProvider'
import { styles, CHART_W, CHART_H, C_PAD_L, C_PAD_R, C_PAD_T, C_PAD_B } from './styles'

const CHART_METRICS: { key: SellerChartMetric; labelKey: string }[] = [
  { key: 'revenue', labelKey: 'seller.dashboard.chartMetricRevenue' },
  { key: 'orders', labelKey: 'seller.dashboard.chartMetricOrders' },
  { key: 'units', labelKey: 'seller.dashboard.chartMetricUnits' },
]

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

function metricValue(p: SellerChartPoint, metric: SellerChartMetric): number {
  return p[metric]
}

function metricPrefix(metric: SellerChartMetric): string {
  return metric === 'revenue' ? 'NPR ' : ''
}

export const SalesChart = React.memo(function SalesChart({
  points,
  rangeLabel,
  t,
}: {
  points: SellerChartPoint[]
  rangeLabel: string
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const { reducedMotion } = useA11y()
  const [metric, setMetric] = useState<SellerChartMetric>('revenue')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [drawProgress, setDrawProgress] = useState(reducedMotion ? 1 : 0)

  const values = points.map(p => metricValue(p, metric))
  const maxVal = Math.max(1, ...values)
  const allZero = values.every(v => v === 0)

  const coords = useMemo(() => {
    const innerW = CHART_W - C_PAD_L - C_PAD_R
    const innerH = CHART_H - C_PAD_T - C_PAD_B
    const n = points.length
    return points.map((p, i) => {
      const x = C_PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const v = metricValue(p, metric)
      const y = C_PAD_T + innerH - (v / maxVal) * innerH
      return { x, y, p }
    })
  }, [points, metric, maxVal])

  const linePath = useMemo(() => smoothPath(coords.map(c => ({ x: c.x, y: c.y }))), [coords])
  const areaPath = useMemo(() => {
    if (coords.length === 0) return ''
    const base = CHART_H - C_PAD_B
    return `${linePath} L ${coords[coords.length - 1].x} ${base} L ${coords[0].x} ${base} Z`
  }, [linePath, coords])

  useEffect(() => {
    if (reducedMotion || allZero) {
      setDrawProgress(1)
      return
    }
    setDrawProgress(0)
    const start = Date.now()
    const dur = 600
    const raf = setInterval(() => {
      const tt = Math.min(1, (Date.now() - start) / dur)
      setDrawProgress(1 - Math.pow(1 - tt, 3))
      if (tt >= 1) clearInterval(raf)
    }, 16)
    return () => clearInterval(raf)
  }, [linePath, reducedMotion, allZero])

  const ariaSummary = useMemo(() => {
    if (allZero) return t('seller.dashboard.chartEmpty')
    const metricLabel = t(`seller.dashboard.chartMetric${metric.charAt(0).toUpperCase() + metric.slice(1)}`)
    const from = metricPrefix(metric) + Math.min(...values).toLocaleString()
    const to = metricPrefix(metric) + Math.max(...values).toLocaleString()
    return t('seller.dashboard.chartAriaSummary', { metric: metricLabel, range: rangeLabel, from, to })
  }, [allZero, values, metric, rangeLabel, t])

  const hovered = hoverIdx != null ? points[hoverIdx] : null
  const hoveredValue = hovered ? metricValue(hovered, metric) : 0

  return (
    <View style={styles.card}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{t('seller.dashboard.sectionSales')}</Text>
        <View accessibilityRole="tablist" accessibilityLabel={t('seller.dashboard.chartToggleAria')} style={styles.chartToggleGroup}>
          {CHART_METRICS.map(m => {
            const active = m.key === metric
            return (
              <TouchableOpacity
                key={m.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setMetric(m.key)}
                style={[styles.chartTogglePill, active && styles.chartTogglePillActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.chartToggleText, active && styles.chartToggleTextActive]}>
                  {t(m.labelKey)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {allZero ? (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>{t('seller.dashboard.chartEmpty')}</Text>
          <Text style={styles.chartEmptySub}>{t('seller.dashboard.chartEmptySub')}</Text>
        </View>
      ) : (
        <View accessibilityLabel={ariaSummary} accessibilityRole="image">
          <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {[0.25, 0.5, 0.75].map(f => (
              <SvgLine
                key={f}
                x1={C_PAD_L}
                x2={CHART_W - C_PAD_R}
                y1={C_PAD_T + (CHART_H - C_PAD_T - C_PAD_B) * f}
                y2={C_PAD_T + (CHART_H - C_PAD_T - C_PAD_B) * f}
                stroke={colors.borderLight}
                strokeWidth={1}
                strokeDasharray="2 6"
                strokeLinecap="round"
              />
            ))}

            <Path d={areaPath} fill="url(#chartGradient)" />

            <Path
              d={linePath}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1"
              strokeDashoffset={1 - drawProgress}
            />

            {hoverIdx != null && coords[hoverIdx] && (
              <>
                <SvgLine
                  x1={coords[hoverIdx].x}
                  x2={coords[hoverIdx].x}
                  y1={C_PAD_T}
                  y2={CHART_H - C_PAD_B}
                  stroke={colors.primary}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
                <SvgCircle
                  cx={coords[hoverIdx].x}
                  cy={coords[hoverIdx].y}
                  r={6}
                  fill={colors.primary}
                  stroke={colors.white}
                  strokeWidth={2}
                />
              </>
            )}

            {coords.length > 0 && hoverIdx == null && (
              <SvgCircle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r={4}
                fill={colors.primary}
                stroke={colors.surface}
                strokeWidth={2.5}
              />
            )}

            {coords.map((c, i) => (
              <SvgText key={'lbl' + i} x={c.x} y={CHART_H - 6} textAnchor="middle" fontSize={10} fill={colors.textMuted}>
                {c.p.label}
              </SvgText>
            ))}
          </Svg>

          <View style={styles.chartTouchLayer}>
            {coords.map((c, i) => (
              <TouchableOpacity
                key={'hit' + i}
                accessibilityRole="button"
                accessibilityLabel={`${c.p.label}: ${metricPrefix(metric)}${metricValue(c.p, metric).toLocaleString()}`}
                onPressIn={() => setHoverIdx(i)}
                onPressOut={() => setHoverIdx(null)}
                style={[
                  styles.chartTouchPoint,
                  { left: `${(c.x / CHART_W) * 100}%`, top: `${(c.y / CHART_H) * 100}%` },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {hovered && !allZero && (
        <View style={styles.chartTooltip} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.chartTooltipValue}>
            {metricPrefix(metric)}{hoveredValue.toLocaleString()}
          </Text>
          <Text style={styles.chartTooltipDate}>{hovered.label}</Text>
        </View>
      )}

      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${t('seller.dashboard.chartDataTable')}. ${points
          .map(p => `${p.label}: ${metricPrefix(metric)}${metricValue(p, metric).toLocaleString()}`)
          .join(', ')}`}
        style={styles.chartA11yHidden}
      />
    </View>
  )
})
