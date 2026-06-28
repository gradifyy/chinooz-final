import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Target, X, ChevronRight } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useIncentives } from '@chinooz/hooks'

/**
 * RH5 — Incentive/quest progress nudge.
 *
 * A small, dismissible card showing today's mission progress (from the
 * Incentives hub). Links to Incentives for the full view. Dismissable so
 * it's a helpful nudge, not a nag.
 */
export default function IncentiveNudge() {
  const { t } = useTranslation()
  const router = useRouter()
  const { minTouchTarget } = useA11y()
  const incentivesQuery = useIncentives()

  const [dismissed, setDismissed] = useState(false)

  const mission = incentivesQuery.data?.todayMission ?? null
  const activeQuest = incentivesQuery.data?.activeQuests.find(
    q => q.kind === 'mission' && q.status === 'active',
  )

  const handleOpen = useCallback(() => router.push('/incentives'), [router])
  const handleDismiss = useCallback(() => setDismissed(true), [])

  if (dismissed || !mission || incentivesQuery.isLoading || incentivesQuery.isError) return null

  const progress = mission.progress
  const goal = mission.goal
  const reward = activeQuest?.rewardNpr ?? 0
  const isDone = progress >= goal && goal > 0
  const pct = goal > 0 ? Math.min(1, progress / goal) : 0

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isDone
            ? t('rider.home.incentiveNudgeDoneAria', { reward })
            : t('rider.home.incentiveNudgeAria', { progress, goal, reward })
        }
        style={[styles.card, { minHeight: minTouchTarget }]}
        onPress={handleOpen}
      >
        <View style={[styles.iconWrap, isDone && styles.iconWrapDone]}>
          <Target size={16} color={isDone ? colors.success : colors.gold} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{t('rider.home.incentiveNudgeTitle')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isDone
              ? t('rider.home.incentiveNudgeDone')
              : t('rider.home.incentiveNudgeBody', { progress, goal, reward })}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, isDone && styles.barFillDone, { width: `${Math.round(pct * 100)}%` }]}
            />
          </View>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.home.incentiveNudgeDismissAria')}
        style={[styles.dismiss, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        onPress={handleDismiss}
        hitSlop={8}
      >
        <X size={16} color={colors.textTertiary} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  card: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1,
    borderColor: colors.borderLight, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5],
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: radii.full,
    backgroundColor: 'rgba(224, 169, 59, 0.12)', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapDone: { backgroundColor: colors.successLight },
  body: { flex: 1, gap: spacing[1] },
  title: { fontSize: 12, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  subtitle: { fontSize: 11, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  barTrack: { height: 4, borderRadius: radii.full, backgroundColor: colors.borderLight, overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: radii.full, backgroundColor: colors.gold },
  barFillDone: { backgroundColor: colors.success },
  dismiss: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.full },
})
