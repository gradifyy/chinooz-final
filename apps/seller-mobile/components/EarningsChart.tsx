import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import Svg, { Path, Circle, Rect, Line, Text as SvgText } from 'react-native-svg'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { formatNPRAmount, type FinanceEarningsSeries } from '@chinooz/mock-data'

type Metric = 'gross' | 'net'

interface Props {
  series: FinanceEarningsSeries | null
  loading?: boolean
}

const VIEW_W = 340
const VIEW_H = 200
const PAD_L = 8
const PAD_R = 8
const PAD_T = 16
const PAD_B = 28

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

export default function EarningsChart({ series, loading = false }: Props) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const [metric, setMetric] = useState<Metric>('net')
  const [breakdown, setBreakdown] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const points = series?.points ?? []
  const previousPoints = series?.previousPoints ?? []
  const comparisonPct = series?.comparisonPct ?? 0

  const hasData = points.length >= 2
  const isEmpty = !loading && points.length === 0

  const maxVal = useMemo(() => {
    if (points.length === 0) return 1
    let m = 1
    for (const p of points) m = Math.max(m, p.gross, p.net, p.sales)
    return Math.ceil(m * 1.1)
  }, [points])

  const coords = useMemo(() => {
    const innerW = VIEW_W - PAD_L - PAD_R
    const innerH = VIEW_H - PAD_T - PAD_B
    const n = points.length
    return points.map((p, i) => {
      const x = PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const yNet = PAD_T + innerH - (p.net / maxVal) * innerH
      const yGross = PAD_T + innerH - (p.gross / maxVal) * innerH
      return { x, yNet, yGross, p }
    })
  }, [points, maxVal])

  const prevCoords = useMemo(() => {
    const innerW = VIEW_W - PAD_L - PAD_R
    const innerH = VIEW_H - PAD_T - PAD_B
    const n = previousPoints.length
    return previousPoints.map((p, i) => {
      const x = PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const yNet = PAD_T + innerH - (p.net / maxVal) * innerH
      return { x, yNet, p }
    })
  }, [previousPoints, maxVal])

  const linePath = useMemo(() => {
    return smoothPath(coords.map(c => ({ x: c.x, y: metric === 'net' ? c.yNet : c.yGross })))
  }, [coords, metric])

  const prevLinePath = useMemo(() => {
    if (previousPoints.length < 2) return ''
    return smoothPath(prevCoords.map(c => ({ x: c.x, y: c.yNet })))
  }, [prevCoords, previousPoints.length])

  const [drawProgress, setDrawProgress] = useState(reducedMotion ? 1 : 0)
  useEffect(() => {
    if (reducedMotion || !hasData) {
      setDrawProgress(1)
      return
    }
    setDrawProgress(0)
    const start = Date.now()
    const dur = 600
    const raf = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / dur)
      setDrawProgress(1 - Math.pow(1 - t, 3))
      if (t >= 1) clearInterval(raf)
    }, 16)
    return () => clearInterval(raf)
  }, [linePath, reducedMotion, hasData])

  const peakIdx = useMemo(() => {
    if (points.length === 0) return null
    let idx = 0
    for (let i = 1; i < points.length; i++) {
      if (points[i].net > points[idx].net) idx = i
    }
    return idx
  }, [points])

  const comparisonTrend: 'up' | 'down' | 'flat' =
    comparisonPct > 1 ? 'up' : comparisonPct < -1 ? 'down' : 'flat'

  const ariaSummary = useMemo(() => {
    if (points.length === 0) return t('seller.finance.chartEmptyTitle')
    const nets = points.map(p => p.net)
    const low = Math.min(...nets)
    const high = Math.max(...nets)
    const direction = comparisonTrend === 'up' ? 'rose' : comparisonTrend === 'down' ? 'fell' : 'held'
    return t('seller.finance.chartSummaryAria', {
      direction,
      pct: Math.abs(comparisonPct),
      low: formatNPRAmount(low),
      high: formatNPRAmount(high),
      count: points.length,
    })
  }, [points, comparisonPct, comparisonTrend, t])

  const hovered = hoverIdx != null ? points[hoverIdx] : null

  if (loading) {
    return (
      <View>
        <Controls
          t={t}
          metric={metric}
          setMetric={setMetric}
          breakdown={breakdown}
          setBreakdown={setBreakdown}
          comparisonPct={comparisonPct}
          showComparison={false}
        />
        <View style={styles.skeleton}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    )
  }

  if (isEmpty) {
    return (
      <View>
        <Controls
          t={t}
          metric={metric}
          setMetric={setMetric}
          breakdown={breakdown}
          setBreakdown={setBreakdown}
          comparisonPct={comparisonPct}
          showComparison={false}
        />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('seller.finance.chartEmptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('seller.finance.chartEmptySubtitle')}</Text>
        </View>
      </View>
    )
  }

  if (!hasData) {
    return (
      <View>
        <Controls
          t={t}
          metric={metric}
          setMetric={setMetric}
          breakdown={breakdown}
          setBreakdown={setBreakdown}
          comparisonPct={comparisonPct}
          showComparison={false}
        />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('seller.finance.chartInsufficientTitle')}</Text>
          <Text style={styles.emptySub}>{t('seller.finance.chartInsufficientSubtitle')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View>
      <Controls
        t={t}
        metric={metric}
        setMetric={setMetric}
        breakdown={breakdown}
        setBreakdown={setBreakdown}
        comparisonPct={comparisonPct}
        showComparison
      />

      <View accessibilityLabel={ariaSummary} accessibilityRole="image">
        <Svg width="100%" height={200} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          {[0.25, 0.5, 0.75].map(f => (
            <Line
              key={f}
              x1={PAD_L}
              x2={VIEW_W - PAD_R}
              y1={PAD_T + (VIEW_H - PAD_T - PAD_B) * f}
              y2={PAD_T + (VIEW_H - PAD_T - PAD_B) * f}
              stroke="#F0F0F0"
              strokeWidth={1}
            />
          ))}

          {prevLinePath !== '' && !breakdown && (
            <Path
              d={prevLinePath}
              fill="none"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.6}
            />
          )}

          {breakdown &&
            coords.map((c, i) => {
              const innerH = VIEW_H - PAD_T - PAD_B
              const barW = Math.min(20, ((VIEW_W - PAD_L - PAD_R) / coords.length) * 0.5)
              const hSales = (c.p.sales / maxVal) * innerH
              const hRefunds = (c.p.refunds / maxVal) * innerH
              const hFees = (c.p.fees / maxVal) * innerH
              const x = c.x - barW / 2
              return (
                <React.Fragment key={'bar' + i}>
                  <Rect x={x} y={PAD_T + innerH - hSales} width={barW} height={hSales} rx={2} fill="#8A1B57" opacity={0.5} />
                  <Rect x={x} y={PAD_T + innerH - hSales - hRefunds} width={barW} height={hRefunds} fill="#DC2626" opacity={0.7} />
                  <Rect x={x} y={PAD_T + innerH - hSales - hRefunds - hFees} width={barW} height={hFees} fill="#E0A93B" opacity={0.8} />
                </React.Fragment>
              )
            })}

          {!breakdown && (
            <>
              <Path
                d={linePath}
                fill="none"
                stroke="#8A1B57"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1"
                strokeDashoffset={1 - drawProgress}
              />
              {peakIdx != null && coords[peakIdx] && (
                <Circle
                  cx={coords[peakIdx].x}
                  cy={metric === 'net' ? coords[peakIdx].yNet : coords[peakIdx].yGross}
                  r={4}
                  fill="#E0A93B"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}
              {coords.map((c, i) => (
                <Circle
                  key={'pt' + i}
                  cx={c.x}
                  cy={metric === 'net' ? c.yNet : c.yGross}
                  r={hoverIdx === i ? 5 : 3}
                  fill={hoverIdx === i ? '#8A1B57' : '#FFFFFF'}
                  stroke="#8A1B57"
                  strokeWidth={2}
                />
              ))}
            </>
          )}

          {coords.map((c, i) => (
            <SvgText key={'lbl' + i} x={c.x} y={VIEW_H - 6} textAnchor="middle" fontSize={10} fill="#9CA3AF">
              {c.p.label}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={styles.touchLayer}>
        {coords.map((c, i) => (
          <TouchableOpacity
            key={'hit' + i}
            accessibilityRole="button"
            accessibilityLabel={t('seller.finance.chartPointAria', {
              date: c.p.date,
              net: formatNPRAmount(c.p.net),
              gross: formatNPRAmount(c.p.gross),
            })}
            onPressIn={() => setHoverIdx(i)}
            onPressOut={() => setHoverIdx(null)}
            style={[
              styles.touchPoint,
              {
                left: `${(c.x / VIEW_W) * 100}%`,
                top: `${((metric === 'net' ? c.yNet : c.yGross) / VIEW_H) * 100}%`,
              },
            ]}
          />
        ))}
      </View>

      {hovered && (
        <View style={styles.tooltip} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.tooltipDate}>{hovered.date}</Text>
          <Text style={styles.tooltipRow}>
            {t('seller.finance.chartTooltipNet')}: NPR {formatNPRAmount(hovered.net)}
          </Text>
          <Text style={styles.tooltipRow}>
            {t('seller.finance.chartTooltipGross')}: NPR {formatNPRAmount(hovered.gross)}
          </Text>
          {breakdown && (
            <>
              <Text style={styles.tooltipRow}>
                {t('seller.finance.chartBreakdownSales')}: NPR {formatNPRAmount(hovered.sales)}
              </Text>
              <Text style={[styles.tooltipRow, { color: colors.error }]}>
                {t('seller.finance.chartBreakdownRefunds')}: NPR {formatNPRAmount(hovered.refunds)}
              </Text>
              <Text style={[styles.tooltipRow, { color: colors.gold }]}>
                {t('seller.finance.chartBreakdownFees')}: NPR {formatNPRAmount(hovered.fees)}
              </Text>
            </>
          )}
        </View>
      )}

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{t('seller.finance.chartNetEarnings')}</Text>
        </View>
        {!breakdown && previousPoints.length >= 2 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDashed]} />
            <Text style={styles.legendText}>{t('seller.finance.chartComparison')}</Text>
          </View>
        )}
        {breakdown && (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendSq, { backgroundColor: colors.primary, opacity: 0.5 }]} />
              <Text style={styles.legendText}>{t('seller.finance.chartBreakdownSales')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSq, { backgroundColor: colors.error, opacity: 0.7 }]} />
              <Text style={styles.legendText}>{t('seller.finance.chartBreakdownRefunds')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSq, { backgroundColor: colors.gold, opacity: 0.8 }]} />
              <Text style={styles.legendText}>{t('seller.finance.chartBreakdownFees')}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.tableFallback} accessibilityRole="summary">
        <Text style={styles.tableTitle}>{t('seller.finance.chartLabel')} — data</Text>
        {points.map((p, i) => (
          <Text key={i} style={styles.tableRow}>
            {p.date}: {t('seller.finance.chartTooltipNet')} NPR {formatNPRAmount(p.net)},{' '}
            {t('seller.finance.chartTooltipGross')} NPR {formatNPRAmount(p.gross)}
          </Text>
        ))}
      </View>
    </View>
  )
}

