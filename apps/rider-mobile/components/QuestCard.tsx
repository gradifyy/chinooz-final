import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronRight, Flame, Zap, Target, Gift } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import type { RiderQuest } from '@chinooz/mock-data'

interface QuestCardProps {
  quest: RiderQuest
  /** i18n labels resolved by the parent screen. */
  labels: {
    kind: string
    reward: string
    progress: (p: number, g: number) => string
    timeLeft: (t: string) => string
    viewAria: (title: string) => string
    cardAria: (title: string, p: number, g: number, reward: number, timeLeft: string) => string
    availableAria: (title: string, reward: number, timeLeft: string) => string
  }
  onPress: (quest: RiderQuest) => void
  /** Highlight as the prominent active card (gold reward accents). */
  prominent?: boolean
}

const KIND_ICON: Record<RiderQuest['kind'], React.ReactNode> = {
  mission: <Target size={16} color={colors.primary} />,
  streak: <Flame size={16} color={colors.warning} />,
  surge: <Zap size={16} color={colors.success} />,
  bonus: <Gift size={16} color={colors.gold} />,
}

export default function QuestCard({
  quest,
  labels,
  onPress,
  prominent = false,
}: QuestCardProps) {
  const pct = quest.goal > 0 ? Math.min(1, quest.progress / quest.goal) : 0
  const pctLabel = `${Math.round(pct * 100)}%`
  const isAvailable = quest.status === 'available'

  const ariaLabel = isAvailable
    ? labels.availableAria(quest.title, quest.rewardNpr, quest.timeLeftLabel ?? '')
    : labels.cardAria(
        quest.title,
        quest.progress,
        quest.goal,
        quest.rewardNpr,
        quest.timeLeftLabel ?? '',
      )

  return (
    <TouchableOpacity
      onPress={() => onPress(quest)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      style={[styles.card, prominent && styles.cardProminent]}
    >
      <View style={styles.topRow}>
        <View style={styles.kindRow}>
          {KIND_ICON[quest.kind]}
          <Text style={styles.kindLabel} numberOfLines={1}>
            {labels.kind}
          </Text>
        </View>
        {quest.timeLeftLabel ? (
          <Text style={styles.timeLeft} numberOfLines={1}>
            {labels.timeLeft(quest.timeLeftLabel)}
          </Text>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {quest.title}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>
        {quest.description}
      </Text>

      {!isAvailable ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack} accessibilityElementsHidden importantForAccessibility="no">
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressText}>
              {labels.progress(quest.progress, quest.goal)}
            </Text>
            <Text style={styles.progressPct}>{pctLabel}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.rewardChip}>
          <Text style={styles.rewardLabel}>{labels.reward}</Text>
          <Text style={styles.rewardValue}>
            NPR {quest.rewardNpr.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.chevronWrap} accessibilityElementsHidden importantForAccessibility="no">
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardProminent: {
    borderColor: colors.gold,
    borderWidth: 1.5,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
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
  timeLeft: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
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
    backgroundColor: colors.gold,
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
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
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
  },
  chevronWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
