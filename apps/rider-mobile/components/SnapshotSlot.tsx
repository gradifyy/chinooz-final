import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Wallet, Bike, Clock, CheckCircle } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontFamily, fontSize, duration, easing } from '@chinooz/theme'
import { Skeleton } from '@chinooz/ui'
import { useA11y } from './A11yProvider'
import {
  useRiderEarnings,
  useRiderPerformance,
  useIncentives,
} from '@chinooz/hooks'
import { useOnlineStatusStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'
import { RIDER_PERFORMANCE_PERIODS } from '@chinooz/mock-data'

interface SnapshotSlotProps {
  title: string
}

/**
 * RH2 — Today's snapshot strip on Home.
 *
 * Compact stat tiles (earnings, trips, online time, acceptance rate) with
 * tabular figures, a gold-accent goal/progress bar tied to today's mission
 * from Incentives, and full-tile deep-link taps to Earnings / Incentives.
 *
 * Data sources (all mock, wired via TanStack Query):
 *  - useRiderEarnings()       → today's earned NPR + trips (RH8)
 *  - useRiderPerformance()    → acceptance rate (week period)
 *  - useIncentives()          → today's mission progress/goal + reward
 *  - useOnlineStatusStore()   → online-time seconds today
 *
 * Loading renders a skeleton strip (aria-busy). Error renders a calm retry.
 */
export default function SnapshotSlot({ title }: SnapshotSlotProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()

  const earningsQuery = useRiderEarnings()
  const performanceQuery = useRiderPerformance(RIDER_PERFORMANCE_PERIODS[0])
  const incentivesQuery = useIncentives()
  const onlineSecondsToday = useOnlineStatusStore(s => s.onlineSecondsToday)

  const todayPeriod = useMemo(
    () => earningsQuery.data?.periods.find(p => p.range.key === 'today') ?? null,
    [earningsQuery.data],
  )

  const acceptanceMetric = useMemo(
    () => performanceQuery.data?.metrics.find(m => m.id === 'acceptance') ?? null,
    [performanceQuery.data],
  )

  const mission = incentivesQuery.data?.todayMission ?? null
  const activeMissionQuest = useMemo(
    () =>
      incentivesQuery.data?.activeQuests.find(
        q => q.kind === 'mission' && q.status === 'active',
      ) ?? null,
    [incentivesQuery.data],
  )

  const onlineTimeText = useMemo(() => {
    const total = Math.floor(onlineSecondsToday / 60)
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    return t('rider.home.hoursShort', { hours, minutes })
  }, [onlineSecondsToday, t])

  const isLoading =
    earningsQuery.isLoading || performanceQuery.isLoading || incentivesQuery.isLoading
  const isError =
    earningsQuery.isError || performanceQuery.isError || incentivesQuery.isError

  const retry = useCallback(() => {
    earningsQuery.refetch()
    performanceQuery.refetch()
    incentivesQuery.refetch()
  }, [earningsQuery, performanceQuery, incentivesQuery])

  const goEarnings = useCallback(() => router.push('/earnings'), [router])
  const goIncentives = useCallback(() => router.push('/incentives'), [router])

  if (isError) {
    return (
      <View style={styles.card} accessibilityRole="summary">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.errorTitle}>{t('rider.home.snapErrorTitle')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.snapErrorRetry')}
          style={[styles.retryBtn, { minHeight: minTouchTarget }]}
          onPress={retry}
        >
          <Text style={styles.retryText}>{t('rider.home.snapErrorRetry')}</Text>
        </Pressable>
      </View>
    )
  }

  if (isLoading) {
    return <SnapshotSkeleton title={title} ariaLabel={t('rider.home.snapSkeletonAria')} />
  }

  const earnedNpr = todayPeriod?.earned ?? 0
  const trips = todayPeriod?.trips ?? 0
  const acceptancePct = acceptanceMetric?.rawValue ?? 0
  const acceptanceLabel = acceptanceMetric?.value ?? '—'

  const goalProgress = mission?.progress ?? 0
  const goalTotal = mission?.goal ?? 0
  const goalPct = goalTotal > 0 ? Math.min(1, goalProgress / goalTotal) : 0
  const goalPctRounded = Math.round(goalPct * 100)
  const goalDone = goalProgress >= goalTotal && goalTotal > 0
  const goalReward = activeMissionQuest?.rewardNpr ?? 0

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>

      {/* Stat tiles — 2x2 grid, full-tile tap targets */}
      <View style={styles.tileGrid}>
        <StatTile
          icon={<Wallet size={16} color={colors.success} />}
          value={formatNPR(earnedNpr)}
          label={t('rider.home.snapTileEarnings')}
          caption={t('rider.home.snapTileEarningsCaption')}
          ariaLabel={t('rider.home.snapEarningsAria', { amount: earnedNpr.toLocaleString('en-IN') })}
          onPress={goEarnings}
          minTouchTarget={minTouchTarget}
        />
        <StatTile
          icon={<Bike size={16} color={colors.primary} />}
          value={String(trips)}
          label={t('rider.home.snapTileTrips')}
          caption={t('rider.home.snapTileTripsCaption')}
          ariaLabel={t('rider.home.snapTripsAria', { count: trips })}
          onPress={goEarnings}
          minTouchTarget={minTouchTarget}
        />
        <StatTile
          icon={<Clock size={16} color={colors.info} />}
          value={onlineTimeText}
          label={t('rider.home.snapTileOnline')}
          caption={t('rider.home.snapTileOnlineCaption')}
          ariaLabel={t('rider.home.snapOnlineAria', { value: onlineTimeText })}
          onPress={undefined}
          minTouchTarget={minTouchTarget}
        />
        <StatTile
          icon={<CheckCircle size={16} color={colors.gold} />}
          value={acceptanceLabel}
          label={t('rider.home.snapTileAcceptance')}
          caption={t('rider.home.snapTileAcceptanceCaption')}
          ariaLabel={t('rider.home.snapAcceptanceAria', { value: acceptancePct })}
          onPress={goEarnings}
          minTouchTarget={minTouchTarget}
        />
      </View>

      {/* Goal / progress — gold accent, deep-link to Incentives */}
      {goalTotal > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.snapProgressAria', {
            progress: goalProgress,
            goal: goalTotal,
            pct: goalPctRounded,
            reward: goalReward,
          })}
          accessibilityHint={t('rider.home.snapDeepLinkIncentives')}
          style={[styles.progressWrap, { minHeight: minTouchTarget }]}
          onPress={goIncentives}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressGoalLabel}>{t('rider.home.snapProgressGoal')}</Text>
            <Text style={styles.progressReward}>
              {t('rider.home.snapProgressReward', { amount: goalReward })}
            </Text>
          </View>
          <GoalBar progress={goalPct} done={goalDone} reducedMotion={reducedMotion} />
          <View style={styles.progressFooter}>
            <Text style={styles.progressLabel}>
              {goalDone
                ? t('rider.home.snapProgressDone')
                : t('rider.home.snapProgressLabel', { progress: goalProgress, goal: goalTotal })}
            </Text>
            <Text style={styles.progressPct}>
              {t('rider.home.snapProgressPct', { pct: goalPctRounded })}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

