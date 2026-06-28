import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  Linking,
  Platform,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Navigation2,
  Phone,
  MessageCircle,
  MapPin,
  Package,
  StickyNote,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { turnHint } from '@chinooz/rs3'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface HeadingToPickupStepProps {
  delivery: ActiveDelivery
  /** Fired when the rider taps "Arrived at pickup". */
  onArrived: () => void
}

function formatEta(sec: number): string {
  if (sec <= 0) return '0 min'
  const mins = Math.max(1, Math.round(sec / 60))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * RA2 — heading_to_pickup step content.
 *
 * Renders the route ETA/distance with a turn hint driven by the RS3 trip
 * simulator, a "Navigate" button that hands off to the rider's external maps
 * app (deep-link) while Chinooz state stays intact, a pickup card (seller
 * name/area, items to collect, prep note, contact call/chat), and the obvious
 * "Arrived at pickup" primary action.
 *
 * All values come from the shared activeDelivery store (single source of
 * truth). The turn hint recomputes from `legProgress` as the simulator ticks.
 */
export default function HeadingToPickupStep({ delivery, onArrived }: HeadingToPickupStepProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const { pickup, legToPickup, legProgress, etaSeconds, distanceMeters } = delivery

  // Turn hint driven by the simulator progress on the pickup leg.
  const hint = useMemo(() => turnHint(legToPickup, legProgress), [legToPickup, legProgress])

  const turnText = useMemo(() => {
    if (!hint) return null
    const distStr =
      hint.distanceMeters >= 1000
        ? t('rider.active.turnDistanceKm', { distance: (hint.distanceMeters / 1000).toFixed(1) })
        : t('rider.active.turnDistanceM', { distance: hint.distanceMeters })
    if (hint.instruction === 'arrived') return t('rider.active.turnArrived')
    const dirKey = `rider.active.turn${hint.instruction.charAt(0).toUpperCase()}${hint.instruction.slice(1)}`
    return `${t(dirKey, { heading: hint.heading })} ${distStr}`
  }, [hint, t])

  const TurnIcon = useMemo(() => {
    if (!hint) return ArrowUp
    switch (hint.instruction) {
      case 'slight_left': return ArrowUpLeft
      case 'slight_right': return ArrowUpRight
      case 'left': return CornerUpLeft
      case 'right': return CornerUpRight
      case 'arrived': return MapPin
      default: return ArrowUp
    }
  }, [hint])

  // Announce ETA/distance on meaningful change (every ~30s or on arrival).
  const prevAnnounce = useRef<string>('')
  useEffect(() => {
    const arrived = distanceMeters <= 0
    const msg = arrived
      ? t('rider.active.etaArrivedAnnounce')
      : t('rider.active.etaAnnounce', {
          eta: formatEta(etaSeconds),
          distance: formatDistance(distanceMeters),
        })
    // Announce when the rounded ETA bucket changes or on arrival.
    const bucket = arrived ? 'arrived' : `${Math.round(etaSeconds / 30)}`
    if (bucket !== prevAnnounce.current) {
      prevAnnounce.current = bucket
      try { AccessibilityInfo.announceForAccessibility(msg) } catch {}
    }
  }, [etaSeconds, distanceMeters, t])

  // Navigate handoff: build a geo deep-link to the pickup and open the
  // external maps app. Chinooz stays open + keeps its state.
  const handleNavigate = useCallback(async () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    analytics.track({ event: 'rider_active_navigate', screen: 'rider-active-delivery', target: 'pickup' })
    const { lat, lng } = pickup
    // Cross-platform geo deep-link. Apple Maps on iOS, Google Maps on Android.
    const apple = `maps://app?daddr=${lat},${lng}&q=${encodeURIComponent(pickup.label)}`
    const google = `google.navigation:q=${lat},${lng}&mode=two_wheeler`
    const googleHttp = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    const tryOpen = async (url: string): Promise<boolean> => {
      try {
        const can = await Linking.canOpenURL(url)
        if (can) {
          await Linking.openURL(url)
          return true
        }
      } catch {}
      return false
    }

    if (Platform.OS === 'ios') {
      if (await tryOpen(apple)) return
      if (await tryOpen(googleHttp)) return
    } else {
      if (await tryOpen(google)) return
      if (await tryOpen(googleHttp)) return
    }
    // Nothing opened — tell the rider to follow the on-screen route.
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.navigateUnavailable')) } catch {}
    Alert.alert(t('rider.active.navigate'), t('rider.active.navigateUnavailable'))
  }, [reducedMotion, pickup, t])

  const handleCall = useCallback(async () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    const url = Platform.OS === 'ios' ? `telprompt:${pickup.contactPhone}` : `tel:${pickup.contactPhone}`
    try { await Linking.openURL(url) } catch {}
  }, [reducedMotion, pickup])

  const handleChat = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    // RA7 in-app chat is a future route; surface a clear coming-soon toast.
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.contactChatSoon')) } catch {}
    Alert.alert(t('rider.active.contactChat'), t('rider.active.contactChatSoon'))
  }, [reducedMotion, t])

  const handleArrived = useCallback(() => {
    try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    try {
      AccessibilityInfo.announceForAccessibility(t('rider.active.primary_at_pickup_aria'))
    } catch {}
    onArrived()
  }, [reducedMotion, t, onArrived])

  const items = pickup.items ?? []
  const itemCount = items.length

  return (
    <View style={styles.wrap} testID="heading-to-pickup-step">
      {/* ETA + turn hint band — glanceable, high-contrast */}
      <View style={styles.navBand} accessibilityRole="summary">
        <View style={styles.turnIconWrap}>
          <TurnIcon size={22} color={colors.white} />
        </View>
        <View style={styles.turnTextWrap}>
          {turnText ? (
            <Text style={styles.turnText} numberOfLines={2}>{turnText}</Text>
          ) : (
            <Text style={styles.turnText} numberOfLines={1}>
              {t('rider.active.status_heading_to_pickup')}
            </Text>
          )}
          <Text style={styles.etaText} numberOfLines={1}>
            {distanceMeters <= 0
              ? t('rider.active.etaArrivedAnnounce')
              : `${formatEta(etaSeconds)} · ${formatDistance(distanceMeters)}`}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.active.navigateAria')}
          accessibilityHint={t('rider.active.navigateHint')}
          onPress={handleNavigate}
          style={[styles.navigateBtn, { minWidth: 56, minHeight: 56 }]}
          activeOpacity={0.85}
          testID="heading-to-pickup-navigate"
        >
          <Navigation2 size={22} color={colors.white} />
          <Text style={styles.navigateText}>{t('rider.active.navigate')}</Text>
        </TouchableOpacity>
      </View>

      {/* Pickup card */}
      <View style={styles.pickupCard} accessibilityRole="summary">
        <View style={styles.pickupHeader}>
          <View style={styles.pickupIcon}>
            <MapPin size={16} color={colors.primary} />
          </View>
          <View style={styles.pickupHeaderText}>
            <Text style={styles.pickupTitle} numberOfLines={1}>{pickup.label}</Text>
            {pickup.area ? (
              <Text style={styles.pickupArea} numberOfLines={1}>
                {t('rider.active.pickupCardArea')}: {pickup.area}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.pickupAddress} numberOfLines={2}>{pickup.address}</Text>

        {/* Items to collect */}
        {items.length > 0 && (
          <View style={styles.itemsBlock}>
            <View style={styles.itemsHeader}>
              <Package size={14} color={colors.textMuted} />
              <Text style={styles.itemsTitle}>
                {t('rider.active.pickupCardItems')}
              </Text>
              <View style={styles.itemsCountPill}>
                <Text style={styles.itemsCountText}>
                  {t('rider.active.pickupCardItemsCount', { count: itemCount })}
                </Text>
              </View>
            </View>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemDot} />
                <Text style={styles.itemText} numberOfLines={2}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Prep note */}
        {pickup.prepNote ? (
          <View style={styles.prepBlock}>
            <View style={styles.prepHeader}>
              <StickyNote size={14} color={colors.gold} />
              <Text style={styles.prepTitle}>{t('rider.active.pickupCardPrep')}</Text>
            </View>
            <Text style={styles.prepFrom}>
              {t('rider.active.pickupCardPrepFrom', { seller: pickup.contactName })}
            </Text>
            <Text style={styles.prepText}>{pickup.prepNote}</Text>
          </View>
        ) : null}

        {/* Contact: call + chat */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.contactCallAria', {
              name: pickup.contactName,
              phone: pickup.contactPhone,
            })}
            onPress={handleCall}
            style={[styles.contactBtn, { minHeight: minTouchTarget }]}
            activeOpacity={0.85}
            testID="heading-to-pickup-call"
          >
            <Phone size={16} color={colors.primary} />
            <Text style={styles.contactText}>{t('rider.active.contactCall')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.active.contactChatAria', { name: pickup.contactName })}
            onPress={handleChat}
            style={[styles.contactBtn, styles.contactBtnChat, { minHeight: minTouchTarget }]}
            activeOpacity={0.85}
            testID="heading-to-pickup-chat"
          >
            <MessageCircle size={16} color={colors.primary} />
            <Text style={styles.contactText}>{t('rider.active.contactChat')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary: Arrived at pickup — huge + obvious */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.active.primary_heading_to_pickup_aria')}
        onPress={handleArrived}
        style={styles.arrivedBtn}
        activeOpacity={0.85}
        testID="heading-to-pickup-arrived"
      >
        <MapPin size={22} color={colors.white} />
        <Text style={styles.arrivedText}>{t('rider.active.primary_heading_to_pickup')}</Text>
        <ChevronRight size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  // Nav band: ETA + turn hint + Navigate button
  navBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  turnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnTextWrap: {
    flex: 1,
    gap: 1,
  },
  turnText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
    lineHeight: 19,
  },
  etaText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: 'rgba(255,255,255,0.8)',
  },
  navigateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[2],
    gap: 2,
  },
  navigateText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.primaryDark,
  },
  // Pickup card
  pickupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  pickupIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupHeaderText: {
    flex: 1,
    gap: 1,
  },
  pickupTitle: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  pickupArea: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  pickupAddress: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  // Items
  itemsBlock: {
    gap: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  itemsTitle: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  itemsCountPill: {
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  itemsCountText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '700',
    color: colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  itemText: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  // Prep note
  prepBlock: {
    gap: spacing[1],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  prepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  prepTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  prepFrom: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  prepText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Contact
  contactRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
  },
  contactBtnChat: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary50,
  },
  contactText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  // Arrived primary
  arrivedBtn: {
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
  arrivedText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
})
