import React, { useEffect, useMemo, useState } from 'react'
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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, ArrowDownWideNarrow, Target } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { getIncentives, type RiderQuest, type QuestStatus } from '@chinooz/mock-data'
import { useRiderIncentivesStore, useRiderTripsStore, computeQuestProgress } from '@chinooz/state'
import { SegmentedControl } from '@chinooz/ui'
import QuestCard, { QuestCardSkeleton } from '../../components/QuestCard'

type QuestTab = 'active' | 'available' | 'completed'
type QuestSort = 'ending_soon' | 'reward'

/**
 * RI3 — Quests list screen.
 *
 * Segmented list (Active / Available / Completed) of QuestCards with sort
 * (ending-soon / highest-reward). Reachable from the Incentives hub. Quest
 * progress is computed from the shared rider-trips store so it feels live.
 */
export default function QuestsListScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [tab, setTab] = useState<QuestTab>('active')
  const [sort, setSort] = useState<QuestSort>('ending_soon')

  const claimQuestReward = useRiderIncentivesStore(s => s.claimQuestReward)
  const isQuestClaimed = useRiderIncentivesStore(s => s.isQuestClaimed)
  const trips = useRiderTripsStore(s => ({
    tripsToday: s.tripsToday,
    tripsThisWeek: s.tripsThisWeek,
    streakDays: s.streakDays,
    peakRidesToday: s.peakRidesToday,
  }))

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['rider-incentives'],
    queryFn: getIncentives,
  })

  useEffect(() => {
    analytics.screen({ name: 'rider-quests-list' })
  }, [])

  const questCardLabels = useMemo(
    () => ({
      kind: '',
      reward: t('rider.incentives.activeQuestReward'),
      progress: (p: number, g: number) => t('rider.incentives.activeQuestProgress', { progress: p, goal: g }),
      timeLeft: (tl: string) => t('rider.incentives.activeQuestTimeLeft', { timeLeft: tl }),
      viewAria: (title: string) => t('rider.incentives.activeQuestCtaAria', { title }),
      cardAria: (title: string, p: number, g: number, reward: number, timeLeft: string) =>
        t('rider.incentives.questCardAria', { title, progress: p, goal: g, reward, timeLeft, status: '' }),
      availableAria: (title: string, reward: number, timeLeft: string) =>
        t('rider.incentives.questCardAvailableAria', { title, reward, timeLeft, status: '' }),
      statusLabel: (status: QuestStatus) => {
        switch (status) {
          case 'available': return t('rider.incentives.statusAvailable')
          case 'active': return t('rider.incentives.statusActive')
          case 'completed': return t('rider.incentives.statusCompleted')
          case 'expired': return t('rider.incentives.statusExpired')
        }
      },
      statusAria: (status: QuestStatus) => {
        switch (status) {
          case 'available': return t('rider.incentives.statusAvailableAria')
          case 'active': return t('rider.incentives.statusActiveAria')
          case 'completed': return t('rider.incentives.statusCompletedAria')
          case 'expired': return t('rider.incentives.statusExpiredAria')
        }
      },
      claim: (amount: number) => t('rider.incentives.claim', { amount }),
      claimAria: (title: string, amount: number) => t('rider.incentives.claimAria', { title, amount }),
      claiming: t('rider.incentives.claiming'),
      claimDone: t('rider.incentives.claimDone'),
      claimDoneAria: (title: string, amount: number) => t('rider.incentives.claimDoneAria', { title, amount }),
      progressEarnings: (p: number, g: number) => t('rider.incentives.progressEarnings', { progress: p, goal: g }),
      progressCountAria: (p: number, g: number, pct: number) => t('rider.incentives.progressCountAria', { progress: p, goal: g, pct }),
      progressEarningsAria: (p: number, g: number, pct: number) => t('rider.incentives.progressEarningsAria', { progress: p, goal: g, pct }),
      completedAria: (title: string, reward: number) => t('rider.incentives.questCardCompletedAria', { title, reward, status: t('rider.incentives.statusCompleted') }),
      expiredAria: (title: string, reward: number) => t('rider.incentives.questCardExpiredAria', { title, reward, status: t('rider.incentives.statusExpired') }),
      viewDetailAria: (title: string) => t('rider.incentives.viewDetailAria', { title }),
    }),
    [t],
  )

  const kindLabel = (kind: RiderQuest['kind']) => {
    switch (kind) {
      case 'mission': return t('rider.incentives.questKindMission')
      case 'streak': return t('rider.incentives.questKindStreak')
      case 'surge': return t('rider.incentives.questKindSurge')
      case 'bonus': return t('rider.incentives.questKindBonus')
    }
  }

  // Compute live progress from the trips store.
  const questsWithProgress = useMemo<RiderQuest[]>(() => {
    if (!data) return []
    const all = [...data.activeQuests, ...data.availableQuests, ...data.completedQuests]
    return all.map(q => {
      if (q.status === 'completed' || q.status === 'expired') return q
      const liveProgress = computeQuestProgress(q.kind, q.goal, trips)
      return { ...q, progress: liveProgress }
    })
  }, [data, trips])

  const { activeQuests, availableQuests, completedQuests } = useMemo(() => {
    const active = questsWithProgress.filter(q => q.status === 'active')
    const available = questsWithProgress.filter(q => q.status === 'available')
    const completed = questsWithProgress.filter(q => q.status === 'completed')
    return { activeQuests: active, availableQuests: available, completedQuests: completed }
  }, [questsWithProgress])

  const segments = useMemo(
    () => [
      { key: 'active' as const, label: t('rider.incentives.questListTabActive'), badge: activeQuests.length },
      { key: 'available' as const, label: t('rider.incentives.questListTabAvailable'), badge: availableQuests.length },
      { key: 'completed' as const, label: t('rider.incentives.questListTabCompleted'), badge: completedQuests.length },
    ],
    [t, activeQuests.length, availableQuests.length, completedQuests.length],
  )

  const sortQuests = (qs: RiderQuest[]): RiderQuest[] => {
    const sorted = [...qs]
    if (sort === 'ending_soon') {
      sorted.sort((a, b) => {
        const ae = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity
        const be = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity
        return ae - be
      })
    } else {
      sorted.sort((a, b) => b.rewardNpr - a.rewardNpr)
    }
    return sorted
  }

  const handleQuestPress = (quest: RiderQuest) => {
    router.push(`/quests/${quest.id}` as never)
  }

  const handleQuestClaim = (quest: RiderQuest) => {
    if (isQuestClaimed(quest.id)) return
    claimQuestReward(quest.id, quest.rewardNpr)
    analytics.track({ name: 'rider_quest_claimed', properties: { questId: quest.id, rewardNpr: quest.rewardNpr } })
  }

  const sortLabel = sort === 'ending_soon'
    ? t('rider.incentives.questListSortEndingSoon')
    : t('rider.incentives.questListSortReward')

  const cycleSort = () => {
    const next = sort === 'ending_soon' ? 'reward' : 'ending_soon'
    setSort(next)
    try {
      AccessibilityInfo.announceForAccessibility(
        t('rider.incentives.questListSortAria', {
          sort: next === 'ending_soon' ? t('rider.incentives.questListSortEndingSoon') : t('rider.incentives.questListSortReward'),
        }),
      )
    } catch {}
  }

  const currentQuests = tab === 'active' ? sortQuests(activeQuests) : tab === 'available' ? sortQuests(availableQuests) : sortQuests(completedQuests)

  const renderQuests = () => {
    if (currentQuests.length === 0) {
      const emptyTitle = tab === 'active'
        ? t('rider.incentives.questListEmptyActive')
        : tab === 'available'
          ? t('rider.incentives.questListEmptyAvailable')
          : t('rider.incentives.questListEmptyCompleted')
      const emptySub = tab === 'active'
        ? t('rider.incentives.questListEmptyActiveSub')
        : tab === 'available'
          ? t('rider.incentives.questListEmptyAvailableSub')
          : t('rider.incentives.questListEmptyCompletedSub')
      return (
        <View style={styles.emptyWrap}>
          <Target size={32} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySub}>{emptySub}</Text>
        </View>
      )
    }
    return currentQuests.map(q => (
      <QuestCard
        key={q.id}
        quest={q}
        labels={{ ...questCardLabels, kind: kindLabel(q.kind) }}
        onPress={handleQuestPress}
        onClaim={q.status === 'completed' && !isQuestClaimed(q.id) ? handleQuestClaim : undefined}
      />
    ))
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('rider.incentives.questListBack')}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t('rider.incentives.questListTitle')}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{t('rider.incentives.questListSubtitle')}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Segmented control */}
      <View accessibilityRole="tablist" accessibilityLabel={t('rider.incentives.questListTabAria')}>
        <SegmentedControl
          segments={segments}
          activeKey={tab}
          onChange={key => setTab(key as QuestTab)}
          testID="quests-segmented"
        />
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          onPress={cycleSort}
          style={styles.sortBtn}
          accessibilityRole="button"
          accessibilityLabel={t('rider.incentives.questListSortButtonAria', { sort: sortLabel })}
        >
          <ArrowDownWideNarrow size={15} color={colors.textSecondary} />
          <Text style={styles.sortLabel}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.skeletonWrap}>
            <QuestCardSkeleton ariaLabel={t('rider.incentives.questListSkeletonAria')} />
            <View style={{ height: spacing[2.5] }} />
            <QuestCardSkeleton ariaLabel={t('rider.incentives.questListSkeletonAria')} />
            <View style={{ height: spacing[2.5] }} />
            <QuestCardSkeleton ariaLabel={t('rider.incentives.questListSkeletonAria')} />
          </View>
        ) : isError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>{t('rider.incentives.questListErrorTitle')}</Text>
            <Text style={styles.errorSub}>{t('rider.incentives.questListErrorSub')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{t('rider.incentives.questListRetry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          renderQuests()
        )}
      </ScrollView>
    </View>
  )
}

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
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 36,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2.5],
    paddingTop: spacing[2],
  },
  skeletonWrap: {
    paddingTop: spacing[2],
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
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
