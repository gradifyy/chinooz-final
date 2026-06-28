import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg'
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow, duration, easing } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from './A11yProvider'
import { useAppState } from './AppStateProvider'
import {
  MetricsDetailSkeleton,
  LoadErrorState,
  OfflineState,
} from './PerformanceStates'
import { CountUp } from './CountUp'
import { useRiderMetricDetail } from '@chinooz/hooks'
import {
  RIDER_PERFORMANCE_PERIODS,
  bandForRate,
  bandForRating,
  type RiderMetricDetail,
  type RiderMetricId,
  type RiderPerformancePeriodKey,
  type RiderMetricStatus,
} from '@chinooz/mock-data'

/**
 * RP2 — Metrics detail + trends.
 *
 * Per-metric: definition, current value vs an honest target/threshold, a
 * trend chart (reusing the SD3 SVG line-chart pattern with an accessible
 * summary + data-table fallback + a target line), a neutral breakdown of why
 * deliveries did/didn't complete, and a "what affects this" explainer.
 *
 * Tap-through arrives from the scorecard tiles as ?metric=<id>. Thresholds
 * are visible but framed supportively (never threats); the breakdown is
 * neutral and never blames the rider.
 */

const PERIOD_KEYS: RiderPerformancePeriodKey[] = ['week', 'month', 'all_time']

function periodLabelKey(key: RiderPerformancePeriodKey): string {
  switch (key) {
    case 'week':
      return 'rider.performance.periodWeek'
    case 'month':
      return 'rider.performance.periodMonth'
    case 'all_time':
      return 'rider.performance.periodAllTime'
  }
}

function metricLabelKey(id: RiderMetricId): string {
  switch (id) {
    case 'rating':
      return 'rider.performance.metricRating'
    case 'acceptance':
      return 'rider.performance.metricAcceptance'
    case 'completion':
      return 'rider.performance.metricCompletion'
    case 'on_time':
      return 'rider.performance.metricOnTime'
    case 'total_deliveries':
      return 'rider.performance.metricTotalDeliveries'
  }
}

const STATUS_VISUAL: Record<
  RiderMetricStatus,
  { tint: string; ring: string; text: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  good: { tint: colors.successLight, ring: colors.success, text: colors.success, Icon: CheckCircle2 },
  watch: { tint: colors.warningLight, ring: colors.warning, text: '#92400E', Icon: AlertTriangle },
  low: { tint: colors.errorLight, ring: colors.error, text: colors.error, Icon: AlertTriangle },
}

function statusWordKey(status: RiderMetricStatus): string {
  if (status === 'good') return 'rider.performance.statusGood'
  if (status === 'watch') return 'rider.performance.statusWatch'
  return 'rider.performance.statusLow'
}

function fmtValue(v: number, id: RiderMetricId): string {
  if (id === 'rating') return v.toFixed(1)
  if (id === 'total_deliveries') return Math.round(v).toLocaleString('en-IN')
  return `${Math.round(v)}%`
}

function unitFor(id: RiderMetricId): string {
  if (id === 'rating') return '/ 5'
  if (id === 'total_deliveries') return ''
  return '%'
}

const VALID_METRICS: RiderMetricId[] = [
  'rating',
  'acceptance',
  'completion',
  'on_time',
  'total_deliveries',
]

