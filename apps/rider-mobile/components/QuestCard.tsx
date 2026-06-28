import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  ActivityIndicator,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  ReduceMotion,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import {
  ChevronRight,
  Flame,
  Zap,
  Target,
  Gift,
  CircleCheck,
  CircleSlash,
  CirclePlay,
  Trophy,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import type { RiderQuest, QuestStatus } from '@chinooz/mock-data'

/**
 * QuestCard — RI2 quest card.
 *
 * Renders a single quest across four variants (count-based / mission,
 * earnings-based, peak-hour / surge, streak) and four statuses (available,
 * active, completed, expired). Gold is reserved for reward moments: the
 * reward chip, the progress fill, and the claim CTA. Status is conveyed
 * with an icon + text pill (semantic, not color-only) so it is legible in
 * sunlight and to screen readers.
 *
 * When a quest is `completed`, a distinct Claim CTA appears. Pressing it
 * fires a success haptic, announces the claim, and calls `onClaim`. The
 * card tap itself opens quest detail (RI3) via `onPress`.
 *
 * A skeleton variant (`QuestCardSkeleton`) is exported for loading states.
 */

export interface QuestCardLabels {
  /** Kind label, e.g. "Mission", "Streak". */
  kind: string
  /** Reward label, e.g. "Reward". */
  reward: string
  /** Progress text for count-based quests, e.g. "6 of 10". */
  progress: (p: number, g: number) => string
  /** Time-left text, e.g. "7h 12m left". */
  timeLeft: (t: string) => string
  /** Legacy aria for the view-quest action. */
  viewAria: (title: string) => string
  /** Legacy aria for an in-progress card. */
  cardAria: (title: string, p: number, g: number, reward: number, timeLeft: string) => string
  /** Legacy aria for an available card. */
  availableAria: (title: string, reward: number, timeLeft: string) => string
  /** Status label for the pill, e.g. "Active". */
  statusLabel?: (status: QuestStatus) => string
  /** Status aria for screen readers, e.g. "Status: active, in progress". */
  statusAria?: (status: QuestStatus) => string
  /** Claim CTA text, e.g. "Claim NPR 150". */
  claim?: (amount: number) => string
  /** Claim CTA aria-label. */
  claimAria?: (title: string, amount: number) => string
  /** Claiming (in-flight) text. */
  claiming?: string
  /** Claim-done button text, e.g. "Claimed". */
  claimDone?: string
  /** Claim-done announcement for screen readers. */
  claimDoneAria?: (title: string, amount: number) => string
  /** Progress text for earnings-based quests, e.g. "NPR 450 of NPR 1000". */
  progressEarnings?: (p: number, g: number) => string
  /** Progress aria for count-based quests. */
  progressCountAria?: (p: number, g: number, pct: number) => string
  /** Progress aria for earnings-based quests. */
  progressEarningsAria?: (p: number, g: number, pct: number) => string
  /** Aria for a completed card. */
  completedAria?: (title: string, reward: number) => string
  /** Aria for an expired card. */
  expiredAria?: (title: string, reward: number) => string
  /** Aria for the open-detail action. */
  viewDetailAria?: (title: string) => string
}

interface QuestCardProps {
  quest: RiderQuest
  /** i18n labels resolved by the parent screen. */
  labels: QuestCardLabels
  /** Card tap opens quest detail (RI3). */
  onPress: (quest: RiderQuest) => void
  /** Claim CTA tap; called when a completed quest's reward is claimed. */
  onClaim?: (quest: RiderQuest) => void
  /** Highlight as the prominent active card (gold reward accents). */
  prominent?: boolean
}

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity)

const KIND_ICON: Record<RiderQuest['kind'], React.ReactNode> = {
  mission: <Target size={16} color={colors.primary} />,
  streak: <Flame size={16} color={colors.warning} />,
  surge: <Zap size={16} color={colors.success} />,
  bonus: <Gift size={16} color={colors.gold} />,
}

const STATUS_META: Record<
  QuestStatus,
  { icon: React.ReactNode; bg: string; fg: string; border: string }
> = {
  available: {
    icon: <CirclePlay size={13} color={colors.info} />,
    bg: colors.infoLight,
    fg: colors.info,
    border: colors.infoLight,
  },
  active: {
    icon: <Target size={13} color={colors.primary} />,
    bg: colors.primary50,
    fg: colors.primary,
    border: colors.primary50,
  },
  completed: {
    icon: <CircleCheck size={13} color={colors.success} />,
    bg: colors.successLight,
    fg: colors.success,
    border: colors.successLight,
  },
  expired: {
    icon: <CircleSlash size={13} color={colors.textTertiary} />,
    bg: colors.borderLight,
    fg: colors.textMuted,
    border: colors.borderLight,
  },
}

