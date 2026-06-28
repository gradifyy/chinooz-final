import React, { useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Landmark,
  ShieldCheck,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useCodLimitStatus } from '@chinooz/state'
import { formatRiderNPRAmount } from '@chinooz/mock-data'
import type { CODLimitStatusKind } from '@chinooz/mock-data'

/**
 * RW6 — COD limit meter + collection-status module.
 *
 * Glanceable horizontal bar: cash-in-hand vs the max allowed COD float.
 * Three status states — healthy / approaching / at-limit — drive the color,
 * icon and copy (never color-only). At-limit is clear but not punishing: the
 * unblock path (Deposit cash) is the obvious primary action.
 *
 * Reads the shared `codWalletStatus` store via `useCodLimitStatus` so the
 * same status that gates COD jobs in Jobs/Active Delivery is shown here.
 */

interface StatusVisual {
  color: string
  light: string
  Icon: React.ComponentType<{ size?: number; color?: string }>
}

const STATUS_VISUAL: Record<CODLimitStatusKind, StatusVisual> = {
  healthy: { color: colors.success, light: colors.successLight, Icon: CheckCircle2 },
  approaching: { color: colors.warning, light: colors.warningLight, Icon: AlertTriangle },
  atLimit: { color: colors.error, light: colors.errorLight, Icon: Lock },
}

interface CODLimitMeterProps {
  /** Show the deposit-to-unlock CTA (default true). Hidden in compact contexts. */
  showDepositCta?: boolean
}

export default function CODLimitMeter({ showDepositCta = true }: CODLimitMeterProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const status = useCodLimitStatus()

  const visual = STATUS_VISUAL[status.kind]
  const { Icon } = visual

  const statusLabel =
    status.kind === 'healthy'
      ? t('rider.wallet.statusHealthy')
      : status.kind === 'approaching'
        ? t('rider.wallet.statusApproaching')
        : t('rider.wallet.statusAtLimit')

  const statusAria =
    status.kind === 'healthy'
      ? t('rider.wallet.statusHealthyAria')
      : status.kind === 'approaching'
        ? t('rider.wallet.statusApproachingAria')
        : t('rider.wallet.statusAtLimitAria')

  const meterAria = t('rider.wallet.limitMeterAria', {
    current: formatRiderNPRAmount(status.cashInHand),
    limit: formatRiderNPRAmount(status.maxCodFloat),
    percent: status.percent,
    status: statusAria,
  })

  const onDeposit = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    router.push('/wallet/deposit' as never)
  }, [router, reducedMotion])

  const showNudge = status.kind !== 'healthy'
  const nudgeText =
    status.kind === 'atLimit'
      ? t('rider.wallet.nudgeAtLimit')
      : t('rider.wallet.nudgeApproaching')

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={meterAria}
      style={styles.card}
    >
      {/* Header row — section title + status badge (icon + text, not color-only) */}
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('rider.wallet.limitSectionTitle')}
        </Text>
        <View
          accessibilityRole="summary"
          accessibilityLabel={statusAria}
          accessibilityLiveRegion="polite"
          style={[styles.statusBadge, { backgroundColor: visual.light }]}
        >
          <Icon size={13} color={visual.color} />
          <Text style={[styles.statusText, { color: visual.color }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Meter — glanceable horizontal bar */}
      <View style={styles.meterWrap}>
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${status.percent}%`,
                backgroundColor: visual.color,
              },
            ]}
          />
        </View>
        <View style={styles.meterLabels}>
          <Text style={styles.meterCurrent}>
            NPR {formatRiderNPRAmount(status.cashInHand)}
          </Text>
          <Text style={styles.meterMax}>
            {t('rider.wallet.limitMaxLabel')} NPR {formatRiderNPRAmount(status.maxCodFloat)}
          </Text>
        </View>
      </View>

      {/* Headroom line */}
      <Text style={styles.headroomText}>
        {t('rider.wallet.limitHeadroom', { amount: formatRiderNPRAmount(status.headroom) })}
      </Text>

      {/* Nudge — approaching/at-limit only */}
      {showNudge && (
        <View
          accessibilityRole="summary"
          accessibilityLabel={
            status.kind === 'atLimit' ? t('rider.wallet.nudgeAtLimitAria') : nudgeText
          }
          style={[styles.nudgeRow, { backgroundColor: visual.light }]}
        >
          <Icon size={14} color={visual.color} />
          <Text style={[styles.nudgeText, { color: visual.color }]}>{nudgeText}</Text>
        </View>
      )}

      {/* Deposit-to-unlock CTA — obvious unblock path, plum primary */}
      {showDepositCta && showNudge && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.wallet.depositToUnlockAria', {
            amount: formatRiderNPRAmount(status.cashInHand),
            limit: formatRiderNPRAmount(status.maxCodFloat),
          })}
          onPress={onDeposit}
          style={[styles.depositBtn, { minHeight: minTouchTarget }]}
          activeOpacity={0.9}
        >
          <Landmark size={18} color={colors.white} />
          <Text style={styles.depositText}>{t('rider.wallet.depositToUnlock')}</Text>
        </TouchableOpacity>
      )}

      {/* Explainer — why the limit exists (trust/safety) */}
      <View
        accessibilityRole="summary"
        accessibilityLabel={t('rider.wallet.limitExplainerAria')}
        style={styles.explainerRow}
      >
        <ShieldCheck size={14} color={colors.textMuted} />
        <Text style={styles.explainerText}>{t('rider.wallet.limitExplainer')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    gap: spacing[3],
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: fontSize.xs[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  meterWrap: {
    gap: spacing[2],
  },
  meterTrack: {
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterCurrent: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  meterMax: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },
  headroomText: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
  },
  nudgeText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
    flex: 1,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3.5],
  },
  depositText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  explainerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  explainerText: {
    flex: 1,
    fontSize: fontSize.xs[0],
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
})
