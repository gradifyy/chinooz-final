import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolateColor,
} from 'react-native-reanimated'
import {
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  Gauge,
  MessageSquareQuote,
  Award,
  AlertTriangle,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from './A11yProvider'
import {
  getRiderPerformance,
  RIDER_PERFORMANCE_PERIODS,
  type RiderPerformanceOverview,
  type RiderPerformanceMetric,
  type RiderPerformancePeriodKey,
  type RiderMetricStatus,
} from '@chinooz/mock-data'

/**
 * RP1 — Rider Performance & Ratings overview.
 *
 * Reachable from Profile (a pushed route, NOT a bottom tab). Glanceable and
 * supportive, never anxiety-inducing: the scorecard leads with the overall
 * rating (stars) and tabular figures for acceptance / completion / on-time /
 * total deliveries. Status colors (good / watch / low) are restrained and
 * never color-only — each status pairs a soft tint with an icon + word.
 *
 * Layout keeps everything within one-hand reach: header + period switch are
 * pinned at the top, the scorecard tiles stack below, and the tier badge +
 * detail entry points sit at the bottom of the scroll.
 */

const AnimatedPress = Animated.createAnimatedComponent(TouchableOpacity)

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

/** Restrained status visual mapping. Color is never the only signal. */
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

export default function PerformanceScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { minTouchTarget } = useA11y()

  const [periodKey, setPeriodKey] = useState<RiderPerformancePeriodKey>('week')
  const [overview, setOverview] = useState<RiderPerformanceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'rider-performance' })
  }, [])

  const load = useCallback(
    async (key: RiderPerformancePeriodKey, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(false)
      try {
        const range = RIDER_PERFORMANCE_PERIODS.find(r => r.key === key)!
        const ov = await getRiderPerformance(range)
        setOverview(ov)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    load(periodKey)
  }, [load, periodKey])

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
    load(periodKey, true)
  }, [load, periodKey])

  const goBack = useCallback(() => {
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }, [router, reduced])

  const periodLabel = t(periodLabelKey(periodKey))

  const segments = PERIOD_KEYS.map(k => ({
    key: k,
    label: t(periodLabelKey(k)),
  }))

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.performance.back')}
            onPress={goBack}
            style={[styles.backBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.performance.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.performance.subtitle')}</Text>
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
        {/* Period switch — segmented control, accessibilityRole="tab" */}
        <View style={styles.periodWrap}>
          <PeriodSwitch
            segments={segments}
            activeKey={periodKey}
            onChange={k => onChangePeriod(k as RiderPerformancePeriodKey)}
            ariaLabel={t('rider.performance.periodSwitchAria')}
            reduced={reduced}
          />
        </View>

        {loading ? (
          <PerformanceSkeleton ariaLabel={t('rider.performance.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.performance.errorTitle')}
            subtitle={t('rider.performance.errorSubtitle')}
            retry={t('rider.performance.retry')}
            onRetry={onRefresh}
          />
        ) : overview ? (
          <View style={styles.body} nativeID="rider-performance-overview">
            {/* As-of caption — supportive framing, not a deadline */}
            <Text style={styles.asOfCaption}>
              {t('rider.performance.asOf', { date: overview.asOf })}
            </Text>

            {/* Scorecard — headline metrics, glanceable tiles */}
            <View
              accessibilityRole="summary"
              accessibilityLabel={t('rider.performance.scorecardAria', {
                period: periodLabel,
              })}
            >
              <Scorecard overview={overview} t={t} reduced={reduced} />
            </View>

            {/* Tier badge + standing line — supportive, not a leaderboard */}
            <TierStanding overview={overview} t={t} />

            {/* Detail entry points — RP2 / RP3 / RP4 */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('rider.performance.sectionDetails')}</Text>
            </View>
            <View style={styles.entriesCard}>
              <EntryRow
                icon={<Gauge size={18} color={colors.primary} />}
                iconBg={colors.primary50}
                title={t('rider.performance.entryMetrics')}
                sub={t('rider.performance.entryMetricsSub')}
                ariaLabel={t('rider.performance.entryMetricsAria')}
                onPress={() => router.push('/profile/metrics' as any)}
                reduced={reduced}
              />
              <View style={styles.entryDivider} />
              <EntryRow
                icon={<MessageSquareQuote size={18} color={colors.primary} />}
                iconBg={colors.primary50}
                title={t('rider.performance.entryRatings')}
                sub={t('rider.performance.entryRatingsSub')}
                ariaLabel={t('rider.performance.entryRatingsAria')}
                onPress={() => router.push('/profile/ratings' as any)}
                reduced={reduced}
              />
              <View style={styles.entryDivider} />
              <EntryRow
                icon={<Award size={18} color={colors.gold} />}
                iconBg={'rgba(224, 169, 59, 0.14)'}
                title={t('rider.performance.entryTier')}
                sub={t('rider.performance.entryTierSub')}
                ariaLabel={t('rider.performance.entryTierAria')}
                onPress={() => router.push('/profile/tier' as any)}
                reduced={reduced}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

/**
 * Segmented period switch (week / month / all-time).
 * Renders as a tablist with accessibilityRole="tab" per segment.
 */
function PeriodSwitch({
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
  const indicatorX = useSharedValue(activeIndex)
  const segmentWidth = useSharedValue(0)

  useEffect(() => {
    indicatorX.value = activeIndex
  }, [activeIndex])

  const indicatorStyle = useAnimatedStyle(() => {
    const x = segmentWidth.value * indicatorX.value
    return {
      transform: [
        { translateX: reduced ? x : withSpring(x, { damping: 25, stiffness: 350, mass: 0.8 }) },
      ],
    }
  })

  return (
    <View
      style={styles.periodTrack}
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
      onLayout={e => {
        segmentWidth.value = e.nativeEvent.layout.width / segments.length
      }}
    >
      <Animated.View
        style={[styles.periodIndicator, { width: segmentWidth.value || undefined }, indicatorStyle]}
        pointerEvents="none"
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
            <Text style={[styles.periodLabel, isActive && styles.periodLabelActive]} numberOfLines={1}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

/**
 * Scorecard — overall rating (stars) leads, then tabular figure tiles for
 * acceptance / completion / on-time / total deliveries. Status colors are
 * restrained: only a small dot + word carry the band, never color alone.
 */
function Scorecard({
  overview,
  t,
  reduced,
}: {
  overview: RiderPerformanceOverview
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  const rating = overview.metrics.find(m => m.id === 'rating')
  const rateMetrics = overview.metrics.filter(m => m.id !== 'rating')

  return (
    <View style={styles.scorecard}>
      {rating && (
        <RatingHero metric={rating} ratingCount={overview.ratingCount} t={t} reduced={reduced} />
      )}
      <View style={styles.tileGrid}>
        {rateMetrics.map(m => (
          <MetricTile key={m.id} metric={m} t={t} />
        ))}
      </View>
    </View>
  )
}

function RatingHero({
  metric,
  ratingCount,
  t,
  reduced,
}: {
  metric: RiderPerformanceMetric
  ratingCount: number
  t: (key: string, opts?: Record<string, unknown>) => string
  reduced: boolean
}) {
  const status = metric.status
  const visual = STATUS_VISUAL[status]
  const Icon = visual.Icon
  const stars = Math.round(metric.rawValue)
  const hint = metric.hintKey ? t(metric.hintKey, { count: ratingCount }) : ''
  const unit = t(metric.unitKey).trim()
  const aria = t('rider.performance.tileAria', {
    metric: t(metric.labelKey),
    value: metric.value,
    unit,
    status: t(statusWordKey(status)),
  })

  // Subtle entrance for the stars (supportive, not celebratory).
  const starScale = useSharedValue(reduced ? 1 : 0.96)
  useEffect(() => {
    if (reduced) {
      starScale.value = 1
      return
    }
    starScale.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.8 })
  }, [reduced])
  const starStyle = useAnimatedStyle(() => ({ transform: [{ scale: starScale.value }] }))

  return (
    <View style={styles.ratingHero} accessibilityRole="text" accessibilityLabel={aria}>
      <View style={styles.ratingHeroTop}>
        <View style={styles.ratingHeroLabelRow}>
          <Text style={styles.ratingHeroLabel}>{t(metric.labelKey)}</Text>
          <StatusPill status={status} t={t} />
        </View>
        <View style={styles.ratingHeroValueRow}>
          <Animated.View style={[styles.starsRow, starStyle]}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={18} color={colors.gold} fill={i < stars ? colors.gold : 'none'} />
            ))}
          </Animated.View>
          <Text style={styles.ratingHeroValue} accessibilityElementsHidden>
            {metric.value}
            {unit ? <Text style={styles.ratingHeroUnit}> {unit}</Text> : null}
          </Text>
        </View>
        {hint ? <Text style={styles.ratingHeroHint}>{hint}</Text> : null}
      </View>
    </View>
  )
}

function MetricTile({
  metric,
  t,
}: {
  metric: RiderPerformanceMetric
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const status = metric.status
  const visual = STATUS_VISUAL[status]
  const Icon = visual.Icon
  const hint = metric.hintKey ? t(metric.hintKey) : ''
  const unit = t(metric.unitKey).trim()
  const aria = t('rider.performance.tileAria', {
    metric: t(metric.labelKey),
    value: metric.value,
    unit,
    status: t(statusWordKey(status)),
  })

  return (
    <View style={styles.tile} accessibilityRole="text" accessibilityLabel={aria}>
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {t(metric.labelKey)}
        </Text>
        <View
          style={[styles.statusDot, { backgroundColor: visual.ring }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {metric.value}
        {unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
      </Text>
      <View style={styles.statusRow}>
        <Icon size={12} color={visual.text} />
        <Text style={[styles.statusWord, { color: visual.text }]} numberOfLines={1}>
          {t(statusWordKey(status))}
        </Text>
      </View>
      {hint ? <Text style={styles.tileHint} numberOfLines={2}>{hint}</Text> : null}
    </View>
  )
}

function StatusPill({
  status,
  t,
}: {
  status: RiderMetricStatus
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const visual = STATUS_VISUAL[status]
  const Icon = visual.Icon
  return (
    <View style={[styles.statusPill, { backgroundColor: visual.tint }]}>
      <Icon size={12} color={visual.text} />
      <Text style={[styles.statusPillText, { color: visual.text }]} numberOfLines={1}>
        {t(statusWordKey(status))}
      </Text>
    </View>
  )
}

function TierStanding({
  overview,
  t,
}: {
  overview: RiderPerformanceOverview
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const tier = overview.tier
  const tierLabel = t(tier.labelKey)
  const onTime = overview.metrics.find(m => m.id === 'on_time')?.rawValue ?? 100
  const standingKey = tier.inGoodStanding
    ? 'rider.performance.standingGood'
    : onTime < 80
      ? 'rider.performance.standingLow'
      : 'rider.performance.standingWatch'
  const standingLabel = t(standingKey)
  const standingTint = tier.inGoodStanding ? colors.primary50 : colors.warningLight
  const standingIconColor = tier.inGoodStanding ? colors.success : colors.warning

  return (
    <View
      style={[styles.tierCard, { backgroundColor: standingTint }]}
      accessibilityRole="summary"
      accessibilityLabel={t('rider.performance.tierBadgeAria', { tier: tierLabel })}
    >
      <View style={styles.tierRow}>
        <View style={styles.tierIconWrap}>
          <Award size={20} color={colors.gold} />
        </View>
        <View style={styles.tierBody}>
          <Text style={styles.tierLabel}>{t('rider.performance.tierBadge')}</Text>
          <Text style={styles.tierValue}>{tierLabel}</Text>
        </View>
        <View style={styles.tierBadgeChip}>
          <Text style={styles.tierBadgeChipText}>{tierLabel}</Text>
        </View>
      </View>
      <View style={styles.standingRow}>
        <CheckCircle2 size={14} color={standingIconColor} />
        <Text style={styles.standingText}>{standingLabel}</Text>
      </View>
    </View>
  )
}

function EntryRow({
  icon,
  iconBg,
  title,
  sub,
  ariaLabel,
  onPress,
  reduced,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  sub: string
  ariaLabel: string
  onPress: () => void
  reduced: boolean
}) {
  const chevronX = useSharedValue(0)
  const handlePressIn = () => {
    if (reduced) return
    chevronX.value = withTiming(3, { duration: 120, easing: Easing.out(Easing.ease) })
  }
  const handlePressOut = () => {
    if (reduced) return
    chevronX.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) })
  }
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ translateX: chevronX.value }] }))

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      activeOpacity={0.7}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.entryRow}
    >
      <View style={[styles.entryIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Text style={styles.entrySub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Animated.View style={chevronStyle}>
        <ChevronRight size={18} color={colors.textTertiary} />
      </Animated.View>
    </TouchableOpacity>
  )
}

function PerformanceSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={[styles.skeletonBlock, { height: 96 }]} />
      <View style={styles.skeletonTiles}>
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
      </View>
      <View style={[styles.skeletonBlock, { height: 84 }]} />
      <View style={[styles.skeletonBlock, { height: 132 }]} />
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

  // Period switch — segmented control.
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

  body: { padding: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
  asOfCaption: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },

  // Scorecard.
  scorecard: { gap: spacing[3] },
  ratingHero: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    ...shadow('md'),
  },
  ratingHeroTop: { gap: spacing[2] },
  ratingHeroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  ratingHeroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  ratingHeroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingHeroValue: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  ratingHeroUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  ratingHeroHint: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },

  // Tile grid — 2 columns, tabular figures.
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2.5] },
  tile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    gap: spacing[1.5],
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  tileUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusWord: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  tileHint: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 15,
  },

  // Status pill (used in the rating hero).
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Tier + standing.
  tierCard: {
    borderRadius: radii.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  tierIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224, 169, 59, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBody: { flex: 1, minWidth: 0 },
  tierLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  tierValue: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    marginTop: 2,
  },
  tierBadgeChip: {
    backgroundColor: colors.gold,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  tierBadgeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  standingText: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Detail entries.
  sectionHead: { marginTop: spacing[2] },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  entriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  entryDivider: { height: 1, backgroundColor: colors.borderLight },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  entrySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },

  // Skeleton + error.
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
  },
  skeletonTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  errorWrap: { padding: spacing[6], alignItems: 'center', gap: spacing[2] },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  errorSubtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
