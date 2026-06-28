import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  Linking,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  ReduceMotion,
  runOnJS,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  MapPin,
  Navigation,
  Phone,
  Wallet,
  Banknote,
  ChevronUp,
  ChevronDown,
  User,
  PackageCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, duration, easing, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { DELIVERY_FLOW } from '@chinooz/state'
import type { ActiveDelivery, DeliveryStatus } from '@chinooz/types'
import HeadingToPickupStep from './HeadingToPickupStep'

interface ActiveBottomSheetProps {
  delivery: ActiveDelivery
  onPrimary: () => void
  onCancel: () => void
}

const COLLAPSED_HEIGHT = 196
const EXPANDED_HEIGHT = 420
// heading_to_pickup needs room for the nav band + pickup card + arrived button.
const HEADING_COLLAPSED_HEIGHT = 460
const HEADING_EXPANDED_HEIGHT = 620

function isTerminal(s: DeliveryStatus): boolean {
  return s === 'delivered' || s === 'cancelled' || s === 'failed'
}

function formatNpr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * Expandable bottom action sheet for the Active Delivery route.
 *
 * Shows the current step, key info (address, contact, payout, COD), and a
 * huge, obvious, full-width primary action button that changes per status.
 * The sheet expands/collapses via a grabber + chevron; the primary button is
 * always visible in the collapsed state so the next action is one-thumb-tap
 * away and safe to glance while moving.
 *
 * All values come from the shared activeDelivery store (single source of truth).
 */
