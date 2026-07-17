import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  X,
  CheckCircle2,
  Lock,
  Zap,
  TrendingUp,
  Headphones,
  Banknote,
  Package,
  Truck,
  Award,
  Crown,
  Trophy,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useRiderStreaks } from '@chinooz/hooks'
import {
  type RiderTierRung,
  type RiderMilestone,
  type RiderStreaksDetail,
} from '@chinooz/mock-data'
import { StreaksSkeleton, ErrorState, OfflineBanner } from '../components/IncentiveStates'
import { StreakFlame, ListEnter } from '../components/IncentiveMotion'
import { useAppState } from '../components/AppStateProvider'

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity)

// Gamification tier accent colors — bronze/silver/gold/platinum are
// product-domain data colors for the streaks feature, intentionally distinct
// from the @chinooz/theme brand palette. The `gold` tier value equals
// colors.gold but is kept inline here so the four tiers read as one set.
// eslint-disable-next-line no-restricted-syntax
const TIER_ACCENT: Record<string, { primary: string; light: string; dark: string }> = {
  bronze: { primary: '#B87333', light: '#FDF0E6', dark: '#8B5A2B' },
  silver: { primary: '#9CA3AF', light: '#F3F4F6', dark: '#6B7280' },
  gold: { primary: '#E0A93B', light: '#FEF6E7', dark: '#B8860B' },
  platinum: { primary: '#6B7BA8', light: '#EEF0F6', dark: '#4A5578' },
}

const PERK_ICONS: Record<string, React.ReactNode> = {
  zap: <Zap size={18} color={colors.gold} />,
  'trending-up': <TrendingUp size={18} color={colors.gold} />,
  headphones: <Headphones size={18} color={colors.gold} />,
  banknote: <Banknote size={18} color={colors.gold} />,
}

const MILESTONE_ICONS: Record<string, React.ReactNode> = {
  package: <Package size={22} color={colors.gold} />,
  flame: <Flame size={22} color={colors.warning} />,
  truck: <Truck size={22} color={colors.primary} />,
  award: <Award size={22} color={colors.textTertiary} />,
  crown: <Crown size={22} color={colors.gold} />,
  trophy: <Trophy size={22} color={colors.textTertiary} />,
}

/**
 * RI4 — Streaks & Tiers screen.
 *
 * Shows a visual streak tracker (consecutive days with a keep-streak reward),
 * a tier ladder (Bronze -> Platinum) with current tier, progress-to-next,
 * and a perks list, tasteful milestones/badges, a gentle dismissible
 * "don't break your streak" nudge (never coercive), and a tie to Performance
 * & Ratings (RP) for tier qualification. Gold is reserved for the top tier
 * and reward moments.
 */