function StatTile({
  icon,
  value,
  label,
  caption,
  ariaLabel,
  onPress,
  minTouchTarget,
}: {
  icon: React.ReactNode
  value: string
  label: string
  caption: string
  ariaLabel: string
  onPress?: () => void
  minTouchTarget: number
}) {
  const inner = (
    <>
      <View style={styles.tileIconRow}>
        {icon}
        <Text style={styles.tileCaption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        style={({ pressed }) => [
          styles.tile,
          styles.tilePressable,
          { minHeight: minTouchTarget },
          pressed && styles.tilePressed,
        ]}
        onPress={onPress}
      >
        {inner}
      </Pressable>
    )
  }

  return (
    <View style={styles.tile} accessibilityRole="text" accessibilityLabel={ariaLabel}>
      {inner}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Goal bar — thin, gold accent, animated fill
// ---------------------------------------------------------------------------

function GoalBar({
  progress,
  done,
  reducedMotion,
}: {
  progress: number
  done: boolean
  reducedMotion: boolean
}) {
  const width = useSharedValue(reducedMotion ? progress : 0)

  React.useEffect(() => {
    if (reducedMotion) {
      width.value = progress
    } else {
      width.value = withTiming(progress, {
        duration: duration.slow,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.System,
      })
    }
  }, [progress, reducedMotion])

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(width.value * 100)}%`,
  }))

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[styles.barFill, done && styles.barFillDone, barStyle]}
      />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SnapshotSkeleton({ title, ariaLabel }: { title: string; ariaLabel: string }) {
  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={ariaLabel}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.tileGrid}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.tile}>
            <View style={styles.tileIconRow}>
              <Skeleton width={16} height={16} borderRadius={radii.full} />
              <Skeleton width={50} height={10} />
            </View>
            <View style={{ marginTop: spacing[2] }}>
              <Skeleton width={70} height={20} />
            </View>
            <View style={{ marginTop: spacing[1] }}>
              <Skeleton width={40} height={11} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.skeletonProgress}>
        <Skeleton width="100%" height={8} borderRadius={radii.full} />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[3],
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[1],
  },
  tilePressable: {
    justifyContent: 'flex-start',
  },
  tilePressed: {
    opacity: 0.85,
  },
  tileIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  tileCaption: {
    fontSize: 10,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
    marginTop: spacing[1],
  },
  tileLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Progress
  progressWrap: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2],
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressGoalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  progressReward: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  barFillDone: {
    backgroundColor: colors.success,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  // Skeleton
  skeletonProgress: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  // Error
  errorTitle: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginBottom: spacing[3],
  },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