export default function MetricsDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { minTouchTarget } = useA11y()
  const params = useLocalSearchParams<{ metric?: string }>()

  const requestedMetric = (params.metric as RiderMetricId) || 'acceptance'
  const metricId: RiderMetricId = VALID_METRICS.includes(requestedMetric)
    ? requestedMetric
    : 'acceptance'

  const [periodKey, setPeriodKey] = useState<RiderPerformancePeriodKey>('week')
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'

  // TanStack Query — 120s staleTime per RS3 convention.
  const periodRange = RIDER_PERFORMANCE_PERIODS.find(r => r.key === periodKey)!
  const metricQuery = useRiderMetricDetail(metricId, periodRange)
  const detail = metricQuery.data ?? null
  const cachedDetail = detail
  const loading = metricQuery.isLoading
  const refreshing = metricQuery.isRefetching
  const error = metricQuery.isError

  useEffect(() => {
    analytics.screen({ name: 'rider-metrics-detail', props: { metric: metricId } })
  }, [metricId])

  const onChangePeriod = useCallback(
    (next: RiderPerformancePeriodKey) => {
      if (next === periodKey) return
      try {
        if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      setPeriodKey(next)
    },
    [periodKey, reduced],
  )

  const onRefresh = useCallback(() => {
    metricQuery.refetch()
  }, [metricQuery])

  const goBack = useCallback(() => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    if (router.canGoBack()) router.back()
    else router.replace('/profile/performance')
  }, [router, reduced])

  const periodLabel = t(periodLabelKey(periodKey))
  const metricLabel = t(metricLabelKey(metricId))

  const segments = PERIOD_KEYS.map(k => ({ key: k, label: t(periodLabelKey(k)) }))

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.performance.detailBack')}
            onPress={goBack}
            style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.performance.detailTitle')}
            </Text>
            <Text style={styles.headerSub}>{metricLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Period switch — segmented control */}
        <View style={styles.periodWrap}>
          <Segmented
            segments={segments}
            activeKey={periodKey}
            onChange={k => onChangePeriod(k as RiderPerformancePeriodKey)}
            ariaLabel={t('rider.performance.periodSwitchAria')}
            reduced={reduced}
          />
        </View>

        {loading ? (
          <MetricsDetailSkeleton ariaLabel={t('rider.performance.detailSkeletonAria')} />
        ) : error ? (
          isOffline && cachedDetail ? (
            <View style={styles.body}>
              <OfflineState
                cachedDate={cachedDetail.period.key}
                title={t('rider.performance.offlineTitle')}
                body={t('rider.performance.offlineBody', { date: cachedDetail.period.key })}
                ariaLabel={t('rider.performance.offlineAria', { date: cachedDetail.period.key })}
                retry={t('rider.performance.offlineRetry')}
                retryAria={t('rider.performance.offlineRetryAria')}
                onRetry={onRefresh}
              />
              <View nativeID="rider-metrics-detail-cached">
                <Section title={t('rider.performance.detailDefinition')}>
                  <Text style={styles.definitionText}>{t(cachedDetail.definitionKey)}</Text>
                </Section>
                <CurrentVsTarget detail={cachedDetail} t={t} reduced={reduced} />
              </View>
            </View>
          ) : (
            <LoadErrorState
              title={t('rider.performance.detailErrorTitle')}
              subtitle={t('rider.performance.detailErrorSubtitle')}
              retry={t('rider.performance.detailRetry')}
              retryAria={t('rider.performance.detailRetry')}
              onRetry={onRefresh}
            />
          )
        ) : detail ? (
          <View style={styles.body} nativeID="rider-metrics-detail">
            {/* Offline banner — cached data still visible */}
            {isOffline && (
              <OfflineState
                cachedDate={detail.period.key}
                title={t('rider.performance.offlineTitle')}
                body={t('rider.performance.offlineBody', { date: detail.period.key })}
                ariaLabel={t('rider.performance.offlineAria', { date: detail.period.key })}
                retry={t('rider.performance.offlineRetry')}
                retryAria={t('rider.performance.offlineRetryAria')}
                onRetry={onRefresh}
              />
            )}
            {/* Definition */}
            <Section title={t('rider.performance.detailDefinition')}>
              <Text style={styles.definitionText}>{t(detail.definitionKey)}</Text>
            </Section>

            {/* Current vs target */}
            <CurrentVsTarget detail={detail} t={t} reduced={reduced} />

            {/* Trend chart (reuses SD3 SVG pattern) */}
            <Section title={t('rider.performance.detailTrendTitle', { period: periodLabel })}>
              <TrendChart
                detail={detail}
                t={t}
                periodLabel={periodLabel}
                metricLabel={metricLabel}
                reduced={reduced}
              />
            </Section>

            {/* Neutral breakdown */}
            <Section title={t(detail.breakdownTitleKey)}>
              <Breakdown detail={detail} t={t} reduced={reduced} />
            </Section>

            {/* What affects this explainer */}
            <Section title={t(detail.explainerTitleKey)}>
              <View style={styles.explainerCard}>
                <Info size={16} color={colors.primary} />
                <Text style={styles.explainerText}>{t(detail.explainerKey)}</Text>
              </View>
            </Section>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

/** Current value vs target/threshold — visible, supportive framing. */
function CurrentVsTarget({
  detail,
  t,
  reduced,
}: {
  detail: RiderMetricDetail
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  const unit = t(detail.unitKey).trim()
  const targetLabel = t(detail.targetLabelKey)
  const meets = detail.meetsTarget
  const framing = t(detail.targetFramingKey)
  const statusAria = meets
    ? t('rider.performance.detailMeetsTargetAria', { metric: t(detail.labelKey) })
    : t('rider.performance.detailBelowTargetAria', {
        metric: t(detail.labelKey),
        framing,
      })
  const Icon = meets ? CheckCircle2 : AlertTriangle
  const iconColor = meets ? colors.success : colors.warning

  const isPct = detail.metricId !== 'rating' && detail.metricId !== 'total_deliveries'
  const isDeliveries = detail.metricId === 'total_deliveries'
  const fmtRaw = (v: number) =>
    isPct ? `${Math.round(v)}%` : isDeliveries ? Math.round(v).toLocaleString('en-IN') : v.toFixed(1)

  return (
    <View style={styles.cvtCard} accessibilityRole="summary" accessibilityLabel={statusAria}>
      <View style={styles.cvtRow}>
        <View style={styles.cvtCell}>
          <Text style={styles.cvtLabel}>{t('rider.performance.detailCurrent')}</Text>
          <View style={styles.cvtValueRow}>
            <CountUp
              value={detail.rawValue}
              format={fmtRaw}
              reduced={reduced}
              delay={duration.fast}
              style={styles.cvtValue}
            />
            {unit ? <Text style={styles.cvtUnit}> {unit}</Text> : null}
          </View>
        </View>
        <View style={styles.cvtDivider} />
        <View style={styles.cvtCell}>
          <Text style={styles.cvtLabel}>{targetLabel}</Text>
          <View style={styles.cvtValueRow}>
            <Text style={[styles.cvtValue, styles.cvtTargetValue]} numberOfLines={1}>
              {detail.targetValue}
            </Text>
            {unit ? <Text style={styles.cvtUnit}> {unit}</Text> : null}
          </View>
        </View>
      </View>
      <View style={styles.cvtStatusRow}>
        <Icon size={14} color={iconColor} />
        <Text style={[styles.cvtStatusText, { color: iconColor }]}>
          {meets ? t('rider.performance.detailMeetsTarget') : t('rider.performance.detailBelowTarget')}
        </Text>
      </View>
      <Text style={styles.cvtFraming}>{framing}</Text>
    </View>
  )
}

/**
 * Trend chart — reuses the SD3 SVG line-chart pattern: an accessible summary
 * on the chart container, a target line (dashed, announced, never color-only),
 * and a data-table fallback below for screen readers.
 */
function TrendChart({
  detail,
  t,
  periodLabel,
  metricLabel,
  reduced,
}: {
  detail: RiderMetricDetail
  t: (key: string, opts?: Record<string, unknown>) => string
  periodLabel: string
  metricLabel: string
  reduced: boolean
}) {
  const points = detail.trend
  const unit = t(detail.unitKey).trim()
  const target = detail.target
  const targetValue = detail.targetValue

  const VIEW_W = 320
  const VIEW_H = 180
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 14
  const PAD_B = 26

  const maxVal = useMemo(() => {
    const all = [...points.map(p => p.value), target]
    const lo = Math.min(...all)
    const hi = Math.max(...all)
    const span = hi - lo || 1
    return { lo: lo - span * 0.15, hi: hi + span * 0.15 }
  }, [points, target])

  const coords = useMemo(() => {
    const innerW = VIEW_W - PAD_L - PAD_R
    const innerH = VIEW_H - PAD_T - PAD_B
    const n = points.length
    return points.map((p, i) => {
      const x = PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const y = PAD_T + innerH - ((p.value - maxVal.lo) / (maxVal.hi - maxVal.lo)) * innerH
      return { x, y, p }
    })
  }, [points, maxVal])

  const targetY = useMemo(() => {
    const innerH = VIEW_H - PAD_T - PAD_B
    return PAD_T + innerH - ((target - maxVal.lo) / (maxVal.hi - maxVal.lo)) * innerH
  }, [target, maxVal])

  const linePath = useMemo(() => {
    if (coords.length === 0) return ''
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`
    let d = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1]
      const curr = coords[i]
      const cx = (prev.x + curr.x) / 2
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
    }
    return d
  }, [coords])

  // Approximate path length for the draw-in animation.
  const pathLen = useMemo(() => {
    if (coords.length < 2) return 100
    let len = 0
    for (let i = 1; i < coords.length; i++) {
      const dx = coords[i].x - coords[i - 1].x
      const dy = coords[i].y - coords[i - 1].y
      len += Math.sqrt(dx * dx + dy * dy)
    }
    return Math.max(len, 100)
  }, [coords])

  // Stroke draw-in: animate strokeDashoffset from pathLen → 0.
  const AnimatedPath = Animated.createAnimatedComponent(Path)
  const dashOffset = useSharedValue(reduced ? 0 : pathLen)
  useEffect(() => {
    if (reduced) {
      dashOffset.value = 0
      return
    }
    dashOffset.value = withDelay(
      duration.normal,
      withTiming(0, {
        duration: duration.slower,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.Never,
      }),
    )
  }, [pathLen, reduced])
  const pathAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }))

  const latest = points.length > 0 ? points[points.length - 1].value : detail.rawValue
  const latestFmt = fmtValue(latest, detail.metricId)

  const ariaSummary = t('rider.performance.detailTrendAria', {
    metric: metricLabel,
    period: periodLabel,
    count: points.length,
    latest: latestFmt,
    unit,
    target: targetValue,
  })

  return (
    <View>
      <View accessibilityLabel={ariaSummary} accessibilityRole="image">
        <Svg width="100%" height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          {/* Y-axis baseline */}
          <Line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={VIEW_H - PAD_B}
            stroke={colors.borderLight}
            strokeWidth={1}
          />
          {/* X-axis baseline */}
          <Line
            x1={PAD_L}
            y1={VIEW_H - PAD_B}
            x2={VIEW_W - PAD_R}
            y2={VIEW_H - PAD_B}
            stroke={colors.borderLight}
            strokeWidth={1}
          />

          {/* Target line — dashed, on-brand gold, announced (not color-only) */}
          <Line
            x1={PAD_L}
            y1={targetY}
            x2={VIEW_W - PAD_R}
            y2={targetY}
            stroke={colors.gold}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <SvgText
            x={VIEW_W - PAD_R}
            y={Math.max(PAD_T + 8, targetY - 4)}
            fontSize={9}
            fill={colors.gold}
            fontFamily={fontFamily.sansSemiBold[0]}
            textAnchor="end"
          >
            {t('rider.performance.detailTargetLine', { value: targetValue, unit })}
          </SvgText>

          {/* Trend line — animated draw-in (strokeDashoffset) */}
          {linePath ? (
            <AnimatedPath
              d={linePath}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeDasharray={pathLen}
              animatedProps={pathAnimProps}
            />
          ) : null}

          {/* Points */}
          {coords.map((c, i) => (
            <Circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={3}
              fill={colors.primary}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}

          {/* X-axis labels */}
          {coords.map((c, i) => (
            <SvgText
              key={'lbl' + i}
              x={c.x}
              y={VIEW_H - PAD_B + 14}
              fontSize={10}
              fill={colors.textMuted}
              fontFamily={fontFamily.sans[0]}
              textAnchor="middle"
            >
              {c.p.label}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Legend — target line + current */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{t('rider.performance.detailCurrent')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDashed, { borderColor: colors.gold }]} />
          <Text style={styles.legendText}>
            {t('rider.performance.detailTargetLine', { value: targetValue, unit })}
          </Text>
        </View>
      </View>

      {/* Data-table fallback for screen readers */}
      <View style={styles.dataTable} accessibilityRole="summary">
        <Text style={styles.dataTableTitle}>
          {t('rider.performance.detailDataTableLabel', { metric: metricLabel })}
        </Text>
        {points.map((p, i) => (
          <Text key={i} style={styles.dataTableRow}>
            {t('rider.performance.detailDataPoint', {
              label: p.label,
              value: fmtValue(p.value, detail.metricId),
              unit,
            })}
          </Text>
        ))}
        <Text style={styles.dataTableRow}>
          {t('rider.performance.detailTargetLineAria', { value: targetValue, unit })}
        </Text>
      </View>
    </View>
  )
}

/** Neutral breakdown — read as a list, never blaming the rider. */
function Breakdown({
  detail,
  t,
  reduced,
}: {
  detail: RiderMetricDetail
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  const total = detail.breakdownTotal
  const maxShare = Math.max(...detail.breakdown.map(b => b.share), 0.0001)

  return (
    <View>
      <Text style={styles.breakdownCaption}>
        {t('rider.performance.detailBreakdownTotalCaption', { count: total })}
      </Text>
      <View style={styles.breakdownList} accessibilityRole="list">
        {detail.breakdown.map((b, idx) => (
          <BreakdownRow
            key={b.id}
            b={b}
            idx={idx}
            maxShare={maxShare}
            t={t}
            reduced={reduced}
          />
        ))}
      </View>
    </View>
  )
}

/** Single breakdown row with animated bar fill. */
function BreakdownRow({
  b,
  idx,
  maxShare,
  t,
  reduced,
}: {
  b: RiderMetricDetail['breakdown'][number]
  idx: number
  maxShare: number
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  const pctVal = Math.round(b.share * 100)
  const w = Math.max(2, (b.share / maxShare) * 100)

  const fillAnim = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) {
      fillAnim.value = 1
      return
    }
    fillAnim.value = withDelay(
      idx * 80,
      withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.easeOut), reduceMotion: ReduceMotion.Never }),
    )
  }, [idx, reduced])
  const barStyle = useAnimatedStyle(() => ({
    width: `${w * fillAnim.value}%`,
  }))

  return (
    <View
      style={styles.breakdownRow}
      accessibilityRole="text"
      accessibilityLabel={t('rider.performance.detailBreakdownAria', {
        label: t(b.labelKey),
        count: b.count,
        pct: pctVal,
      })}
    >
      <View style={styles.breakdownBarTrack}>
        <Animated.View style={[styles.breakdownBar, barStyle]} />
      </View>
      <View style={styles.breakdownMeta}>
        <Text style={styles.breakdownLabel} numberOfLines={1}>
          {t(b.labelKey)}
        </Text>
        <Text style={styles.breakdownCount} numberOfLines={1}>
          {b.count.toLocaleString('en-IN')} · {pctVal}%
        </Text>
      </View>
    </View>
  )
}

/** Segmented period switch (week / month / all-time). */
function Segmented({
  segments,
  activeKey,
  onChange,
  ariaLabel,
  reduced,
}: {
  segments: { key: string; label: string }[]
  activeKey: string
  onChange: (key: string) => void
  ariaLabel: string
  reduced: boolean
}) {
  const activeIndex = Math.max(0, segments.findIndex(s => s.key === activeKey))
  const segmentWidth = useSharedValue(0)

  return (
    <View
      style={styles.periodTrack}
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
      onLayout={e => {
        segmentWidth.value = e.nativeEvent.layout.width / segments.length
      }}
    >
      <AnimatedIndicator
        index={activeIndex}
        segmentWidth={segmentWidth.value}
        reduced={reduced}
      />
      {segments.map(seg => {
        const isActive = seg.key === activeKey
        return (
          <TouchableOpacity
            key={seg.key}
            onPress={() => onChange(seg.key)}
            style={styles.periodSegment}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.periodLabel, isActive && styles.periodLabelActive]}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// Lightweight shared-value helpers — reanimated is imported at the top.

function AnimatedIndicator({
  index,
  segmentWidth,
  reduced,
}: {
  index: number
  segmentWidth: number
  reduced: boolean
}) {
  const x = useSharedValue(index * segmentWidth)
  useEffect(() => {
    x.value = reduced
      ? index * segmentWidth
      : withSpring(index * segmentWidth, { damping: 25, stiffness: 350, mass: 0.8, reduceMotion: ReduceMotion.Never })
  }, [index, segmentWidth, reduced, x])
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
  return (
    <Animated.View
      style={[styles.periodIndicator, { width: segmentWidth || undefined }, style]}
      pointerEvents="none"
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  backBtn: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  // Period switch.
  periodWrap: { padding: spacing[4], paddingBottom: spacing[2] },
  periodTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    height: 40,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  periodIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  periodSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  periodLabel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textMuted,
  },
  periodLabelActive: { color: colors.white },

  body: { padding: spacing[4], paddingTop: spacing[2], gap: spacing[5] },

  // Section.
  section: { gap: spacing[2] },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Definition.
  definitionText: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    lineHeight: 21,
    fontFamily: fontFamily.sans[0],
  },

  // Current vs target.
  cvtCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
    ...shadow('sm'),
  },
  cvtRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing[3] },
  cvtCell: { flex: 1, gap: spacing[1.5] },
  cvtValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  cvtDivider: { width: 1, backgroundColor: colors.borderLight },
  cvtLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cvtValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  cvtTargetValue: { color: colors.gold },
  cvtUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cvtStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  cvtStatusText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cvtFraming: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    lineHeight: 18,
    fontFamily: fontFamily.sans[0],
  },

  // Trend chart.
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[2],
    paddingHorizontal: spacing[1],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  legendLine: { width: 16, height: 3, borderRadius: radii.full },
  legendDashed: {
    width: 16,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },

  // Data-table fallback.
  dataTable: { marginTop: spacing[3] },
  dataTableTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing[1.5],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  dataTableRow: {
    fontSize: 11,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
    fontFamily: fontFamily.sans[0],
  },

  // Breakdown.
  breakdownCaption: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sans[0],
  },
  breakdownList: { gap: spacing[2.5] },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  breakdownBarTrack: {
    width: 120,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  breakdownMeta: { flex: 1, minWidth: 0 },
  breakdownLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  breakdownCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },

  // Explainer.
  explainerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    padding: spacing[3.5],
  },
  explainerText: {
    flex: 1,
    fontSize: fontSize.sm[0],
    lineHeight: 19,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
})
