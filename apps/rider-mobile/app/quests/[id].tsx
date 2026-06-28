import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  AccessibilityInfo,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Flame,
  Zap,
  Target,
  Gift,
  Trophy,
  Clock,
  CheckCircle2,
  CircleSlash,
  CirclePlay,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getQuestById,
  claimQuestReward,
  joinQuest,
  type RiderQuest,
  type QuestKind,
  type QuestStatus,
} from '@chinooz/mock-data'
import { useRiderIncentivesStore, useRiderTripsStore, computeQuestProgress } from '@chinooz/state'

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity)

const KIND_ICON: Record<QuestKind, React.ReactNode> = {
  mission: <Target size={20} color={colors.primary} />,
  streak: <Flame size={20} color={colors.warning} />,
  surge: <Zap size={20} color={colors.success} />,
  bonus: <Gift size={20} color={colors.gold} />,
}

const KIND_LABEL_KEY: Record<QuestKind, string> = {
  mission: 'rider.incentives.questKindMission',
  streak: 'rider.incentives.questKindStreak',
  surge: 'rider.incentives.questKindSurge',
  bonus: 'rider.incentives.questKindBonus',
}

const STATUS_META: Record<QuestStatus, { icon: React.ReactNode; bg: string; fg: string }> = {
  available: { icon: <CirclePlay size={14} color={colors.info} />, bg: colors.infoLight, fg: colors.info },
  active: { icon: <Target size={14} color={colors.primary} />, bg: colors.primary50, fg: colors.primary },
  completed: { icon: <CheckCircle2 size={14} color={colors.success} />, bg: colors.successLight, fg: colors.success },
  expired: { icon: <CircleSlash size={14} color={colors.textTertiary} />, bg: colors.borderLight, fg: colors.textMuted },
}

const STATUS_LABEL_KEY: Record<QuestStatus, string> = {
  available: 'rider.incentives.statusAvailable',
  active: 'rider.incentives.statusActive',
  completed: 'rider.incentives.statusCompleted',
  expired: 'rider.incentives.statusExpired',
}

/**
 * RI3 — Quest detail screen.
 *
 * Full terms (how to qualify, time window, reward, fine print), live progress
 * computed from the shared rider-trips store, a join button for opt-in
 * quests, and a claim button when complete. Claim records the reward toward
 * Earnings via the shared incentives store (one source of truth).
 */
