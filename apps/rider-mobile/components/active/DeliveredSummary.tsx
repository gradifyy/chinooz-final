import React, { useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  ReduceMotion,
  withDelay,
} from 'react-native-reanimated'
import {
  Wallet,
  Banknote,
  Clock,
  ChevronRight,
  PartyPopper,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface DeliveredSummaryProps {
  delivery: ActiveDelivery
  /** Fired when the rider taps "Back to Jobs". */
  onDone: () => void
}

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

/**
 * RA5 — delivered completion summary.
 *
 * Shows a celebration milestone (success haptic + announce, respects
 * reduced-motion), earnings for this trip, COD amount recorded (to be settled
 * to the wallet), trip duration, and a "Back to Jobs" primary that returns
 * the rider to the Jobs listening state.
 */
export default function DeliveredSummary({ delivery, onDone }: DeliveredSummaryProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const { payout, isCod, codAmount, startedAt, completedAt } = delivery

  const durationMs = useMemo(() => {
    const end = completedAt ?? Date.now()
    return Math.max(0, end - startedAt)
  }, [startedAt, completedAt])

  // Celebration: success haptic + announce on mount (reduced-motion aware).
  // The celebration icon scales in with a spring + the earnings card fades up.
  const iconScale = useSharedValue(0)
  const cardOpacity = useSharedValue(0)
  const cardTranslateY = useSharedValue(12)

  useEffect(() => {
    analytics.track({ event: 'rider_active_delivered_summary', screen: 'rider-active-delivery' })
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.deliveredCelebration'))
    } catch {}
    if (reducedMotion) {
      iconScale.value = 1
      cardOpacity.value = 1
      cardTranslateY.value = 0
    } else {
      iconScale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
        mass: 0.8,
        reduceMotion: ReduceMotion.System,
      })
      cardOpacity.value = withDelay(200, withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }))
      cardTranslateY.value = withDelay(200, withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }))
    }
  }, [reducedMotion, t, iconScale, cardOpacity, cardTranslateY])

  // COD-collected feedback: an additional success haptic + announce when
  // COD was collected for this delivery.
  useEffect(() => {
    if (isCod && codAmount > 0 && !reducedMotion) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.active.deliveredCodAmount', { amount: formatNpr(codAmount) }),
        )
      } catch {}
    }
  }, [isCod, codAmount, reducedMotion, t])

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }))
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }))

  const handleDone = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onDone()
  }, [reducedMotion, onDone])

  return (
    <View style={styles.wrap} testID="delivered-summary">
      {/* Celebration header */}
      <View style={styles.celebration} accessibilityRole="header">
        <Animated.View style={[styles.celebrationIcon, iconAnimStyle]}>
          <PartyPopper size={28} color={colors.success} />
        </Animated.View>
        <Text style={styles.celebrationTitle}>{t('rider.active.deliveredTitle')}</Text>
        <Text style={styles.celebrationText}>{t('rider.active.deliveredCelebration')}</Text>
      </View>

      {/* Earnings summary */}
      <Animated.View style={[styles.earningsCard, cardAnimStyle]} accessibilityRole="summary">
        <View style={styles.earningRow}>
          <View style={styles.earningIconWrap}>
            <Wallet size={18} color={colors.primary} />
          </View>
          <View style={styles.earningTextWrap}>
            <Text style={styles.earningLabel}>{t('rider.active.deliveredEarnings')}</Text>
          </View>
          <Text style={styles.earningValue}>{formatNpr(payout)}</Text>
        </View>

        {/* COD recorded */}
        <View style={styles.earningDivider} />
        {isCod && codAmount > 0 ? (
          <View style={styles.earningRow}>
            <View style={styles.earningIconWrapCod}>
              <Banknote size={18} color={colors.gold} />
            </View>
            <View style={styles.earningTextWrap}>
              <Text style={styles.earningLabel}>{t('rider.active.deliveredCodRecorded')}</Text>
              <Text style={styles.earningSubLabel}>
                {t('rider.active.deliveredCodAmount', { amount: formatNpr(codAmount) })}
              </Text>
            </View>
            <View style={styles.codPill}>
              <Text style={styles.codPillText}>{formatNpr(codAmount)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.earningRow}>
            <View style={styles.earningIconWrapMuted}>
              <Banknote size={18} color={colors.textMuted} />
            </View>
            <View style={styles.earningTextWrap}>
              <Text style={styles.earningLabelMuted}>{t('rider.active.deliveredCodNone')}</Text>
            </View>
          </View>
        )}

        {/* Trip duration */}
        <View style={styles.earningDivider} />
        <View style={styles.earningRow}>
          <View style={styles.earningIconWrapMuted}>
            <Clock size={18} color={colors.textMuted} />
          </View>
          <View style={styles.earningTextWrap}>
            <Text style={styles.earningLabel}>{t('rider.active.deliveredDuration')}</Text>
          </View>
          <Text style={styles.earningValueMuted}>{formatDuration(durationMs)}</Text>
        </View>
      </Animated.View>

      {/* Listening indicator */}
      <View style={styles.listeningRow}>
        <View style={styles.listeningDot} />
        <Text style={styles.listeningText}>{t('rider.active.deliveredListening')}</Text>
      </View>

      {/* Primary: Back to Jobs */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.deliveredDoneAria')}
        onPress={handleDone}
        style={styles.doneBtn}
        activeOpacity={0.85}
        testID="delivered-done"
      >
        <Text style={styles.doneText}>{t('rider.active.deliveredDone')}</Text>
        <ChevronRight size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  // Celebration
  celebration: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  celebrationIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTitle: {
    fontSize: fontSize.xl[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.success,
  },
  celebrationText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  // Earnings card
  earningsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  earningIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningIconWrapCod: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224,169,59,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningIconWrapMuted: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningTextWrap: {
    flex: 1,
    gap: 1,
  },
  earningLabel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  earningLabelMuted: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  earningSubLabel: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  earningValue: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.primary,
  },
  earningValueMuted: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.textSecondary,
  },
  earningDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  codPill: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.md,
  },
  codPillText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  // Listening
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  listeningText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
  // Done button
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    width: '100%',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 60,
    ...shadows.md,
  },
  doneText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})