export default function ActiveBottomSheet({ delivery, onPrimary, onCancel }: ActiveBottomSheetProps) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { reducedMotion, minTouchTarget } = useA11y()
  const [expanded, setExpanded] = useState(false)

  const translateY = useSharedValue(0)
  const sheetHeight = useSharedValue(COLLAPSED_HEIGHT)

  const isHeadingToPickup = delivery.status === 'heading_to_pickup'
  const collapsedH = isHeadingToPickup ? HEADING_COLLAPSED_HEIGHT : COLLAPSED_HEIGHT
  const expandedH = isHeadingToPickup ? HEADING_EXPANDED_HEIGHT : EXPANDED_HEIGHT

  useEffect(() => {
    const target = expanded ? expandedH : collapsedH
    sheetHeight.value = reducedMotion
      ? withTiming(target, { duration: 0 })
      : withSpring(target, { damping: 26, stiffness: 280, mass: 0.9, reduceMotion: ReduceMotion.System })
    translateY.value = reducedMotion
      ? withTiming(0, { duration: 0 })
      : withTiming(0, { duration: duration.normal, easing: Easing.bezier(...easing.easeOut) })
  }, [expanded, reducedMotion, collapsedH, expandedH])

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }))

  const statusKey = delivery.status
  const terminal = isTerminal(statusKey)

  const stepIndex = DELIVERY_FLOW.indexOf(statusKey)
  const stepLabel = t('rider.active.stepLabel', {
    current: Math.max(1, stepIndex + 1),
    total: DELIVERY_FLOW.length,
  })

  const statusLabel = t(`rider.active.status_${statusKey}`)

  // Announce status changes for screen readers.
  const prevStatus = React.useRef<DeliveryStatus>(statusKey)
  useEffect(() => {
    if (prevStatus.current !== statusKey) {
      prevStatus.current = statusKey
      try { runOnJS(AccessibilityInfo.announceForAccessibility)(statusLabel) } catch {}
    }
  }, [statusKey, statusLabel])

  const toggleExpanded = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setExpanded(e => !e)
  }, [reducedMotion])

  const primaryLabel = t(`rider.active.primary_${statusKey}`)
  const primaryAria = t(`rider.active.primary_${statusKey}_aria`)

  const handlePrimary = useCallback(() => {
    try {
      if (!reducedMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch {}
    try { runOnJS(AccessibilityInfo.announceForAccessibility)(primaryAria) } catch {}
    onPrimary()
  }, [reducedMotion, primaryAria, onPrimary])

  const call = useCallback(async (phone: string, label: string) => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    try { runOnJS(AccessibilityInfo.announceForAccessibility)(label) } catch {}
    const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`
    try { await Linking.openURL(url) } catch {}
  }, [reducedMotion])

  const showPickup = statusKey === 'assigned' || statusKey === 'heading_to_pickup' || statusKey === 'at_pickup'
  const showDropoff = statusKey === 'picked_up' || statusKey === 'in_transit' || statusKey === 'at_dropoff'

  const targetStop = showPickup ? delivery.pickup : showDropoff ? delivery.dropoff : null

  const statusColor = useMemo(() => {
    switch (statusKey) {
      case 'delivered': return colors.success
      case 'cancelled':
      case 'failed': return colors.error
      case 'at_pickup':
      case 'at_dropoff': return colors.gold
      default: return colors.primary
    }
  }, [statusKey])

  return (
    <Animated.View
      style={[styles.container, { paddingBottom: insets.bottom + spacing[2] }, sheetStyle]}
      accessibilityRole="summary"
      accessibilityLabel={`${statusLabel}. ${stepLabel}`}
    >
      {/* Grabber + expand/collapse */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('rider.active.sheetCollapse') : t('rider.active.sheetExpand')}
        accessibilityHint={t('rider.active.sheetHint')}
        onPress={toggleExpanded}
        style={styles.grabberRow}
      >
        <View style={styles.grabber} />
        <View style={styles.grabberMeta}>
          <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
            <Text style={styles.statusPillText}>{statusLabel}</Text>
          </View>
          <Text style={styles.stepText}>{stepLabel}</Text>
        </View>
        {expanded ? <ChevronDown size={18} color={colors.textMuted} /> : <ChevronUp size={18} color={colors.textMuted} />}
      </Pressable>

      {/* Collapsed: quick info + primary button always visible */}
      <View style={styles.body}>
        {/* heading_to_pickup: dedicated step with nav band, pickup card, arrived */}
        {isHeadingToPickup && (
          <HeadingToPickupStep delivery={delivery} onArrived={onPrimary} />
        )}

        {/* Default (non-heading) quick info + details + primary */}
        {!isHeadingToPickup && !terminal && targetStop && (
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoLeft}>
              {showPickup ? <MapPin size={16} color={colors.primary} /> : <Navigation size={16} color={colors.primaryDark} />}
              <Text style={styles.quickInfoText} numberOfLines={1}>{targetStop.label}</Text>
            </View>
            <Text style={styles.quickInfoPayout}>{formatNpr(delivery.payout)}</Text>
          </View>
        )}

        {/* Expanded: full details (non-heading only) */}
        {!isHeadingToPickup && expanded && (
          <View style={styles.details}>
            {targetStop && (
              <InfoRow
                icon={<MapPin size={16} color={colors.primary} />}
                label={showPickup ? t('rider.active.pickupAddress') : t('rider.active.dropoffAddress')}
                value={targetStop.address}
              />
            )}
            {targetStop && (
              <InfoRow
                icon={<User size={16} color={colors.textMuted} />}
                label={t('rider.active.contact')}
                value={`${targetStop.contactName} · ${targetStop.contactPhone}`}
                action={{
                  label: showPickup ? t('rider.active.callPickup') : t('rider.active.callDropoff'),
                  onPress: () => call(targetStop.contactPhone, showPickup ? t('rider.active.callPickup') : t('rider.active.callDropoff')),
                }}
              />
            )}
            <InfoRow
              icon={<Wallet size={16} color={colors.primary} />}
              label={t('rider.active.payout')}
              value={formatNpr(delivery.payout)}
            />
            <InfoRow
              icon={<Banknote size={16} color={delivery.isCod ? colors.gold : colors.textMuted} />}
              label={t('rider.active.cod')}
              value={delivery.isCod ? t('rider.active.codCollect', { amount: formatNpr(delivery.codAmount) }) : t('rider.active.codNone')}
            />
            <InfoRow
              icon={<User size={16} color={colors.textMuted} />}
              label={t('rider.active.customer')}
              value={delivery.customerName}
            />
          </View>
        )}

        {/* Terminal messaging */}
        {/* Terminal messaging (non-heading only; heading never reaches here) */}
        {!isHeadingToPickup && terminal && (
          <View style={styles.terminalMsg}>
            {statusKey === 'delivered' && <CheckCircle2 size={20} color={colors.success} />}
            {statusKey === 'cancelled' && <XCircle size={20} color={colors.error} />}
            {statusKey === 'failed' && <AlertTriangle size={20} color={colors.error} />}
            <Text style={styles.terminalText}>
              {statusKey === 'delivered'
                ? t('rider.active.deliveredBody')
                : statusKey === 'cancelled'
                  ? t('rider.active.cancelledBody')
                  : t('rider.active.failedBody')}
            </Text>
          </View>
        )}

        {/* Primary action: full-width, min 56px, high-contrast plum.
            Skipped for heading_to_pickup — the step owns its own Arrived primary. */}
        {!isHeadingToPickup && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={primaryAria}
            accessibilityState={{ disabled: false }}
            onPress={handlePrimary}
            style={[styles.primaryBtn, terminal && styles.primaryBtnTerminal, { minHeight: 56 }]}
            activeOpacity={0.85}
          >
            {terminal ? (
              <>
                {statusKey === 'delivered' ? <PackageCheck size={20} color={colors.white} /> : null}
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              </>
            ) : (
              <>
                {showPickup ? <Navigation size={20} color={colors.white} /> : <MapPin size={20} color={colors.white} />}
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Cancel (non-terminal, non-heading only) */}
        {!isHeadingToPickup && !terminal && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.cancelAria')}
            onPress={onCancel}
            style={[styles.cancelBtn, { minHeight: minTouchTarget }]}
          >
            <Text style={styles.cancelText}>{t('rider.active.cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  )
}

function InfoRow({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode
  label: string
  value: string
  action?: { label: string; onPress: () => void }
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
      </View>
      {action && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.infoAction}
          hitSlop={8}
        >
          <Phone size={16} color={colors.primary} />
          <Text style={styles.infoActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
    zIndex: 30,
    overflow: 'hidden',
  },
  grabberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  grabberMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusPillText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  stepText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  body: {
    flex: 1,
    gap: spacing[3],
    paddingTop: spacing[1],
  },
  quickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  quickInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  quickInfoText: {
    flex: 1,
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  quickInfoPayout: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.primary,
  },
  details: {
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  infoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    borderRadius: radii.lg,
    backgroundColor: colors.primary50,
  },
  infoActionText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  terminalMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  terminalText: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    width: '100%',
    paddingHorizontal: spacing[5],
    marginTop: spacing[1],
  },
  primaryBtnTerminal: {
    backgroundColor: colors.primaryDark,
  },
  primaryText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
  },
  cancelText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
})
