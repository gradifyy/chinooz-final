import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  ReduceMotion,
  interpolateColor,
} from 'react-native-reanimated'
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Flame, ListChecks } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getRiderEarningsChart,
  getRiderEarningsBreakdown,
  formatRiderNPRAmount,
  type RiderEarningsRange,
  type RiderEarningsRangeKey,
  type RiderEarningsChart as RiderChart,
  type RiderEarningsBreakdown,
  type RiderChartPoint,
} from '@chinooz/mock-data'

type RangeKey = Exclude<RiderEarningsRangeKey, 'today'>

const RANGES: { key: RangeKey; labelKey: string; days: number }[] = [
  { key: '7d', labelKey: 'rider.earnings.chart.rangeWeek', days: 7 },
  { key: '30d', labelKey: 'rider.earnings.chart.rangeMonth', days: 30 },
  { key: 'month', labelKey: 'rider.earnings.chart.rangeMonth', days: 30 },
]

function rangeFor(key: RangeKey): RiderEarningsRange {
  const meta = RANGES.find(r => r.key === key)!
  return { key, label: meta.labelKey, days: meta.days }
}

const AnimatedBar = Animated.createAnimatedComponent(View)

export default function RiderEarningsChartScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const [rangeKey, setRangeKey] = useState<RangeKey>('7d')
  const [chart, setChart] = useState<RiderChart | null>(null)
  const [breakdown, setBreakdown] = useState<RiderEarningsBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [compare, setCompare] = useState(false)

  // Chart morph: fade the chart area when range switches.
  const chartMorph = useSharedValue(1)
  const chartMorphStyle = useAnimatedStyle(() => ({ opacity: chartMorph.value }))

  useEffect(() => {
    if (reduced) return
    chartMorph.value = 0
    chartMorph.value = withTiming(1, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut) })
  }, [rangeKey, reduced])

  useEffect(() => {
    analytics.screen({ name: 'rider-earnings-chart' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    const range = rangeFor(rangeKey)
    try {
      const [c, b] = await Promise.all([
        getRiderEarningsChart(range),
        getRiderEarningsBreakdown(range),
      ])
      setChart(c)
      setBreakdown(b)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [rangeKey])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const points = chart?.points ?? []
  const maxVal = useMemo(() => {
    if (points.length === 0) return 1
    let m = 1
    for (const p of points) {
      m = Math.max(m, p.value, p.previous ?? 0)
    }
    return Math.ceil(m * 1.12)
  }, [points])

  const totalNet = breakdown?.net ?? 0
  const totalTrips = breakdown?.trips ?? 0
  const avgPerTrip = totalTrips > 0 ? Math.round(totalNet / totalTrips) : 0
  const deltaPct = breakdown?.deltaPct ?? 0
  const trend = breakdown?.trend ?? 'flat'
  const directionWord =
    trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'held'

  const rangeLabel = t(`rider.earnings.chart.${rangeKey === '7d' ? 'rangeWeek' : 'rangeMonth'}`)

  const chartAria = useMemo(() => {
    if (points.length === 0) return t('rider.earnings.chart.loading')
    return t('rider.earnings.chart.chartAria', {
      range: rangeLabel,
      count: points.length,
      total: formatRiderNPRAmount(totalNet),
      direction: directionWord,
      pct: Math.abs(deltaPct),
      busiest: breakdown?.busiestLabel ?? '',
      busiestAmount: formatRiderNPRAmount(breakdown?.busiestAmount ?? 0),
    })
  }, [points, rangeLabel, totalNet, directionWord, deltaPct, breakdown, t])

  const onBarTap = (p: RiderChartPoint) => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push({ pathname: '/ledger', params: { date: p.date } })
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.chart.back')}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.earnings.chart.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.earnings.chart.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <ChartSkeleton ariaLabel={t('rider.earnings.chart.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.earnings.chart.errorTitle')}
            subtitle={t('rider.earnings.chart.errorSubtitle')}
            retry={t('rider.earnings.chart.retry')}
            onRetry={onRefresh}
          />
        ) : (
          <View style={styles.body}>
            {/* Range segmented control + compare toggle */}
            <View style={styles.controlsRow}>
              <View
                style={styles.segTrack}
                accessibilityRole="tablist"
                accessibilityLabel={t('rider.earnings.chart.rangeAria')}
              >
                {RANGES.map(r => {
                  const active = r.key === rangeKey
                  const label = t(r.labelKey)
                  return (
                    <TouchableOpacity
                      key={r.key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={t('rider.earnings.chart.rangeTabAria', { range: label })}
                      onPress={() => {
                        try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                        setRangeKey(r.key)
                      }}
                      style={[styles.segBtn, active && styles.segBtnActive]}
                    >
                      <Text style={[styles.segLabel, active && styles.segLabelActive]}>{label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <TouchableOpacity
                accessibilityRole="switch"
                accessibilityState={{ checked: compare }}
                accessibilityLabel={t('rider.earnings.chart.compareAria')}
                onPress={() => setCompare(c => !c)}
                style={[styles.compareBtn, compare && styles.compareBtnOn]}
              >
                <Text style={[styles.compareLabel, compare && styles.compareLabelOn]}>
                  {t('rider.earnings.chart.compareToggle')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Delta chip (semantic, not color-only) */}
            <DeltaChip trend={trend} deltaPct={deltaPct} />

            {/* Chart */}
            <View
              style={styles.chartCard}
              accessibilityRole="image"
              accessible
              accessibilityLabel={chartAria}
            >
              <Animated.View style={[styles.chartArea, chartMorphStyle]}>
                {points.map((p, i) => (
                  <Bar
                    key={p.label + i}
                    point={p}
                    maxVal={maxVal}
                    compare={compare}
                    reduced={reduced}
                    delay={i * 60}
                    onPress={() => onBarTap(p)}
                    ariaLabel={t('rider.earnings.chart.barAria', {
                      label: p.label,
                      amount: formatRiderNPRAmount(p.value),
                      trips: p.trips,
                    })}
                  />
                ))}
              </Animated.View>

              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>{t('rider.earnings.chart.legendCurrent')}</Text>
                </View>
                {compare && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary + '59' }]} />
                    <Text style={styles.legendText}>{t('rider.earnings.chart.legendPrevious')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Busiest hint (ties to Hotspots/Incentives) */}
            {breakdown && (
              <View style={styles.busiestCard}>
                <View style={styles.busiestLeft}>
                  <View style={styles.busiestIcon}>
                    <Flame size={16} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.busiestLabel}>
                      {t('rider.earnings.chart.busiestLabel')}
                    </Text>
                    <Text style={styles.busiestValue} numberOfLines={1}>
                      {t('rider.earnings.chart.busiestValue', {
                        label: breakdown.busiestLabel,
                        amount: formatRiderNPRAmount(breakdown.busiestAmount),
                      })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel={t('rider.earnings.chart.busiestHintAria')}
                  onPress={() => router.push('/incentives')}
                  style={styles.busiestCta}
                >
                  <Text style={styles.busiestCtaText}>
                    {t('rider.earnings.chart.busiestHint')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Earnings breakdown */}
            {breakdown && (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{t('rider.earnings.chart.sectionBreakdown')}</Text>
              </View>
            )}
            {breakdown && (
              <View
                style={styles.breakdownCard}
                accessibilityRole="summary"
                accessible
                accessibilityLabel={t('rider.earnings.chart.breakdownAria', {
                  range: rangeLabel,
                  gross: formatRiderNPRAmount(breakdown.gross),
                  fee: formatRiderNPRAmount(breakdown.fee),
                  net: formatRiderNPRAmount(breakdown.net),
                })}
              >
                {breakdown.rows.map((row, i) => (
                  <View
                    key={row.id}
                    style={[styles.breakdownRow, i > 0 && styles.breakdownRowBorder]}
                    accessibilityRole="text"
                    accessible
                    accessibilityLabel={t('rider.earnings.chart.rowAria', {
                      label: row.label,
                      amount: formatRiderNPRAmount(Math.abs(row.amount)),
                      share: Math.abs(row.share),
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.breakdownRowLabel} numberOfLines={1}>
                        {row.label}
                      </Text>
                    </View>
                    <Text style={styles.breakdownRowShare}>
                      {row.share > 0 ? '+' : ''}
                      {row.share}%
                    </Text>
                    <Text
                      style={[
                        styles.breakdownRowAmount,
                        row.amount < 0 && styles.breakdownRowAmountNeg,
                      ]}
                      numberOfLines={1}
                    >
                      {row.amount < 0 ? '−' : ''}NPR {formatRiderNPRAmount(Math.abs(row.amount))}
                    </Text>
                  </View>
                ))}

                <View style={styles.breakdownTotals}>
                  <View style={styles.breakdownTotalRow}>
                    <Text style={styles.breakdownTotalLabel}>
                      {t('rider.earnings.chart.totalGross')}
                    </Text>
                    <Text style={styles.breakdownTotalValue}>
                      NPR {formatRiderNPRAmount(breakdown.gross)}
                    </Text>
                  </View>
                  <View style={styles.breakdownTotalRow}>
                    <Text style={styles.breakdownTotalLabel}>
                      {t('rider.earnings.chart.totalFee')}
                    </Text>
                    <Text style={[styles.breakdownTotalValue, styles.breakdownRowAmountNeg]}>
                      −NPR {formatRiderNPRAmount(breakdown.fee)}
                    </Text>
                  </View>
                  <View style={[styles.breakdownTotalRow, styles.breakdownTotalNet]}>
                    <Text style={styles.breakdownTotalNetLabel}>
                      {t('rider.earnings.chart.totalNet')}
                    </Text>
                    <Text style={styles.breakdownTotalNetValue}>
                      NPR {formatRiderNPRAmount(breakdown.net)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Period totals */}
            {breakdown && (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{t('rider.earnings.chart.sectionTotals')}</Text>
              </View>
            )}
            {breakdown && (
              <View style={styles.totalsRow}>
                <TotalTile
                  label={t('rider.earnings.chart.totalEarned')}
                  value={`NPR ${formatRiderNPRAmount(breakdown.net)}`}
                />
                <TotalTile
                  label={t('rider.earnings.chart.totalTrips')}
                  value={`${breakdown.trips}`}
                />
                <TotalTile
                  label={t('rider.earnings.chart.avgPerTrip')}
                  value={`NPR ${formatRiderNPRAmount(avgPerTrip)}`}
                />
              </View>
            )}

            {/* Data table fallback */}
            {!loading && !error && points.length > 0 && (
              <View style={styles.dataTableWrap}>
                <Text style={styles.dataTableLabel}>
                  {t('rider.earnings.chart.dataTableLabel')}
                </Text>
                <View style={styles.dataTable}>
                  <View style={styles.dataTableHeader}>
                    <Text style={[styles.dataTableCell, styles.dataTableHeadCell, { flex: 1.2 }]}>
                      {t('rider.earnings.chart.dataColLabel')}
                    </Text>
                    <Text style={[styles.dataTableCell, styles.dataTableHeadCell, styles.dataTableNum]}>
                      {t('rider.earnings.chart.dataColNet')}
                    </Text>
                    <Text style={[styles.dataTableCell, styles.dataTableHeadCell, styles.dataTableNum]}>
                      {t('rider.earnings.chart.dataColTrips')}
                    </Text>
                    {compare && (
                      <Text style={[styles.dataTableCell, styles.dataTableHeadCell, styles.dataTableNum]}>
                        {t('rider.earnings.chart.dataColPrevious')}
                      </Text>
                    )}
                  </View>
                  {points.map((p, i) => (
                    <View key={'dt' + i} style={[styles.dataTableRow, i > 0 && styles.dataTableRowBorder]}>
                      <Text style={[styles.dataTableCell, { flex: 1.2 }]}>{p.label}</Text>
                      <Text style={[styles.dataTableCell, styles.dataTableNum, styles.dataTableMono]}>
                        {formatRiderNPRAmount(p.value)}
                      </Text>
                      <Text style={[styles.dataTableCell, styles.dataTableNum, styles.dataTableMono]}>
                        {p.trips}
                      </Text>
                      {compare && (
                        <Text style={[styles.dataTableCell, styles.dataTableNum, styles.dataTableMono]}>
                          {formatRiderNPRAmount(p.previous ?? 0)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: spacing[4] }} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function DeltaChip({ trend, deltaPct }: { trend: 'up' | 'down' | 'flat'; deltaPct: number }) {
  const { t } = useTranslation()
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const color = trend === 'up' ? colors.success : trend === 'down' ? colors.error : colors.textMuted
  const bg = trend === 'up' ? colors.successLight : trend === 'down' ? colors.errorLight : colors.borderLight
  const label =
    trend === 'up'
      ? t('rider.earnings.chart.deltaUp', { pct: Math.abs(deltaPct) })
      : trend === 'down'
        ? t('rider.earnings.chart.deltaDown', { pct: Math.abs(deltaPct) })
        : t('rider.earnings.chart.deltaFlat')
  const aria = t('rider.earnings.chart.deltaAria', {
    direction: trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'flat',
    pct: Math.abs(deltaPct),
  })
  return (
    <View
      style={[styles.deltaChip, { backgroundColor: bg }]}
      accessibilityRole="text"
      accessible
      accessibilityLabel={aria}
    >
      <Icon size={14} color={color} />
      <Text style={[styles.deltaChipText, { color }]}>{label}</Text>
    </View>
  )
}

function Bar({
  point,
  maxVal,
  compare,
  reduced,
  delay,
  onPress,
  ariaLabel,
}: {
  point: RiderChartPoint
  maxVal: number
  compare: boolean
  reduced: boolean
  delay: number
  onPress: () => void
  ariaLabel: string
}) {
  const h = Math.max(4, (point.value / maxVal) * 100)
  const ph = point.previous != null ? Math.max(4, (point.previous / maxVal) * 100) : 0
  const grow = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      grow.value = 1
      return
    }
    const id = setTimeout(() => {
      grow.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    }, delay)
    return () => clearTimeout(id)
  }, [reduced, delay])

  const barStyle = useAnimatedStyle(() => ({
    height: `${h * grow.value}%`,
  }))
  const prevStyle = useAnimatedStyle(() => ({
    height: `${ph * (reduced ? 1 : grow.value)}%`,
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      style={styles.barCol}
    >
      <View style={styles.barTrack}>
        {compare && (
          <AnimatedBar style={[styles.barPrev, prevStyle]} />
        )}
        <AnimatedBar
          style={[
            styles.bar,
            barStyle,
            { width: compare ? '46%' : '62%' },
          ]}
        />
      </View>
      <Text style={styles.barLabel}>{point.label}</Text>
      <Text style={styles.barValue} numberOfLines={1}>
        {formatRiderNPRAmount(point.value)}
      </Text>
    </Pressable>
  )
}

function TotalTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalTile}>
      <Text style={styles.totalTileLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.totalTileValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function ChartSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
      </View>
      <View style={[styles.skeletonBlock, { height: 200 }]} />
      <View style={[styles.skeletonBlock, { height: 56 }]} />
      <View style={[styles.skeletonBlock, { height: 180 }]} />
      <View style={styles.skeletonTiles}>
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
      </View>
    </View>
  )
}

function ErrorState({
  title,
  subtitle,
  retry,
  onRetry,
}: {
  title: string
  subtitle: string
  retry: string
  onRetry: () => void
}) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorSubtitle}>{subtitle}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retry}
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <Text style={styles.retryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  body: { padding: spacing[4], gap: spacing[3] },

  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  segTrack: {
    flexDirection: 'row',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 2,
    flex: 1,
  },
  segBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    minHeight: 36,
  },
  segBtnActive: { backgroundColor: colors.primary },
  segLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  segLabelActive: { color: colors.white },

  compareBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBtnOn: { backgroundColor: colors.primary50, borderColor: colors.primary },
  compareLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  compareLabelOn: { color: colors.primary },

  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  deltaChipText: { fontSize: 13, fontWeight: '700', fontFamily: fontFamily.sansSemiBold[0] },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    ...shadow('sm'),
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    gap: spacing[1.5],
    marginBottom: spacing[3],
  },
  barCol: { flex: 1, alignItems: 'center', gap: spacing[1], height: '100%' },
  barTrack: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  bar: { borderRadius: radii.sm, minHeight: 4, backgroundColor: colors.primary },
  barPrev: { width: '46%', borderRadius: radii.sm, minHeight: 4, backgroundColor: colors.primary + '59' },
  barLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },
  barValue: {
    fontSize: 9,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },

  legendRow: { flexDirection: 'row', gap: spacing[3] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  legendDot: { width: 10, height: 10, borderRadius: radii.sm },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },

  busiestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    padding: spacing[3.5],
  },
  busiestLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], flex: 1, minWidth: 0 },
  busiestIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busiestLabel: { fontSize: 11, fontWeight: '600', color: colors.warning, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },
  busiestValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 1, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  busiestCta: { paddingHorizontal: spacing[2.5], paddingVertical: spacing[2], borderRadius: radii.full, backgroundColor: colors.surface },
  busiestCtaText: { fontSize: 12, fontWeight: '700', color: colors.warning, fontFamily: fontFamily.sansSemiBold[0] },

  sectionHead: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    ...shadow('sm'),
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
  },
  breakdownRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  breakdownRowLabel: { fontSize: 14, color: colors.text, fontFamily: fontFamily.sans[0] },
  breakdownRowShare: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0], minWidth: 44, textAlign: 'right' },
  breakdownRowAmount: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0], minWidth: 110, textAlign: 'right' },
  breakdownRowAmountNeg: { color: colors.error },

  breakdownTotals: { marginTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing[2] },
  breakdownTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[1.5] },
  breakdownTotalLabel: { fontSize: 13, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  breakdownTotalValue: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  breakdownTotalNet: { marginTop: spacing[1], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.borderLight },
  breakdownTotalNetLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  breakdownTotalNetValue: { fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  totalsRow: { flexDirection: 'row', gap: spacing[2.5] },
  totalTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[1],
    ...shadow('sm'),
  },
  totalTileLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  totalTileValue: { fontSize: 16, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  dataTableWrap: { marginTop: spacing[2] },
  dataTableLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2], fontFamily: fontFamily.sansSemiBold[0] },
  dataTable: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
  },
  dataTableHeader: { flexDirection: 'row', paddingBottom: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dataTableRow: { flexDirection: 'row', paddingVertical: spacing[2] },
  dataTableRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  dataTableCell: { fontSize: 12, color: colors.text, fontFamily: fontFamily.sans[0] },
  dataTableHeadCell: { fontSize: 11, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  dataTableNum: { flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
  dataTableMono: { fontFamily: fontFamily.sans[0] },

  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', gap: spacing[2], height: 40 },
  skeletonBlock: { flex: 1, borderRadius: radii.lg, backgroundColor: colors.shimmer, minHeight: 40 },
  skeletonTiles: { flexDirection: 'row', gap: spacing[2.5], height: 90 },

  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
