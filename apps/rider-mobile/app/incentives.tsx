import React, { useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  Trophy,
  MapPin,
  Target,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useIncentives } from '@chinooz/hooks'
import { type RiderQuest } from '@chinooz/mock-data'
import { useRiderIncentivesStore, useOnlineStatusStore } from '@chinooz/state'
import QuestCard from '../components/QuestCard'
import {
  IncentivesHubSkeleton,
  ErrorState,
  OfflineBanner,
  NewRiderState,
  NoActiveQuestsState,
} from '../components/IncentiveStates'
import { AnimatedMissionRing, ListEnter } from '../components/IncentiveMotion'
import { useAppState } from '../components/AppStateProvider'

const RING_SIZE = 88
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_RADIUS

/**
 * RI2 — Incentives & Quests hub.
 *
 * Reachable from Earnings/Home (not a bottom tab). Header summarizes active
 * progress (streak chip + today's mission ring + live-surge pill). Sections
 * show Active / Available quests using QuestCard. A small "earned this week
 * from incentives" total ties back to Earnings via the shared store. Entry
 * points link to quest detail (RI3), streaks/tiers (RI4) and surge map (RI5).
 *
 * Gold accents are reserved for reward moments (reward chip, mission ring
 * fill). The layout is calm, glanceable, and one-hand reachable (key actions
 * in the lower half).
 */
