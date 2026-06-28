import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native'
import { Play, ChevronRight } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { useActiveDeliveryStore } from '@chinooz/state'
import type { ActiveDelivery } from '@chinooz/types'

interface ResumeBannerProps {
  delivery: ActiveDelivery
  onResume: () => void
  /** Dismiss is wired to resume (the banner only shows while minimized). */
  onDismiss: () => void
  style?: ViewStyle
  testID?: string
}

/**
 * Resume banner shown on Home/Jobs when an active delivery is minimized.
 *
 * Reads from the shared activeDelivery store so it always reflects the live
 * status. Tapping Resume re-enters the Active Delivery route; the dismiss
 * control is reachable for screen readers.
 */
export default function ResumeBanner({ delivery, onResume, onDismiss, style, testID }: ResumeBannerProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const cancel = useActiveDeliveryStore(s => s.cancel)

  const statusLabel = t(`rider.active.status_${delivery.status}`)
  const body = t('rider.active.resumeBannerBody', {
    status: statusLabel,
    pickup: delivery.pickupLabel,
    dropoff: delivery.dropoffLabel,
  })
  const aria = t('rider.active.resumeBannerAria', {
    status: statusLabel,
    pickup: delivery.pickupLabel,
    dropoff: delivery.dropoffLabel,
  })

  const handleResume = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    onResume()
  }, [reducedMotion, onResume])

  const handleDismiss = useCallback(() => {
    // Dismiss cancels the minimized delivery so the banner clears.
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    cancel('Dismissed from banner')
    onDismiss()
  }, [reducedMotion, cancel, onDismiss])

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="summary"
      accessibilityLabel={aria}
      testID={testID}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.resumeBannerCta')}
        accessibilityHint={aria}
        onPress={handleResume}
        style={styles.body}
        activeOpacity={0.85}
      >
        <View style={styles.iconWrap}>
          <Play size={18} color={colors.white} fill={colors.white} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {t('rider.active.resumeBannerTitle')}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>{body}</Text>
        </View>
        <ChevronRight size={20} color={colors.white} />
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.resumeBannerDismissAria')}
        onPress={handleDismiss}
        style={[styles.dismiss, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        hitSlop={8}
      >
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginTop: spacing[2],
    ...shadows.md,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  subtitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: 'rgba(255,255,255,0.85)',
  },
  dismiss: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dismissText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 22,
  },
})
