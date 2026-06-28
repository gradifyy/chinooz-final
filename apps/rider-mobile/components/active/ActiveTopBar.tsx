import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Minus, X, Siren, Phone, AlertCircle } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../A11yProvider'
import type { ActiveDelivery, DeliveryStatus } from '@chinooz/types'

interface ActiveTopBarProps {
  delivery: ActiveDelivery
  onMinimize: () => void
  onCancel: () => void
  onContact: () => void
  onSafety: () => void
  onIssue: () => void
}

function isTerminal(s: DeliveryStatus): boolean {
  return s === 'delivered' || s === 'cancelled' || s === 'failed'
}

function formatEta(sec: number): string {
  if (sec <= 0) return ''
  const mins = Math.max(1, Math.round(sec / 60))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

function formatDistance(meters: number): string {
  if (meters <= 0) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Top bar for the Active Delivery route.
 * Minimize (left), status label (center), ETA/distance (right).
 * Drives all values from the shared activeDelivery store.
 */
export default function ActiveTopBar({ delivery, onMinimize, onCancel, onContact, onSafety, onIssue }: ActiveTopBarProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { reducedMotion, minTouchTarget } = useA11y()
  const terminal = isTerminal(delivery.status)

  const statusLabel = t(`rider.active.status_${delivery.status}`)

  const handleMinimize = useCallback(() => {
    if (terminal) return
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onMinimize()
  }, [reducedMotion, terminal, onMinimize])

  const handleContact = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({ event: 'rider_active_contact_tapped', screen: 'rider-active-delivery' })
    onContact()
  }, [reducedMotion, onContact])

  const handleSafety = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    analytics.track({ event: 'rider_active_safety_tapped', screen: 'rider-active-delivery', properties: { orderRef: delivery.orderRef } })
    onSafety()
  }, [reducedMotion, onSafety, delivery.orderRef])

  const handleIssue = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({ event: 'rider_active_issue_tapped', screen: 'rider-active-delivery' })
    onIssue()
  }, [reducedMotion, onIssue])

  const etaText = terminal
    ? delivery.status === 'delivered'
      ? t('rider.active.topbarEtaDone')
      : ''
    : delivery.distanceMeters <= 0
      ? t('rider.active.topbarEtaArrived')
      : t('rider.active.topbarEta', { eta: formatEta(delivery.etaSeconds) })

  const distText = terminal || delivery.distanceMeters <= 0
    ? ''
    : t('rider.active.topbarDistance', { distance: formatDistance(delivery.distanceMeters) })

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[2] }]}>
      <View style={styles.bar}>
        {/* Left: minimize (or close on terminal) */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={terminal ? t('rider.active.deliveredDone') : t('rider.active.minimizeAria')}
          onPress={terminal ? onCancel : handleMinimize}
          style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
          hitSlop={8}
        >
          {terminal ? <X size={20} color={colors.text} /> : <Minus size={20} color={colors.text} />}
        </TouchableOpacity>

        {/* Center: status label */}
        <View style={styles.statusWrap} accessibilityRole="header">
          <Text style={styles.statusLabel} numberOfLines={1}>{statusLabel}</Text>
          <Text style={styles.orderRef} numberOfLines={1}>
            {t('rider.active.orderRef', { ref: delivery.orderRef })}
          </Text>
        </View>

        {/* Right: contact + issue + SOS + ETA/distance */}
        <View style={styles.metaWrap}>
          <View style={styles.actionsRow}>
            {!terminal && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.contactSheetTitle')}
                onPress={handleContact}
                style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
                hitSlop={8}
              >
                <Phone size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            {!terminal && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.issueSheetTitle')}
                onPress={handleIssue}
                style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
                hitSlop={8}
              >
                <AlertCircle size={18} color={colors.warning} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.topbarSafetyAria')}
              onPress={handleSafety}
              style={[styles.safetyBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
              hitSlop={8}
            >
              <Siren size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
          {etaText ? (
            <Text style={styles.eta} numberOfLines={1}>{etaText}</Text>
          ) : null}
          {distText ? (
            <Text style={styles.distance} numberOfLines={1}>{distText}</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[3],
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.background,
  },
  safetyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: 2,
  },
  statusWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  statusLabel: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  orderRef: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  metaWrap: {
    alignItems: 'flex-end',
    minWidth: 64,
    gap: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: 2,
  },
  eta: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  distance: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
})