export default function QuestCard({
  quest,
  labels,
  onPress,
  onClaim,
  prominent = false,
}: QuestCardProps) {
  const reduced = useReducedMotion()
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const pct = quest.goal > 0 ? Math.min(1, quest.progress / quest.goal) : 0
  const pctLabel = `${Math.round(pct * 100)}%`
  const isAvailable = quest.status === 'available'
  const isCompleted = quest.status === 'completed'
  const isExpired = quest.status === 'expired'
  const isEarnings = quest.kind === 'bonus'

  const statusText = labels.statusLabel
    ? labels.statusLabel(quest.status)
    : quest.status.charAt(0).toUpperCase() + quest.status.slice(1)
  const statusAriaText = labels.statusAria
    ? labels.statusAria(quest.status)
    : `Status: ${quest.status}`

  // Card aria-label: title + reward + progress + status.
  const ariaLabel = buildCardAria(quest, labels, statusAriaText)

  // Press-scale for the card.
  const scale = useSharedValue(1)
  const claimScale = useSharedValue(1)
  const checkPop = useSharedValue(0)

  const handlePressIn = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(0.98, { damping: 16, stiffness: 400 })
  }, [reduced])

  const handlePressOut = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 16, stiffness: 400 })
  }, [reduced])

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handleClaim = useCallback(() => {
    if (claiming || claimed) return
    setClaiming(true)
    try {
      if (!reduced) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    // Simulate the claim round-trip.
    setTimeout(() => {
      setClaiming(false)
      setClaimed(true)
      try {
        if (!reduced) {
          runOnJS(announceClaim)(quest, labels)
        } else {
          announceClaim(quest, labels)
        }
      } catch {}
      if (!reduced) {
        checkPop.value = withTiming(1, {
          duration: 300,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        })
      }
      onClaim?.(quest)
    }, 700)
  }, [claiming, claimed, reduced, quest, labels, onClaim, checkPop])

  const handleClaimPressIn = useCallback(() => {
    if (reduced) return
    claimScale.value = withSpring(0.96, { damping: 14, stiffness: 400 })
  }, [reduced])

  const handleClaimPressOut = useCallback(() => {
    if (reduced) return
    claimScale.value = withSpring(1, { damping: 14, stiffness: 400 })
  }, [reduced])

  const claimAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: claimScale.value }],
  }))

  const progressText = isEarnings && labels.progressEarnings
    ? labels.progressEarnings(quest.progress, quest.goal)
    : labels.progress(quest.progress, quest.goal)

  const progressAria = isEarnings && labels.progressEarningsAria
    ? labels.progressEarningsAria(quest.progress, quest.goal, Math.round(pct * 100))
    : labels.progressCountAria
      ? labels.progressCountAria(quest.progress, quest.goal, Math.round(pct * 100))
      : `${progressText}, ${pctLabel}`

  const statusMeta = STATUS_META[quest.status]

  return (
    <AnimatedPressable
      onPress={() => onPress(quest)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityHint={labels.viewDetailAria?.(quest.title)}
      style={[styles.card, prominent && styles.cardProminent, cardAnimStyle]}
    >
      {/* Top row: kind chip + status pill */}
      <View style={styles.topRow}>
        <View style={styles.kindRow}>
          {KIND_ICON[quest.kind]}
          <Text style={styles.kindLabel} numberOfLines={1}>
            {labels.kind}
          </Text>
        </View>
        <View
          style={[styles.statusPill, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}
          accessibilityRole="text"
          accessibilityLabel={statusAriaText}
        >
          {statusMeta.icon}
          <Text style={[styles.statusText, { color: statusMeta.fg }]} numberOfLines={1}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* Title + description */}
      <Text style={styles.title} numberOfLines={2}>
        {quest.title}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>
        {quest.description}
      </Text>

      {/* Progress bar (hidden for available + expired) */}
      {!isAvailable && !isExpired ? (
        <View
          style={styles.progressWrap}
          accessibilityRole="progressbar"
          accessibilityLabel={progressAria}
          accessibilityValue={{ min: 0, max: quest.goal, now: quest.progress, text: progressText }}
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
      ) : null}

      {/* Time window / expiry */}
      {quest.timeLeftLabel ? (
        <Text style={[styles.timeLeft, isExpired && styles.timeLeftExpired]} numberOfLines={1}>
          {isExpired ? quest.timeLeftLabel : labels.timeLeft(quest.timeLeftLabel)}
        </Text>
      ) : null}

      {/* Bottom row: reward chip + claim CTA or chevron */}
      <View style={styles.bottomRow}>
        <View style={[styles.rewardChip, isExpired && styles.rewardChipExpired]}>
          <Text style={[styles.rewardLabel, isExpired && { color: colors.textTertiary }]}>
            {labels.reward}
          </Text>
          <Text style={[styles.rewardValue, isExpired && { color: colors.textTertiary }]}>
            NPR {quest.rewardNpr.toLocaleString('en-IN')}
          </Text>
        </View>

        {isCompleted && onClaim ? (
          <Animated.View style={claimAnimStyle}>
            <TouchableOpacity
              onPress={handleClaim}
              onPressIn={handleClaimPressIn}
              onPressOut={handleClaimPressOut}
              disabled={claiming || claimed}
              accessibilityRole="button"
              accessibilityLabel={
                claimed
                  ? labels.claimDoneAria?.(quest.title, quest.rewardNpr) ?? 'Reward claimed'
                  : labels.claimAria?.(quest.title, quest.rewardNpr) ?? 'Claim reward'
              }
              accessibilityState={{ disabled: claiming || claimed, busy: claiming }}
              style={[styles.claimBtn, claimed && styles.claimBtnDone]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {claiming ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : claimed ? (
                <>
                  <Trophy size={15} color={colors.white} />
                  <Text style={styles.claimTextDone}>
                    {labels.claimDone ?? 'Claimed'}
                  </Text>
                </>
              ) : (
                <Text style={styles.claimText}>
                  {labels.claim?.(quest.rewardNpr) ?? `Claim NPR ${quest.rewardNpr}`}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.chevronWrap} accessibilityElementsHidden importantForAccessibility="no">
            <ChevronRight size={18} color={isExpired ? colors.textTertiary : colors.textTertiary} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  )
}

function buildCardAria(
  quest: RiderQuest,
  labels: QuestCardLabels,
  statusAria: string,
): string {
  const reward = `NPR ${quest.rewardNpr.toLocaleString('en-IN')}`
  const timeLeft = quest.timeLeftLabel ?? ''
  if (quest.status === 'completed' && labels.completedAria) {
    return labels.completedAria(quest.title, quest.rewardNpr)
  }
  if (quest.status === 'expired' && labels.expiredAria) {
    return labels.expiredAria(quest.title, quest.rewardNpr)
  }
  if (quest.status === 'available') {
    if (labels.availableAria) {
      // Inject status into the legacy aria if the caller didn't include it.
      const base = labels.availableAria(quest.title, quest.rewardNpr, timeLeft)
      return base.includes('Status:') ? base : `${base} ${statusAria}.`
    }
    return `${quest.title}. Reward ${reward}. ${timeLeft}. ${statusAria}.`
  }
  if (labels.cardAria) {
    const base = labels.cardAria(quest.title, quest.progress, quest.goal, quest.rewardNpr, timeLeft)
    return base.includes('Status:') ? base : `${base} ${statusAria}.`
  }
  return `${quest.title}. ${quest.progress} of ${quest.goal}. Reward ${reward}. ${timeLeft}. ${statusAria}.`
}

function announceClaim(quest: RiderQuest, labels: QuestCardLabels) {
  try {
    const msg = labels.claimDoneAria?.(quest.title, quest.rewardNpr) ?? 'Reward claimed'
    AccessibilityInfo.announceForAccessibility(msg)
  } catch {}
}

/* ---------- Skeleton ---------- */

export function QuestCardSkeleton({ ariaLabel = 'Loading quest' }: { ariaLabel?: string }) {
  return (
    <View
      style={styles.card}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      <View style={styles.topRow}>
        <View style={styles.skeletonKind} />
        <View style={styles.skeletonPill} />
      </View>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonDesc} />
      <View style={styles.skeletonBar} />
      <View style={styles.skeletonBottomRow}>
        <View style={styles.skeletonReward} />
        <View style={styles.skeletonChevron} />
      </View>
    </View>
  )
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
    ...shadow('sm'),
  },
  cardProminent: {
    borderColor: colors.gold,
    borderWidth: 1.5,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderWidth: 1,
    minHeight: 24,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  title: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    lineHeight: fontSize.md[1],
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  progressWrap: {
    gap: spacing[1.5],
    marginTop: spacing[1],
  },
  progressTrack: {
    height: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
    fontVariant: ['tabular-nums'],
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  timeLeft: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  timeLeftExpired: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
    gap: spacing[2],
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: 'rgba(224, 169, 59, 0.12)',
    borderRadius: radii.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  rewardChipExpired: {
    backgroundColor: colors.borderLight,
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  rewardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  chevronWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    minHeight: 40,
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    backgroundColor: colors.gold,
  },
  claimBtnDone: {
    backgroundColor: colors.success,
  },
  claimText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
    fontVariant: ['tabular-nums'],
  },
  claimTextDone: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Skeleton
  skeletonKind: {
    width: 80,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.shimmer,
  },
  skeletonPill: {
    width: 72,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.shimmer,
  },
  skeletonTitle: {
    width: '85%',
    height: 18,
    borderRadius: radii.sm,
    backgroundColor: colors.shimmer,
  },
  skeletonDesc: {
    width: '70%',
    height: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.shimmer,
  },
  skeletonBar: {
    width: '100%',
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.shimmer,
  },
  skeletonBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  skeletonReward: {
    width: 120,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: colors.shimmer,
  },
  skeletonChevron: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.shimmer,
  },
})