export default function QuestDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const queryClient = useQueryClient()
  const params = useLocalSearchParams<{ id: string }>()

  const claimQuestStore = useRiderIncentivesStore(s => s.claimQuestReward)
  const isQuestClaimed = useRiderIncentivesStore(s => s.isQuestClaimed)
  const alreadyClaimed = useRiderIncentivesStore(s =>
    params.id ? !!s.claimedQuests[params.id] : false,
  )
  const trips = useRiderTripsStore(s => ({
    tripsToday: s.tripsToday,
    tripsThisWeek: s.tripsThisWeek,
    streakDays: s.streakDays,
    peakRidesToday: s.peakRidesToday,
  }))

  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'joined'>('idle')
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed'>('idle')
  const [claimResultVisible, setClaimResultVisible] = useState(false)

  const { data: quest, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['rider-quest', params.id],
    queryFn: () => getQuestById(params.id),
    enabled: !!params.id,
  })

  useEffect(() => {
    analytics.screen({ name: 'rider-quest-detail', properties: { questId: params.id } })
  }, [params.id])

  // Live progress from the trips store.
  const liveProgress = useMemo(() => {
    if (!quest || quest.status === 'completed' || quest.status === 'expired') return quest?.progress ?? 0
    return computeQuestProgress(quest.kind, quest.goal, trips)
  }, [quest, trips])

  const pct = quest && quest.goal > 0 ? Math.min(1, liveProgress / quest.goal) : 0
  const pctLabel = `${Math.round(pct * 100)}%`

  const isCompleted = quest?.status === 'completed'
  const isAvailable = quest?.status === 'available'
  const isOptIn = quest?.terms.optIn ?? false
  const canClaim = isCompleted && !alreadyClaimed && !isQuestClaimed(quest?.id ?? '')

  // Claim mutation — mock claimQuestReward → record to store.
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!quest) return null
      return claimQuestReward(quest.id)
    },
    onSuccess: result => {
      if (!result || !quest) return
      claimQuestStore(quest.id, result.rewardNpr)
      setClaimState('claimed')
      setClaimResultVisible(true)
      try {
        if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.incentives.questDetailClaimedAria', { title: quest.title, amount: result.rewardNpr }),
        )
      } catch {}
      analytics.track({ name: 'rider_quest_claimed', properties: { questId: quest.id, rewardNpr: result.rewardNpr } })
      queryClient.invalidateQueries({ queryKey: ['rider-incentives'] })
      setTimeout(() => setClaimResultVisible(false), 4000)
    },
  })

  // Join mutation — mock joinQuest.
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!quest) return null
      return joinQuest(quest.id)
    },
    onSuccess: result => {
      if (!result || !quest) return
      setJoinState('joined')
      try {
        if (!reduced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.incentives.questDetailJoinedAria', { title: quest.title }),
        )
      } catch {}
      analytics.track({ name: 'rider_quest_joined', properties: { questId: quest.id } })
      queryClient.invalidateQueries({ queryKey: ['rider-incentives'] })
      queryClient.invalidateQueries({ queryKey: ['rider-quest', params.id] })
    },
  })

  const handleClaim = useCallback(() => {
    if (claimState !== 'idle' || !canClaim) return
    setClaimState('claiming')
    claimMutation.mutate()
  }, [claimState, canClaim, claimMutation])

  const handleJoin = useCallback(() => {
    if (joinState !== 'idle') return
    setJoinState('joining')
    joinMutation.mutate()
  }, [joinState, joinMutation])

  // Button animations.
  const btnScale = useSharedValue(1)
  const handlePressIn = () => {
    if (reduced) return
    btnScale.value = withSpring(0.97, { damping: 14, stiffness: 400 })
  }
  const handlePressOut = () => {
    if (reduced) return
    btnScale.value = withSpring(1, { damping: 14, stiffness: 400 })
  }
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }))

  // Claim result pop.
  const resultOpacity = useSharedValue(0)
  const resultScale = useSharedValue(0.9)
  useEffect(() => {
    if (claimResultVisible) {
      resultOpacity.value = reduced ? 1 : withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) })
      resultScale.value = reduced ? 1 : withSpring(1, { damping: 12, stiffness: 300 })
    } else {
      resultOpacity.value = withTiming(0, { duration: 200 })
    }
  }, [claimResultVisible, reduced])
  const resultAnimStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }],
  }))

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <DetailHeader title={t('rider.incentives.questDetailTitle')} onBack={() => router.back()} backLabel={t('rider.incentives.questDetailBack')} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
          showsVerticalScrollIndicator={false}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('rider.incentives.questDetailSkeletonAria')}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.skeletonBlock} />
          <View style={styles.skeletonBlock} />
          <View style={styles.skeletonBlock} />
        </ScrollView>
      </View>
    )
  }

  if (isError || !quest) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <DetailHeader title={t('rider.incentives.questDetailTitle')} onBack={() => router.back()} backLabel={t('rider.incentives.questDetailBack')} />
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>{t('rider.incentives.questDetailNotFound')}</Text>
          <Text style={styles.errorSub}>{t('rider.incentives.questDetailNotFoundSub')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>{t('rider.incentives.questDetailBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const kindLabel = t(KIND_LABEL_KEY[quest.kind])
  const statusMeta = STATUS_META[quest.status]
  const statusLabel = t(STATUS_LABEL_KEY[quest.status])
  const progressText = t('rider.incentives.activeQuestProgress', { progress: liveProgress, goal: quest.goal })
  const progressAria = t('rider.incentives.questDetailProgressAria', {
    progress: liveProgress,
    goal: quest.goal,
    pct: Math.round(pct * 100),
  })

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <DetailHeader title={t('rider.incentives.questDetailTitle')} onBack={() => router.back()} backLabel={t('rider.incentives.questDetailBack')} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[12] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* Quest header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.kindRow}>
              {KIND_ICON[quest.kind]}
              <Text style={styles.kindLabel}>{kindLabel}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
              {statusMeta.icon}
              <Text style={[styles.statusText, { color: statusMeta.fg }]}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questDesc}>{quest.description}</Text>

          {isOptIn && joinState !== 'joined' ? (
            <View style={styles.optInBadge}>
              <Text style={styles.optInBadgeText}>{t('rider.incentives.questDetailOptInBadge')}</Text>
            </View>
          ) : null}

          {/* Reward chip */}
          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Trophy size={16} color={colors.gold} />
              <Text style={styles.rewardLabel}>{t('rider.incentives.questDetailRewardLabel')}</Text>
              <Text style={styles.rewardValue}>
                NPR {quest.rewardNpr.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Live progress */}
        {quest.status !== 'expired' ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressHeading} accessibilityRole="header">
              {t('rider.incentives.questDetailProgressLabel')}
            </Text>
            <View
              style={styles.progressWrap}
              accessibilityRole="progressbar"
              accessibilityLabel={progressAria}
              accessibilityValue={{ min: 0, max: quest.goal, now: liveProgress, text: progressText }}
            >
              <View style={styles.progressTrack} accessibilityElementsHidden importantForAccessibility="no">
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct * 100}%`,
                      backgroundColor: isCompleted ? colors.success : colors.gold,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressText}>{progressText}</Text>
                <Text style={[styles.progressPct, isCompleted && { color: colors.success }]}>
                  {pctLabel}
                </Text>
              </View>
            </View>
            {isCompleted ? (
              <Text style={styles.progressComplete}>{t('rider.incentives.questDetailProgressComplete')}</Text>
            ) : isAvailable ? (
              <Text style={styles.progressNotStarted}>{t('rider.incentives.questDetailProgressNotStarted')}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Time window */}
        <View style={styles.termsCard}>
          <View style={styles.windowRow}>
            <Clock size={16} color={colors.textMuted} />
            <View style={styles.windowText}>
              <Text style={styles.windowLabel}>{t('rider.incentives.questDetailWindowLabel')}</Text>
              <Text style={styles.windowValue}>{quest.terms.timeWindow}</Text>
            </View>
          </View>
        </View>

        {/* How to qualify */}
        <View style={styles.termsCard}>
          <Text
            style={styles.termsHeading}
            accessibilityRole="header"
            accessibilityLabel={t('rider.incentives.questDetailTermsSectionAria')}
          >
            {t('rider.incentives.questDetailTermsSection')}
          </Text>
          <View accessibilityRole="list">
            {quest.terms.howToQualify.map((step, i) => (
              <View key={i} style={styles.termsRow} accessibilityRole="listitem">
                <View style={styles.termsBullet}>
                  <Text style={styles.termsBulletText}>{i + 1}</Text>
                </View>
                <Text style={styles.termsText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fine print */}
        <View style={styles.termsCard}>
          <Text
            style={styles.termsHeading}
            accessibilityRole="header"
            accessibilityLabel={t('rider.incentives.questDetailFinePrintSectionAria')}
          >
            {t('rider.incentives.questDetailFinePrintSection')}
          </Text>
          <View accessibilityRole="list">
            {quest.terms.finePrint.map((note, i) => (
              <View key={i} style={styles.termsRow} accessibilityRole="listitem">
                <View style={styles.termsDot} />
                <Text style={styles.termsText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar: Join or Claim */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing[3] }]}>
        {/* Claim result announcement (role=status) */}
        {claimResultVisible && quest ? (
          <Animated.View
            style={[styles.claimResult, resultAnimStyle]}
            accessibilityRole="status"
            accessibilityLiveRegion="polite"
          >
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={styles.claimResultText}>
              {t('rider.incentives.questDetailClaimResult', { amount: quest.rewardNpr.toLocaleString('en-IN') })}
            </Text>
          </Animated.View>
        ) : null}

        {isAvailable && isOptIn && joinState !== 'joined' ? (
          <AnimatedPressable
            onPress={handleJoin}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={joinState !== 'idle'}
            accessibilityRole="button"
            accessibilityLabel={t('rider.incentives.questDetailJoinAria', { title: quest.title })}
            accessibilityState={{ disabled: joinState !== 'idle', busy: joinState === 'joining' }}
            style={[styles.actionBtn, styles.joinBtn, btnAnimStyle]}
          >
            {joinState === 'joining' ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.actionBtnText}>{t('rider.incentives.questDetailJoin')}</Text>
            )}
          </AnimatedPressable>
        ) : isCompleted && alreadyClaimed ? (
          <View style={[styles.actionBtn, styles.claimedBtn]} accessibilityRole="text">
            <Trophy size={18} color={colors.white} />
            <Text style={styles.actionBtnText}>{t('rider.incentives.questDetailClaimed')}</Text>
          </View>
        ) : canClaim ? (
          <AnimatedPressable
            onPress={handleClaim}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={claimState !== 'idle'}
            accessibilityRole="button"
            accessibilityLabel={t('rider.incentives.questDetailClaimAria', { title: quest.title, amount: quest.rewardNpr })}
            accessibilityState={{ disabled: claimState !== 'idle', busy: claimState === 'claiming' }}
            style={[styles.actionBtn, styles.claimBtn, btnAnimStyle]}
          >
            {claimState === 'claiming' ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Trophy size={18} color={colors.white} />
                <Text style={styles.actionBtnText}>
                  {t('rider.incentives.questDetailClaim', { amount: quest.rewardNpr.toLocaleString('en-IN') })}
                </Text>
              </>
            )}
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  )
}

/* ---------- Header ---------- */

function DetailHeader({
  title,
  onBack,
  backLabel,
}: {
  title: string
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
      </View>
      <View style={styles.headerSpacer} />
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
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingTop: spacing[2],
  },
  // Header card
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    ...shadow('sm'),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  kindLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    minHeight: 26,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  questTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    lineHeight: fontSize.xl[1],
  },
  questDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  optInBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  optInBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.info,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: 'rgba(224, 169, 59, 0.12)',
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
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
  progressHeading: {
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
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontVariant: ['tabular-nums'],
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  progressComplete: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  progressNotStarted: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  // Terms cards
  termsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    ...shadow('sm'),
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  windowText: {
    flex: 1,
    gap: 2,
  },
  windowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  windowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  termsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
  },
  termsBullet: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsBulletText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  termsDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.textTertiary,
    marginTop: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  // Action bar
  actionBar: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    minHeight: 52,
    borderRadius: radii.lg,
  },
  joinBtn: {
    backgroundColor: colors.primary,
  },
  claimBtn: {
    backgroundColor: colors.gold,
  },
  claimedBtn: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  claimResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  claimResultText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
    fontVariant: ['tabular-nums'],
  },
  // Skeleton + error
  skeletonBlock: {
    height: 140,
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