export default function IncentivesHubScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const setThisWeek = useRiderIncentivesStore(s => s.setThisWeek)
  const { connectivity } = useAppState()
  const isOffline = connectivity === 'offline'
  const onlineStatus = useOnlineStatusStore(s => s.status)
  const setOnlineStatus = useOnlineStatusStore(s => s.setOnlineStatus)

  const { data, isLoading, isError, refetch, isRefetching } = useIncentives()

  // Seed the shared "earned this week" total so the Earnings tab can read it.
  useEffect(() => {
    analytics.screen({ name: 'rider-incentives' })
  }, [])

  useEffect(() => {
    if (data) {
      const weekOf = new Date().toISOString().slice(0, 10)
      setThisWeek(data.earnings.thisWeekNpr, weekOf)
    }
  }, [data, setThisWeek])

  // Refetch on focus so surge/quest progress feels live when returning.
  useFocusEffect(
    React.useCallback(() => {
      refetch()
    }, [refetch]),
  )

  const missionPct = useMemo(() => {
    if (!data) return 0
    const { progress, goal } = data.todayMission
    return goal > 0 ? Math.min(1, progress / goal) : 0
  }, [data])

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
      statusLabel: (status: RiderQuest['status']) => {
        switch (status) {
          case 'available': return t('rider.incentives.statusAvailable')
          case 'active': return t('rider.incentives.statusActive')
          case 'completed': return t('rider.incentives.statusCompleted')
          case 'expired': return t('rider.incentives.statusExpired')
        }
      },
      statusAria: (status: RiderQuest['status']) => {
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

  const handleQuestPress = (quest: RiderQuest) => {
    // RI3 quest detail is a future route; push by id.
    try {
      AccessibilityInfo.announceForAccessibility(
        t('rider.incentives.activeQuestCtaAria', { title: quest.title }),
      )
    } catch {}
    router.push(`/quests/${quest.id}` as never)
  }

  const handleQuestClaim = (quest: RiderQuest) => {
    // Mock claim: the QuestCard handles haptics + announcement + UI state.
    // In a real app this would call a claim API and update the store.
    analytics.track({ name: 'rider_quest_claimed', properties: { questId: quest.id, rewardNpr: quest.rewardNpr } })
  }

  const openStreaks = () => {
    try {
      AccessibilityInfo.announceForAccessibility(
        t('rider.incentives.entryStreaksAria', { count: data?.streak.current ?? 0, tier: data?.streak.tier ?? '' }),
      )
    } catch {}
    router.push('/streaks' as never)
  }

  const openSurgeMap = () => {
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.incentives.entrySurgeMapAria'))
    } catch {}
    router.push('/surge-map' as never)
  }

  const kindLabel = (kind: RiderQuest['kind']) => {
    switch (kind) {
      case 'mission':
        return t('rider.incentives.questKindMission')
      case 'streak':
        return t('rider.incentives.questKindStreak')
      case 'surge':
        return t('rider.incentives.questKindSurge')
      case 'bonus':
        return t('rider.incentives.questKindBonus')
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <HeaderBar title={t('rider.incentives.title')} onBack={() => router.back()} backLabel={t('rider.incentives.back')} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[8] }]}
          showsVerticalScrollIndicator={false}
        >
          <IncentivesHubSkeleton ariaLabel={t('rider.incentives.skeletonAria')} />
        </ScrollView>
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <HeaderBar title={t('rider.incentives.title')} onBack={() => router.back()} backLabel={t('rider.incentives.back')} />
        <ErrorState
          title={t('rider.incentives.errorTitle')}
          subtitle={t('rider.incentives.errorSubtitle')}
          retryLabel={t('rider.incentives.retry')}
          retryAria={t('rider.incentives.states.retryAria')}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  const { streak, surge, todayMission, activeQuests, availableQuests, earnings } = data
  const surgeLabel = surge.active
    ? t('rider.incentives.surgePillLive', { mult: surge.multiplier, zone: surge.zoneLabel })
    : t('rider.incentives.surgePill')
  const surgeAria = surge.active
    ? t('rider.incentives.surgePillAria', {
        mult: surge.multiplier,
        zone: surge.zoneLabel,
        minutes: surge.minutesLeft,
      })
    : t('rider.incentives.surgePillAriaInactive')
  const headerAria = t('rider.incentives.headerAria', {
    streak: streak.current,
    progress: todayMission.progress,
    goal: todayMission.goal,
    surge: surge.active ? surgeLabel : t('rider.incentives.surgePillAriaInactive'),
  })
  const prominentQuest = activeQuests[0]

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <HeaderBar
        title={t('rider.incentives.title')}
        subtitle={t('rider.incentives.subtitle')}
        onBack={() => router.back()}
        backLabel={t('rider.incentives.back')}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* Offline banner */}
        {isOffline ? (
          <OfflineBanner
            title={t('rider.incentives.states.offlineTitle')}
            body={t('rider.incentives.states.offlineBody')}
            ariaLabel={t('rider.incentives.states.offlineAria')}
          />
        ) : null}

        {/* New rider intro (when no active + no available quests and offline) */}
        {activeQuests.length === 0 && availableQuests.length === 0 && onlineStatus !== 'online' ? (
          <NewRiderState
            title={t('rider.incentives.states.newRiderTitle')}
            body={t('rider.incentives.states.newRiderBody')}
            ariaLabel={t('rider.incentives.states.newRiderAria')}
            ctaLabel={t('rider.incentives.states.newRiderCta')}
            ctaAria={t('rider.incentives.states.newRiderCtaAria')}
            onCta={() => {
              setOnlineStatus('online')
              AccessibilityInfo.announceForAccessibility(t('rider.incentives.states.newRiderCtaAria'))
            }}
          />
        ) : null}

        {/* Header progress summary */}
        <View
          style={styles.summaryCard}
          accessibilityRole="header"
          accessibilityLabel={headerAria}
        >
          <View style={styles.summaryTop}>
            {/* Streak chip */}
            <TouchableOpacity
              onPress={openStreaks}
              style={styles.streakChip}
              accessibilityRole="button"
              accessibilityLabel={t('rider.incentives.streakChipAria', {
                count: streak.current,
                best: streak.best,
              })}
            >
              <Flame size={16} color={colors.warning} />
              <View style={styles.streakChipText}>
                <Text style={styles.streakChipLabel}>{t('rider.incentives.streakChip')}</Text>
                <Text style={styles.streakChipValue}>
                  {t('rider.incentives.streakDays', { count: streak.current })}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Mission ring */}
            <View
              style={styles.missionRing}
              accessibilityRole="image"
              accessibilityLabel={t('rider.incentives.missionRingAria', {
                progress: todayMission.progress,
                goal: todayMission.goal,
                pct: Math.round(missionPct * 100),
              })}
            >
              <AnimatedMissionRing pct={missionPct} size={RING_SIZE} stroke={RING_STROKE} />
              <View style={styles.missionRingCenter} pointerEvents="none">
                <Text style={styles.missionRingPct}>
                  {t('rider.incentives.missionRingPct', { pct: Math.round(missionPct * 100) })}
                </Text>
                <Text style={styles.missionRingLabel} numberOfLines={1}>
                  {t('rider.incentives.missionRing')}
                </Text>
              </View>
            </View>

            {/* Surge pill */}
            <TouchableOpacity
              onPress={openSurgeMap}
              style={[styles.surgePill, surge.active ? styles.surgePillLive : styles.surgePillIdle]}
              accessibilityRole="button"
              accessibilityLabel={surgeAria}
            >
              <Zap size={15} color={surge.active ? colors.success : colors.textTertiary} />
              <Text
                style={[styles.surgePillText, surge.active ? styles.surgePillTextLive : styles.surgePillTextIdle]}
                numberOfLines={1}
              >
                {surgeLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tier line — entry to streaks/tiers (RI4) */}
          <TouchableOpacity
            onPress={openStreaks}
            style={styles.tierRow}
            accessibilityRole="button"
            accessibilityLabel={t('rider.incentives.entryStreaksAria', {
              count: streak.current,
              tier: streak.tier,
            })}
          >
            <Trophy size={14} color={colors.gold} />
            <Text style={styles.tierText}>
              {t('rider.incentives.tierLabel', { tier: streak.tier })} · {t('rider.incentives.streakBest', { best: streak.best })}
            </Text>
            <Text style={styles.tierBonus}>
              {t('rider.incentives.tierBonus', { amount: streak.tierBonusNpr.toLocaleString('en-IN') })}
            </Text>
            <ChevronRight size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Prominent active-quest progress card */}
        {prominentQuest ? (
          <ListEnter index={0}>
            <View style={styles.prominentWrap}>
              <Text
                style={styles.sectionHeading}
                accessibilityRole="header"
                accessibilityLabel={t('rider.incentives.activeQuestTitle')}
              >
                {t('rider.incentives.activeQuestTitle')}
              </Text>
              <QuestCard
                quest={{ ...prominentQuest, description: prominentQuest.description }}
                labels={{ ...questCardLabels, kind: kindLabel(prominentQuest.kind) }}
                onPress={handleQuestPress}
                onClaim={handleQuestClaim}
                prominent
              />
            </View>
          </ListEnter>
        ) : null}

        {/* Active quests section (remaining active quests, if more than one) */}
        {activeQuests.length > 1 ? (
          <Section title={t('rider.incentives.sectionActive')} ariaLabel={t('rider.incentives.sectionActiveAria')}>
            {activeQuests.slice(1).map((q, i) => (
              <ListEnter key={q.id} index={i + 1}>
                <QuestCard
                  quest={q}
                labels={{ ...questCardLabels, kind: kindLabel(q.kind) }}
                onPress={handleQuestPress}
                onClaim={handleQuestClaim}
              />
              </ListEnter>
            ))}
          </Section>
        ) : null}

        {/* Available quests section */}
        <Section title={t('rider.incentives.sectionAvailable')} ariaLabel={t('rider.incentives.sectionAvailableAria')}>
          {availableQuests.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Target size={28} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t('rider.incentives.sectionAvailableEmpty')}</Text>
              <Text style={styles.emptySub}>{t('rider.incentives.sectionAvailableEmptySub')}</Text>
            </View>
          ) : (
            availableQuests.map(q => (
              <QuestCard
                key={q.id}
                quest={q}
                labels={{ ...questCardLabels, kind: kindLabel(q.kind) }}
                onPress={handleQuestPress}
              onClaim={handleQuestClaim}
              />
            ))
          )}
        </Section>

        {/* Earned this week from incentives — ties to Earnings */}
        <View
          style={styles.earnedCard}
          accessibilityRole="summary"
          accessibilityLabel={t('rider.incentives.earnedTotalAria', {
            amount: earnings.thisWeekNpr.toLocaleString('en-IN'),
          })}
        >
          <View style={styles.earnedHeader}>
            <Text
              style={styles.earnedHeading}
              accessibilityRole="header"
            >
              {t('rider.incentives.sectionEarned')}
            </Text>
            <Text style={styles.earnedTotal}>
              {t('rider.incentives.earnedTotal', { amount: earnings.thisWeekNpr.toLocaleString('en-IN') })}
            </Text>
          </View>
          <Text style={styles.earnedCaption}>{t('rider.incentives.earnedTotalCaption')}</Text>

          {/* Tabular breakdown */}
          <View style={styles.earnedTable}>
            <View style={styles.earnedTableHead}>
              <Text style={[styles.earnedTableCol, styles.earnedTableColLabel]}>
                {t('rider.incentives.sectionEarned')}
              </Text>
              <Text style={[styles.earnedTableCol, styles.earnedTableColValue]}>NPR</Text>
            </View>
            {earnings.breakdown.map((row, i) => (
              <View
                key={`${row.label}-${i}`}
                style={[
                  styles.earnedTableRow,
                  i === earnings.breakdown.length - 1 ? styles.earnedTableRowLast : null,
                ]}
                accessibilityRole="text"
                accessibilityLabel={t('rider.incentives.earnedBreakdownAria', {
                  label: row.label,
                  amount: row.amountNpr.toLocaleString('en-IN'),
                })}
              >
                <Text style={styles.earnedRowLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={styles.earnedRowValue}>
                  {row.amountNpr.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
            <View style={styles.earnedTableFoot}>
              <Text style={styles.earnedFootLabel}>{t('rider.incentives.earnedTotalTiedToEarnings')}</Text>
            </View>
          </View>
        </View>

        {/* Entry points to RI3/RI4/RI5 */}
        <Section title={t('rider.incentives.title')} ariaLabel={t('rider.incentives.title')}>
          <EntryRow
            icon={<Trophy size={18} color={colors.gold} />}
            label={t('rider.incentives.entryStreaks')}
            sub={t('rider.incentives.tierLabel', { tier: streak.tier })}
            ariaLabel={t('rider.incentives.entryStreaksAria', { count: streak.current, tier: streak.tier })}
            onPress={openStreaks}
          />
          <EntryRow
            icon={<MapPin size={18} color={colors.success} />}
            label={t('rider.incentives.entrySurgeMap')}
            sub={surge.active ? surgeLabel : ''}
            ariaLabel={t('rider.incentives.entrySurgeMapAria')}
            onPress={openSurgeMap}
          />
          {prominentQuest ? (
            <EntryRow
              icon={<Target size={18} color={colors.primary} />}
              label={t('rider.incentives.entryQuestDetail')}
              sub={prominentQuest.title}
              ariaLabel={t('rider.incentives.activeQuestCtaAria', { title: prominentQuest.title })}
              onPress={() => handleQuestPress(prominentQuest)}
            />
          ) : null}
        </Section>
      </ScrollView>
    </View>
  )
}

/* ---------- Header bar ---------- */

function HeaderBar({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string
  subtitle?: string
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
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerSpacer} />
    </View>
  )
}

/* ---------- Section wrapper ---------- */

function Section({
  title,
  ariaLabel,
  children,
}: {
  title: string
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text
        style={styles.sectionHeading}
        accessibilityRole="header"
        accessibilityLabel={ariaLabel}
      >
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

/* ---------- Entry row ---------- */

function EntryRow({
  icon,
  label,
  sub,
  ariaLabel,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  ariaLabel: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.entryRow}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      activeOpacity={0.9}
    >
      <View style={styles.entryIcon}>{icon}</View>
      <View style={styles.entryText}>
        <Text style={styles.entryLabel} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={styles.entrySub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
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
    gap: spacing[5],
    paddingTop: spacing[2],
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.warningLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    minHeight: 44,
    flex: 1,
  },
  streakChipText: {
    gap: 0,
  },
  streakChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  streakChipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  missionRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionRingPct: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
  },
  missionRingLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontFamily: fontFamily.sans[0],
  },
  surgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    minHeight: 36,
    flex: 1,
    maxWidth: 130,
  },
  surgePillLive: {
    backgroundColor: colors.successLight,
  },
  surgePillIdle: {
    backgroundColor: colors.borderLight,
  },
  surgePillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
    flexShrink: 1,
  },
  surgePillTextLive: {
    color: colors.success,
  },
  surgePillTextIdle: {
    color: colors.textTertiary,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    minHeight: 44,
  },
  tierText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  tierBonus: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
  },
  prominentWrap: {
    gap: spacing[2],
  },
  section: {
    gap: spacing[2],
  },
  sectionHeading: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  sectionBody: {
    gap: spacing[2.5],
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  earnedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  earnedHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  earnedHeading: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  earnedTotal: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  earnedCaption: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  earnedTable: {
    marginTop: spacing[2],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  earnedTableHead: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  earnedTableCol: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  earnedTableColLabel: {
    flex: 1,
  },
  earnedTableColValue: {
    width: 80,
    textAlign: 'right',
  },
  earnedTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  earnedTableRowLast: {
    borderBottomWidth: 0,
  },
  earnedRowLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  earnedRowValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  earnedTableFoot: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  earnedFootLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontStyle: 'italic',
    fontFamily: fontFamily.sans[0],
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryText: {
    flex: 1,
    gap: 2,
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  entrySub: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
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
    marginTop: spacing[2],
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
