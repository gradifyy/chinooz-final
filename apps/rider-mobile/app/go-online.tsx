import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  CircleCheck,
  Circle,
  PartyPopper,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, easing } from '@chinooz/theme'
import { getGoOnlineChecklist, type GoOnlineCheckItem } from '@chinooz/mock-data/api'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { analytics } from '@chinooz/analytics'

/**
 * RO7 — Go-online checklist.
 *
 * Shows a checkable list of prerequisites (profile complete, docs verified,
 * bank/payout added, vehicle ready). Incomplete items link out to their
 * respective screens. When all items are complete, a celebratory "Start
 * earning" CTA takes the rider to the jobs board (Home).
 */
export default function GoOnlineScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const [items, setItems] = useState<GoOnlineCheckItem[]>([])
  const [, setLoading] = useState(true)
  const [allComplete, setAllComplete] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'rider-go-online' })
    loadChecklist()
  }, [])

  const loadChecklist = useCallback(async () => {
    try {
      const result = await getGoOnlineChecklist('rider-1')
      setItems(result.items)
      setAllComplete(result.allComplete)
    } catch {
      // Fallback: empty checklist
    } finally {
      setLoading(false)
    }
  }, [])

  const handleItemPress = useCallback(
    (item: GoOnlineCheckItem) => {
      if (item.completed || !item.actionRoute) return
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      analytics.track({ name: 'rider_go_online_item_tap', properties: { key: item.key } })
      router.push(item.actionRoute as never)
    },
    [router],
  )

  const handleStartEarning = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {}
    analytics.track({ name: 'rider_go_online_start_earning' })
    router.replace('/jobs')
  }, [router])

  const handleBack = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.back()
  }, [router])

  // Celebration animation
  const celebrateScale = useSharedValue(reduced ? 1 : 0.8)
  const celebrateOpacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (allComplete && !reduced) {
      celebrateScale.value = withSpring(1, { damping: 15, stiffness: 300 })
      celebrateOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.Never,
      })
    }
  }, [allComplete, reduced])

  const celebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.value }],
    opacity: celebrateOpacity.value,
  }))

  const startBtnScale = useSharedValue(1)
  const onPressInStart = useCallback(() => {
    if (reduced) return
    startBtnScale.value = withSpring(0.97, { damping: 18, stiffness: 400 })
  }, [reduced])
  const onPressOutStart = useCallback(() => {
    if (reduced) return
    startBtnScale.value = withSpring(1, { damping: 18, stiffness: 400 })
  }, [reduced])
  const startBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: startBtnScale.value }],
  }))

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.documents.backAria')}
          >
            <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('rider.goOnline.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {t('rider.goOnline.subtitle')}
        </Text>

        {/* Checklist items */}
        <View style={styles.checklist} accessibilityRole="summary">
          {items.map(item => (
            <ChecklistItem
              key={item.key}
              label={t(item.labelKey)}
              completed={item.completed}
              actionLabel={t('rider.goOnline.completeItem')}
              actionRoute={item.actionRoute}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>

        {/* All complete → celebration */}
        {allComplete ? (
          <Animated.View style={[styles.celebrationCard, celebrateStyle]} accessibilityRole="summary">
            <View style={styles.celebrationIconWrap}>
              <PartyPopper size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.celebrationTitle} accessibilityRole="header">
              {t('rider.goOnline.celebrationTitle')}
            </Text>
            <Text style={styles.celebrationBody}>
              {t('rider.goOnline.celebrationBody')}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Footer with Start earning CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Animated.View style={[styles.startBtnWrap, startBtnStyle]}>
          <TouchableOpacity
            onPressIn={onPressInStart}
            onPressOut={onPressOutStart}
            onPress={handleStartEarning}
            style={[styles.startBtn, !allComplete && styles.startBtnDisabled]}
            activeOpacity={0.85}
            disabled={!allComplete}
            accessibilityRole="button"
            accessibilityLabel={t('rider.goOnline.celebrationGoAria')}
          >
            <Sparkles size={20} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.startBtnText}>
              {allComplete ? t('rider.goOnline.celebrationGo') : t('rider.goOnline.startEarning')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  )
}

// ----- Sub-components ----------------------------------------------------

function ChecklistItem({
  label,
  completed,
  actionLabel,
  actionRoute,
  onPress,
}: {
  label: string
  completed: boolean
  actionLabel: string
  actionRoute?: string
  onPress: () => void
}) {
  const isActionable = !completed && !!actionRoute

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isActionable}
      style={[styles.checklistItem, completed && styles.checklistItemComplete]}
      activeOpacity={0.85}
      accessibilityRole="summary"
      accessibilityLabel={`${label}, ${completed ? 'Complete' : 'Incomplete'}`}
    >
      <View style={[styles.checklistIcon, completed && styles.checklistIconComplete]}>
        {completed ? (
          <CircleCheck size={22} color={colors.success} strokeWidth={2.5} />
        ) : (
          <Circle size={22} color={colors.border} strokeWidth={2} />
        )}
      </View>
      <Text
        style={[styles.checklistLabel, completed && styles.checklistLabelComplete]}
      >
        {label}
      </Text>
      {isActionable ? (
        <View style={styles.checklistAction}>
          <Text style={styles.checklistActionText}>
            {actionLabel}
          </Text>
          <ChevronRight size={16} color={colors.primary} strokeWidth={2.5} />
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  backBtnPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  // Checklist
  checklist: {
    gap: spacing[2.5],
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    gap: spacing[3],
  },
  checklistItemComplete: {
    borderColor: colors.successLight,
    backgroundColor: colors.successLight,
  },
  checklistIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistIconComplete: {},
  checklistLabel: {
    flex: 1,
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  checklistLabelComplete: {
    color: colors.text,
  },
  checklistAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  checklistActionText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Celebration
  celebrationCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  celebrationIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  celebrationBody: {
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
  },
  // Footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  startBtnWrap: {
    width: '100%',
  },
  startBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
