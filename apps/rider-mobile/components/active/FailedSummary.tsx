import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  AlertTriangle,
  Store,
  Wallet,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface FailedSummaryProps {
  delivery: ActiveDelivery
  /** Fired when the rider taps "Back to Jobs". */
  onDone: () => void
}

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * RA5 — failed delivery summary.
 *
 * Shows a dignified + actionable summary after a failed delivery: the failure
 * reason, next steps (return the order to the seller and hand over to
 * dispatch), payout info (may be adjusted), and a "Back to Jobs" primary.
 */
export default function FailedSummary({ delivery, onDone }: FailedSummaryProps) {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const { payout, pickup, failureReason } = delivery

  useEffect(() => {
    analytics.track({ event: 'rider_active_failed_summary', screen: 'rider-active-delivery' })
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.failedRecorded'))
    } catch {}
  }, [t])

  const handleDone = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onDone()
  }, [reducedMotion, onDone])

  return (
    <View style={styles.wrap} testID="failed-summary">
      {/* Header */}
      <View style={styles.header} accessibilityRole="header">
        <View style={styles.headerIcon}>
          <AlertTriangle size={28} color={colors.error} />
        </View>
        <Text style={styles.headerTitle}>{t('rider.active.failedDelivery')}</Text>
        <Text style={styles.headerText}>{t('rider.active.failedRecorded')}</Text>
      </View>

      {/* Next steps card */}
      <View style={styles.stepsCard} accessibilityRole="summary">
        <Text style={styles.stepsTitle}>{t('rider.active.failedNextSteps')}</Text>

        <View style={styles.stepRow}>
          <View style={styles.stepIconWrap}>
            <Store size={18} color={colors.primary} />
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={styles.stepText}>
              {t('rider.active.failedNextStepsReturn', { seller: pickup.label })}
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepIconWrapMuted}>
            <Wallet size={18} color={colors.textMuted} />
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={styles.stepText}>
              {t('rider.active.failedNextStepsPayout', { amount: formatNpr(payout) })}
            </Text>
          </View>
        </View>

        {failureReason ? (
          <>
            <View style={styles.stepDivider} />
            <View style={styles.reasonBlock}>
              <Text style={styles.reasonLabel}>{t('rider.active.failedPlaceholder')}</Text>
              <Text style={styles.reasonText}>{failureReason}</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Primary: Back to Jobs */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.primary_failed_done_aria')}
        onPress={handleDone}
        style={styles.doneBtn}
        activeOpacity={0.85}
        testID="failed-done"
      >
        <Text style={styles.doneText}>{t('rider.active.primary_failed_done')}</Text>
        <ChevronRight size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  // Header
  header: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.error,
  },
  headerText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  // Steps card
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  stepsTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconWrapMuted: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextWrap: {
    flex: 1,
  },
  stepText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  reasonBlock: {
    gap: spacing[1],
  },
  reasonLabel: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  reasonText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  // Done button
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primaryDark,
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