function Controls({
  t,
  metric,
  setMetric,
  breakdown,
  setBreakdown,
  comparisonPct,
  showComparison,
}: {
  t: (k: string, o?: any) => string
  metric: Metric
  setMetric: (m: Metric) => void
  breakdown: boolean
  setBreakdown: (b: boolean | ((p: boolean) => boolean)) => void
  comparisonPct: number
  showComparison: boolean
}) {
  const trend: 'up' | 'down' | 'flat' =
    comparisonPct > 1 ? 'up' : comparisonPct < -1 ? 'down' : 'flat'
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.textMuted
  return (
    <View style={styles.controlsRow}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('seller.finance.chartToggleAria')}
        style={styles.toggleGroup}
      >
        {(['gross', 'net'] as Metric[]).map(m => (
          <TouchableOpacity
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: metric === m }}
            onPress={() => setMetric(m)}
            style={[styles.togglePill, metric === m && styles.togglePillActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, metric === m && styles.toggleTextActive]}>
              {m === 'gross' ? t('seller.finance.chartGross') : t('seller.finance.chartNet')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        accessibilityRole="switch"
        accessibilityState={{ checked: breakdown }}
        accessibilityLabel={t('seller.finance.chartBreakdownAria')}
        onPress={() => setBreakdown(b => !b)}
        style={[styles.breakdownPill, breakdown && styles.breakdownPillActive]}
        activeOpacity={0.85}
      >
        <Text style={[styles.breakdownText, breakdown && styles.breakdownTextActive]}>
          {t('seller.finance.chartBreakdown')}
        </Text>
      </TouchableOpacity>

      {showComparison && (
        <View
          accessibilityLabel={t('seller.finance.chartComparisonAria', { pct: Math.abs(comparisonPct) })}
          style={styles.comparisonBadge}
        >
          <Icon size={14} color={trendColor} />
          <Text style={[styles.comparisonText, { color: trendColor }]}>
            {trend === 'up'
              ? t('seller.finance.chartComparisonUp', { pct: Math.abs(comparisonPct) })
              : trend === 'down'
                ? t('seller.finance.chartComparisonDown', { pct: Math.abs(comparisonPct) })
                : t('seller.finance.chartComparisonFlat')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  togglePill: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full },
  togglePillActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.white },

  breakdownPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownPillActive: { backgroundColor: colors.gold + '26', borderColor: colors.gold },
  breakdownText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted },
  breakdownTextActive: { color: colors.gold },

  comparisonBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  comparisonText: { fontSize: fontSize.xs[0], fontWeight: '600' },

  skeleton: {
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    height: 200,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  emptyTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  emptySub: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: spacing[1], textAlign: 'center' },

  touchLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  touchPoint: {
    position: 'absolute',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
  },

  tooltip: {
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tooltipDate: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  tooltipRow: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[3], marginTop: spacing[3] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  legendLine: { width: 16, height: 2, borderRadius: 1 },
  legendDashed: {
    width: 16,
    height: 2,
    borderTopWidth: 1.5,
    borderTopColor: colors.textTertiary,
    borderStyle: 'dashed',
  },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: fontSize.xs[0], color: colors.textMuted },

  tableFallback: { marginTop: spacing[3] },
  tableTitle: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted, marginBottom: spacing[1] },
  tableRow: { fontSize: fontSize.xs[0], color: colors.textSecondary, fontVariant: ['tabular-nums'], marginTop: 1 },
})