export default function StreaksScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'

  const { data, isLoading, isError, refetch, isRefetching } = useRiderStreaks()

  useEffect(() => {
    analytics.screen({ name: 'rider-streaks' })
  }, [])

  const dismissNudge = useCallback(() => {
    setNudgeDismissed(true)
    try {
      if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }, [reduced])

  const openPerformance = useCallback(() => {
    router.push('/profile/performance' as never)
  }, [router])

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StreaksHeader
          title={t('rider.streaks.title')}
          subtitle={t('rider.streaks.subtitle')}
          onBack={() => router.back()}
          backLabel={t('rider.streaks.back')}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing[8] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <StreaksSkeleton ariaLabel={t('rider.streaks.skeletonAria')} />
        </ScrollView>
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StreaksHeader
          title={t('rider.streaks.title')}
          subtitle={t('rider.streaks.subtitle')}
          onBack={() => router.back()}
          backLabel={t('rider.streaks.back')}
        />
        <ErrorState
          title={t('rider.streaks.errorTitle')}
          subtitle={t('rider.streaks.errorSubtitle')}
          retryLabel={t('rider.streaks.retry')}
          retryAria={t('rider.incentives.states.retryAria')}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  const showNudge = !nudgeDismissed && !data.nudge.dismissed && data.currentStreak > 0
  const currentTierRung = data.tierLadder.find(r => r.isCurrent)
  const nextTierRung = data.tierLadder.find(
    r =>
      r.tier ===
      data.nextTierLabelKey
        ?.replace('rider.profile.tier', '')
        .replace('Bronze', 'bronze')
        .replace('Silver', 'silver')
        .replace('Gold', 'gold')
        .replace('Platinum', 'platinum'),
  )
  const pctLabel = `${Math.round(data.progressToNext * 100)}%`
  const currentTierLabel = t(data.currentTierLabelKey)
  const nextTierLabel = data.nextTierLabelKey ? t(data.nextTierLabelKey) : null
  const tierLadderAria = t('rider.streaks.tierLadderAria', {
    current: currentTierLabel,
    next: nextTierLabel ?? t('rider.streaks.tierProgressComplete'),
    pct: Math.round(data.progressToNext * 100),
  })

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StreaksHeader
        title={t('rider.streaks.title')}
        subtitle={t('rider.streaks.subtitle')}
        onBack={() => router.back()}
        backLabel={t('rider.streaks.back')}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Offline banner */}
        {isOffline ? (
          <OfflineBanner
            title={t('rider.streaks.states.offlineTitle')}
            body={t('rider.streaks.states.offlineBody')}
            ariaLabel={t('rider.streaks.states.offlineAria')}
          />
        ) : null}

        {/* Gentle nudge — dismissible, never coercive */}
        {showNudge ? (
          <NudgeCard
            nudgeTitleText={t('rider.streaks.nudgeTitle')}
            message={t('rider.streaks.nudgeMessage', {
              count: data.currentStreak,
              reward: data.nudge.keepRewardNpr.toLocaleString('en-IN'),
            })}
            ariaLabel={t('rider.streaks.nudgeAria', {
              count: data.currentStreak,
              reward: data.nudge.keepRewardNpr.toLocaleString('en-IN'),
            })}
            dismissLabel={t('rider.streaks.nudgeDismiss')}
            dismissAria={t('rider.streaks.nudgeDismissAria')}
            onDismiss={dismissNudge}
            reduced={reduced}
          />
        ) : null}

        {/* Streak tracker */}
        <ListEnter index={0}>
          <StreakTracker data={data} t={t} reduced={reduced} />
        </ListEnter>

        {/* Tier ladder */}
        <ListEnter index={1}>
          <View style={styles.section}>
            <Text style={styles.sectionHeading} accessibilityRole="header">
              {t('rider.streaks.tierLadderTitle')}
            </Text>
            <View
              style={styles.tierLadderCard}
              accessibilityRole="summary"
              accessibilityLabel={tierLadderAria}
            >
              {data.tierLadder.map((rung, i) => (
                <TierRungRow
                  key={rung.tier}
                  rung={rung}
                  isLast={i === data.tierLadder.length - 1}
                  t={t}
                />
              ))}
            </View>

            {/* Progress to next */}
            {nextTierRung ? (
              <View style={styles.progressCard}>
                <Text style={styles.progressLabel} accessibilityRole="header">
                  {t('rider.streaks.tierProgressLabel', { tier: nextTierLabel })}
                </Text>
                <View
                  style={styles.progressWrap}
                  accessibilityRole="progressbar"
                  accessibilityLabel={t('rider.streaks.tierProgressAria', {
                    tier: nextTierLabel,
                    pct: Math.round(data.progressToNext * 100),
                    caption: t(data.progressCaptionKey, {
                      count: 3000 - 1284,
                      tier: nextTierLabel,
                    }),
                  })}
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: Math.round(data.progressToNext * 100),
                    text: pctLabel,
                  }}
                >
                  <View
                    style={styles.progressTrack}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    <View
                      style={[styles.progressFill, { width: `${data.progressToNext * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.progressPct}>{pctLabel}</Text>
                </View>
                <Text style={styles.progressCaption}>
                  {t(data.progressCaptionKey, { count: 3000 - 1284, tier: nextTierLabel })}
                </Text>
              </View>
            ) : (
              <View style={styles.progressCard}>
                <Text style={styles.progressComplete}>
                  {t('rider.streaks.tierProgressComplete')}
                </Text>
              </View>
            )}
          </View>
        </ListEnter>

        {/* Current tier perks */}
        {data.currentPerks.length > 0 ? (
          <ListEnter index={2}>
            <View style={styles.section}>
              <Text
                style={styles.sectionHeading}
                accessibilityRole="header"
                accessibilityLabel={t('rider.streaks.perksTitleAria', { tier: currentTierLabel })}
              >
                {t('rider.streaks.perksTitle', { tier: currentTierLabel })}
              </Text>
              <View style={styles.perksCard} accessibilityRole="list">
                {data.currentPerks.map((perk, i) => (
                  <View
                    key={perk.id}
                    style={[
                      styles.perkRow,
                      i < data.currentPerks.length - 1 ? styles.perkRowBorder : null,
                    ]}
                    accessibilityLabel={t('rider.streaks.perkAria', {
                      label: t(perk.labelKey),
                      desc: t(perk.descKey),
                    })}
                  >
                    <View style={styles.perkIcon}>
                      {PERK_ICONS[perk.icon] ?? <Zap size={18} color={colors.gold} />}
                    </View>
                    <View style={styles.perkText}>
                      <Text style={styles.perkLabel}>{t(perk.labelKey)}</Text>
                      <Text style={styles.perkDesc}>{t(perk.descKey)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ListEnter>
        ) : null}

        {/* Milestones / badges */}
        <ListEnter index={3}>
          <View style={styles.section}>
            <Text
              style={styles.sectionHeading}
              accessibilityRole="header"
              accessibilityLabel={t('rider.streaks.milestonesTitleAria')}
            >
              {t('rider.streaks.milestonesTitle')}
            </Text>
            <View style={styles.milestonesGrid}>
              {data.milestones.map(ms => (
                <MilestoneCard key={ms.id} milestone={ms} t={t} />
              ))}
            </View>
          </View>
        </ListEnter>

        {/* Performance tie — how tier is calculated */}
        <TouchableOpacity
          onPress={openPerformance}
          style={styles.performanceLink}
          accessibilityRole="button"
          accessibilityLabel={t('rider.streaks.linkPerformanceAria')}
          activeOpacity={0.9}
        >
          <View style={styles.performanceLinkText}>
            <Text style={styles.performanceLinkLabel}>{t('rider.streaks.linkPerformance')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

/* ---------- Header ---------- */

function StreaksHeader({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string
  subtitle: string
  onBack: () => void
  backLabel: string
}) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      >
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitles}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  )
}

/* ---------- Nudge card ---------- */

function NudgeCard({
  message,
  nudgeTitleText,
  ariaLabel,
  dismissLabel,
  dismissAria,
  onDismiss,
  reduced,
}: {
  message: string
  nudgeTitleText: string
  ariaLabel: string
  dismissLabel: string
  dismissAria: string
  onDismiss: () => void
  reduced: boolean
}) {
  const opacity = useSharedValue(1)

  const handleDismiss = () => {
    if (reduced) {
      onDismiss()
      return
    }
    opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }, () => {
      onDismiss()
    })
  }

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[styles.nudgeCard, animStyle]}
      accessibilityRole="summary"
      accessibilityLabel={ariaLabel}
    >
      <View style={styles.nudgeBody}>
        <StreakFlame size={18} reduced={reduced}>
          <Flame size={18} color={colors.warning} />
        </StreakFlame>
        <View style={styles.nudgeText}>
          <Text style={styles.nudgeTitle}>{nudgeTitleText}</Text>
          <Text style={styles.nudgeMessage}>{message}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.nudgeDismiss}
        accessibilityRole="button"
        accessibilityLabel={dismissAria}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={16} color={colors.textTertiary} />
        <Text style={styles.nudgeDismissText}>{dismissLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

/* ---------- Streak tracker ---------- */

function StreakTracker({
  data,
  t,
  reduced,
}: {
  data: RiderStreaksDetail
  t: (k: string, opts?: Record<string, unknown>) => string
  reduced?: boolean
}) {
  const streakAria = t('rider.streaks.streakTrackerAria', {
    count: data.currentStreak,
    best: data.bestStreak,
    reward: data.streakRewardNpr.toLocaleString('en-IN'),
  })
  const cycleAria = t('rider.streaks.streakCycleAria', {
    current: data.currentStreak,
    cycle: data.streakCycleDays,
  })

  return (
    <View style={styles.streakCard} accessibilityRole="summary" accessibilityLabel={streakAria}>
      <View style={styles.streakHeader}>
        <View style={styles.streakHeaderLeft}>
          <StreakFlame size={24} reduced={reduced}>
            <Flame size={24} color={colors.warning} />
          </StreakFlame>
          <View>
            <Text style={styles.streakTitle}>{t('rider.streaks.streakTrackerTitle')}</Text>
            <Text style={styles.streakCount}>
              {t('rider.streaks.streakDays', { count: data.currentStreak })}
              {'  ·  '}
              {t('rider.streaks.streakBest', { best: data.bestStreak })}
            </Text>
          </View>
        </View>
        <View style={styles.streakRewardChip}>
          <Text style={styles.streakRewardLabel}>{t('rider.streaks.streakReward')}</Text>
          <Text style={styles.streakRewardValue}>
            {t('rider.streaks.streakRewardValue', {
              amount: data.streakRewardNpr.toLocaleString('en-IN'),
            })}
          </Text>
        </View>
      </View>

      {/* Day tracker */}
      <View
        style={styles.streakDaysRow}
        accessibilityRole="progressbar"
        accessibilityLabel={cycleAria}
        accessibilityValue={{
          min: 0,
          max: data.streakCycleDays,
          now: data.currentStreak,
          text: t('rider.streaks.streakCycleLabel', {
            current: data.currentStreak,
            cycle: data.streakCycleDays,
          }),
        }}
      >
        {data.days.map(day => (
          <View key={day.index} style={styles.streakDayCell}>
            <View
              style={[
                styles.streakDayDot,
                day.completed && styles.streakDayDotComplete,
                day.isToday && !day.completed && styles.streakDayDotToday,
              ]}
            >
              {day.completed ? (
                <CheckCircle2 size={18} color={colors.warning} />
              ) : day.isToday ? (
                <Flame size={16} color={colors.warning} />
              ) : null}
            </View>
            <Text
              style={[
                styles.streakDayLabel,
                day.completed && styles.streakDayLabelComplete,
                day.isToday && styles.streakDayLabelToday,
              ]}
            >
              {day.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.streakCycleCaption}>
        {t('rider.streaks.streakCycleLabel', {
          current: data.currentStreak,
          cycle: data.streakCycleDays,
        })}
      </Text>
    </View>
  )
}

/* ---------- Tier rung row ---------- */

function TierRungRow({
  rung,
  isLast,
  t,
}: {
  rung: RiderTierRung
  isLast: boolean
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const accent = TIER_ACCENT[rung.accent] ?? TIER_ACCENT.silver
  const tierLabel = t(rung.labelKey)

  return (
    <View
      style={[styles.tierRung, !isLast && styles.tierRungBorder]}
      accessibilityLabel={`${tierLabel}. ${rung.isCurrent ? t('rider.streaks.tierCurrent') : rung.isReached ? t('rider.streaks.tierReached') : t('rider.streaks.tierLocked')}. ${t('rider.streaks.tierMinDeliveries', { count: rung.minDeliveries })}. ${t('rider.streaks.tierEarningsBoost', { pct: rung.earningsBoostPct })}`}
    >
      <View
        style={[
          styles.tierRungBadge,
          { backgroundColor: accent.light, borderColor: accent.primary },
        ]}
      >
        {rung.isReached ? (
          <Crown size={16} color={accent.primary} />
        ) : (
          <Lock size={14} color={colors.textTertiary} />
        )}
      </View>
      <View style={styles.tierRungInfo}>
        <View style={styles.tierRungNameRow}>
          <Text
            style={[
              styles.tierRungName,
              { color: rung.isReached ? colors.text : colors.textMuted },
            ]}
          >
            {tierLabel}
          </Text>
          {rung.isCurrent ? (
            <View style={[styles.tierRungCurrentTag, { backgroundColor: accent.primary }]}>
              <Text style={styles.tierRungCurrentText}>{t('rider.streaks.tierCurrent')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.tierRungMeta}>
          {t('rider.streaks.tierMinDeliveries', {
            count: rung.minDeliveries.toLocaleString('en-IN'),
          })}
          {'  ·  '}
          {t('rider.streaks.tierEarningsBoost', { pct: rung.earningsBoostPct })}
        </Text>
      </View>
    </View>
  )
}

/* ---------- Milestone card ---------- */

function MilestoneCard({
  milestone,
  t,
}: {
  milestone: RiderMilestone
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const label = t(milestone.labelKey)
  const desc = t(milestone.descKey)
  const statusText = milestone.earned
    ? milestone.earnedAt
      ? t('rider.streaks.milestoneEarnedOn', { date: milestone.earnedAt })
      : t('rider.streaks.milestoneEarned')
    : milestone.progress != null
      ? t('rider.streaks.milestoneInProgress')
      : t('rider.streaks.milestoneLocked')

  const ariaLabel = t('rider.streaks.milestoneAria', { label, desc, status: statusText })

  return (
    <View
      style={[styles.milestoneCard, !milestone.earned && styles.milestoneCardLocked]}
      accessibilityLabel={ariaLabel}
    >
      <View style={[styles.milestoneIcon, milestone.earned && styles.milestoneIconEarned]}>
        {MILESTONE_ICONS[milestone.icon] ?? <Award size={22} color={colors.textTertiary} />}
      </View>
      <Text
        style={[styles.milestoneLabel, !milestone.earned && styles.milestoneLabelLocked]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={styles.milestoneStatus} numberOfLines={1}>
        {statusText}
      </Text>
      {!milestone.earned && milestone.progress != null ? (
        <View
          style={styles.milestoneProgress}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <View style={styles.milestoneProgressTrack}>
            <View
              style={[
                styles.milestoneProgressFill,
                { width: `${(milestone.progress ?? 0) * 100}%` },
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    paddingTop: spacing[2],
  },
  // Nudge
  nudgeCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing[3.5],
    gap: spacing[2],
  },
  nudgeBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  nudgeText: {
    flex: 1,
    gap: 2,
  },
  nudgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  nudgeMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  nudgeDismiss: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-end',
    minHeight: 36,
    paddingHorizontal: spacing[2],
  },
  nudgeDismissText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Streak tracker
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
    ...shadow('sm'),
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  streakHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  streakTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  streakCount: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: 2,
  },
  streakRewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: 'rgba(224, 169, 59, 0.12)',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  streakRewardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  streakRewardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  streakDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[1],
  },
  streakDayCell: {
    alignItems: 'center',
    gap: spacing[1],
    flex: 1,
  },
  streakDayDot: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  streakDayDotComplete: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  streakDayDotToday: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderWidth: 2,
  },
  streakDayLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  streakDayLabelComplete: {
    color: colors.text,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  streakDayLabelToday: {
    color: colors.warning,
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },
  streakCycleCaption: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  // Section
  section: {
    gap: spacing[2],
  },
  sectionHeading: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  // Tier ladder
  tierLadderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  tierRung: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  tierRungBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tierRungBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tierRungInfo: {
    flex: 1,
    gap: 2,
  },
  tierRungNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tierRungName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },
  tierRungCurrentTag: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  tierRungCurrentText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  tierRungMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Progress card
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
    ...shadow('sm'),
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  progressWrap: {
    gap: spacing[1.5],
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  progressCaption: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  progressComplete: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Perks
  perksCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadow('sm'),
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 56,
  },
  perkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224, 169, 59, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    flex: 1,
    gap: 2,
  },
  perkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  perkDesc: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Milestones
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  milestoneCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[1.5],
    alignItems: 'center',
    ...shadow('sm'),
  },
  milestoneCardLocked: {
    opacity: 0.65,
  },
  milestoneIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  milestoneIconEarned: {
    backgroundColor: 'rgba(224, 169, 59, 0.14)',
  },
  milestoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  milestoneLabelLocked: {
    color: colors.textMuted,
  },
  milestoneStatus: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  milestoneProgress: {
    width: '100%',
    marginTop: spacing[1],
  },
  milestoneProgressTrack: {
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  // Performance link
  performanceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    minHeight: 52,
    ...shadow('sm'),
  },
  performanceLinkText: {
    flex: 1,
  },
  performanceLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Skeleton + error
  skeletonBlock: {
    height: 160,
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  errorSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
