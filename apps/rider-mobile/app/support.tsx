import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Linking,
  AccessibilityInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import {
  Siren,
  Share2,
  Search,
  LifeBuoy,
  Headset,
  Ticket as TicketIcon,
  ChevronRight,
  ChevronLeft,
  Phone,
  TriangleAlert,
  MapPin,
  Navigation,
  Package,
  CircleAlert,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily, easing } from '@chinooz/theme'
import { useActiveDeliveryStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../components/A11yProvider'

type TripHelpItem = {
  key: 'accident' | 'buyerIssue' | 'navigation' | 'itemIssue' | 'cancel'
  icon: LucideIcon
  labelKey: string
}

const TRIP_HELP_ITEMS: TripHelpItem[] = [
  { key: 'accident', icon: TriangleAlert, labelKey: 'rider.support.tripItemAccident' },
  { key: 'buyerIssue', icon: Headset, labelKey: 'rider.support.tripItemBuyerIssue' },
  { key: 'navigation', icon: Navigation, labelKey: 'rider.support.tripItemNavigation' },
  { key: 'itemIssue', icon: Package, labelKey: 'rider.support.tripItemItemIssue' },
  { key: 'cancel', icon: CircleAlert, labelKey: 'rider.support.tripItemCancel' },
]

type EmergencyContact = {
  key: 'police' | 'ambulance' | 'traffic' | 'chinooz'
  icon: LucideIcon
  labelKey: string
  numberKey: string
  ariaKey: string
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { key: 'police', icon: Siren, labelKey: 'rider.support.emergencyPolice', numberKey: 'rider.support.emergencyPoliceNumber', ariaKey: 'rider.support.emergencyPoliceAria' },
  { key: 'ambulance', icon: LifeBuoy, labelKey: 'rider.support.emergencyAmbulance', numberKey: 'rider.support.emergencyAmbulanceNumber', ariaKey: 'rider.support.emergencyAmbulanceAria' },
  { key: 'traffic', icon: Navigation, labelKey: 'rider.support.emergencyTraffic', numberKey: 'rider.support.emergencyTrafficNumber', ariaKey: 'rider.support.emergencyTrafficAria' },
  { key: 'chinooz', icon: Phone, labelKey: 'rider.support.emergencyChinooz', numberKey: 'rider.support.emergencyChinoozNumber', ariaKey: 'rider.support.emergencyChinoozAria' },
]

export default function SupportSafetyHub() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion, minTouchTarget } = useA11y()

  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)
  const hasActiveTrip = !!activeDelivery

  const [search, setSearch] = useState('')

  useEffect(() => {
    analytics.screen({ name: 'rider-support-safety' })
  }, [])

  const callEmergency = useCallback((number: string) => {
    const digits = number.replace(/[^0-9+]/g, '')
    try {
      Linking.openURL(`tel:${digits}`)
    } catch {}
  }, [])

  const tripHelpCount = TRIP_HELP_ITEMS.length

  return (
    <View style={styles.container}>
      <TopBar
        title={t('rider.support.title')}
        onBack={() => router.back()}
        backAria={t('rider.support.back')}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Calm, reassuring header */}
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={styles.introTitle}>
            {t('rider.support.title')}
          </Text>
          <Text style={styles.introSubtitle}>{t('rider.support.subtitle')}</Text>
        </View>

        {/* Contextual trip help — surfaced FIRST when a delivery is active */}
        {hasActiveTrip && activeDelivery && (
          <TripHelpCard
            orderRef={activeDelivery.orderRef}
            pickup={activeDelivery.pickupLabel}
            dropoff={activeDelivery.dropoffLabel}
            items={TRIP_HELP_ITEMS}
            count={tripHelpCount}
            onItem={(item) => {
              analytics.track({ event: 'rider_support_trip_help_tapped', screen: 'rider-support-safety', properties: { item: item.key, orderRef: activeDelivery.orderRef } })
              router.push({ pathname: '/support/contact', params: { topic: item.key, ref: activeDelivery.orderRef } })
            }}
            t={t}
          />
        )}

        {/* SAFETY SECTION — prominent, up top, high-contrast */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('rider.support.safetyTitle')}
          </Text>
          <Text style={styles.sectionSubtitle}>{t('rider.support.safetySubtitle')}</Text>

          <View style={styles.safetyGrid}>
            <SosButton
              reducedMotion={reducedMotion}
              minTouchTarget={minTouchTarget}
              onPress={() => router.push('/support/sos')}
              t={t}
            />
            <ShareTripButton
              reducedMotion={reducedMotion}
              minTouchTarget={minTouchTarget}
              hasActiveTrip={hasActiveTrip}
              onPress={() => {
                analytics.track({ event: 'rider_share_trip_tapped', screen: 'rider-support-safety' })
                try { AccessibilityInfo.announceForAccessibility(t('rider.support.shareAria')) } catch {}
              }}
              t={t}
            />
          </View>
        </View>

        {/* SUPPORT SECTION — search, FAQ, contact, tickets */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('rider.support.sectionSupport')}
          </Text>

          <View style={styles.searchWrap}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('rider.support.searchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel={t('rider.support.searchAria')}
              inputMode="search"
              returnKeyType="search"
              onSubmitEditing={() => router.push({ pathname: '/support/faq', params: search.trim() ? { q: search.trim() } : {} })}
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel={t('rider.support.searchAria')}
                hitSlop={8}
                style={styles.searchClear}
              >
                <X size={16} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          <View style={styles.listCard}>
            <SupportRow
              icon={LifeBuoy}
              label={t('rider.support.linkFaq')}
              desc={t('rider.support.linkFaqDesc')}
              aria={t('rider.support.linkFaqAria')}
              minTouchTarget={minTouchTarget}
              reducedMotion={reducedMotion}
              onPress={() => router.push({ pathname: '/support/faq', params: search.trim() ? { q: search.trim() } : {} })}
            />
            <SupportRow
              icon={Headset}
              label={t('rider.support.linkContact')}
              desc={t('rider.support.linkContactDesc')}
              aria={t('rider.support.linkContactAria')}
              minTouchTarget={minTouchTarget}
              reducedMotion={reducedMotion}
              onPress={() => router.push('/support/contact')}
              divider
            />
            <SupportRow
              icon={TicketIcon}
              label={t('rider.support.linkTickets')}
              desc={t('rider.support.linkTicketsDesc')}
              aria={t('rider.support.linkTicketsAria')}
              minTouchTarget={minTouchTarget}
              reducedMotion={reducedMotion}
              onPress={() => router.push('/support/tickets')}
            />
          </View>
        </View>

        {/* EMERGENCY NUMBERS — local, readable, dialable */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('rider.support.emergencyTitle')}
          </Text>
          <Text style={styles.sectionSubtitle}>{t('rider.support.emergencySubtitle')}</Text>

          <View style={styles.emergencyCard}>
            {EMERGENCY_CONTACTS.map((c, i) => (
              <EmergencyRow
                key={c.key}
                icon={c.icon}
                label={t(c.labelKey)}
                number={t(c.numberKey)}
                aria={t(c.ariaKey)}
                minTouchTarget={minTouchTarget}
                reducedMotion={reducedMotion}
                last={i === EMERGENCY_CONTACTS.length - 1}
                onPress={() => {
                  analytics.track({ event: 'rider_emergency_call_tapped', screen: 'rider-support-safety', properties: { service: c.key } })
                  callEmergency(t(c.numberKey))
                }}
              />
            ))}
          </View>
        </View>

        {/* Calm reassurance footer */}
        <View style={styles.reassure} accessibilityRole="text" accessibilityLabel={t('rider.support.reassureAria')}>
          <Text style={styles.reassureText}>{t('rider.support.reassure')}</Text>
        </View>
      </ScrollView>
    </View>
  )
}

function TopBar({ title, onBack, backAria }: { title: string; onBack: () => void; backAria: string }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backAria}
        hitSlop={8}
        style={styles.topBarBtn}
      >
        <ChevronLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.topBarBtn} />
    </View>
  )
}

function TripHelpCard({
  orderRef,
  pickup,
  dropoff,
  items,
  count,
  onItem,
  t,
}: {
  orderRef: string
  pickup: string
  dropoff: string
  items: TripHelpItem[]
  count: number
  onItem: (item: TripHelpItem) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const announce = () => {
    try {
      AccessibilityInfo.announceForAccessibility(
        t('rider.support.tripHelpAria', { ref: orderRef, count }),
      )
    } catch {}
  }
  useEffect(() => {
    // Announce contextual help is available for this active trip.
    const id = setTimeout(announce, 400)
    return () => clearTimeout(id)
  }, [])

  return (
    <View
      style={styles.tripCard}
      accessibilityRole="summary"
      accessibilityLabel={t('rider.support.tripHelpAria', { ref: orderRef, count })}
    >
      <View style={styles.tripHead}>
        <View style={styles.tripBadge}>
          <MapPin size={14} color={colors.primary} />
          <Text style={styles.tripBadgeText}>{t('rider.support.tripHelpTitle')}</Text>
        </View>
        <Text style={styles.tripRef}>{t('rider.support.tripHelpSubtitle', { ref: orderRef })}</Text>
      </View>

      <View style={styles.tripRoute}>
        <Text style={styles.tripRouteText} numberOfLines={1}>
          {pickup} → {dropoff}
        </Text>
      </View>

      <View style={styles.tripItems}>
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tripItem, i < items.length - 1 && styles.tripItemBorder]}
              onPress={() => onItem(item)}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.tripHelpItemAria', { label: t(item.labelKey), ref: orderRef })}
              activeOpacity={0.8}
            >
              <View style={styles.tripItemIcon}>
                <Icon size={18} color={colors.primary} />
              </View>
              <Text style={styles.tripItemLabel} numberOfLines={1}>{t(item.labelKey)}</Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function SosButton({
  reducedMotion,
  minTouchTarget,
  onPress,
  t,
}: {
  reducedMotion: boolean
  minTouchTarget: number
  onPress: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const scale = useSharedValue(1)
  const ring = useSharedValue(0)

  useEffect(() => {
    if (reducedMotion) {
      ring.value = 0
      return
    }
    // Subtle, slow pulsing ring so SOS is unmistakable but not alarming.
    ring.value = withTiming(1, { duration: 1600, easing: Easing.bezier(...easing.easeInOut) }, () => {
      ring.value = withTiming(0, { duration: 1600, easing: Easing.bezier(...easing.easeInOut) })
    })
  }, [reducedMotion])

  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value * 0.5 }))

  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.97, { damping: 18, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 18, stiffness: 400 }) }

  const handlePress = () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    } catch {}
    onPress()
  }

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={[styles.sosWrap, btnStyle]}>
      <Animated.View pointerEvents="none" style={[styles.sosRing, ringStyle]} />
      <TouchableOpacity
        style={[styles.sosBtn, { minHeight: minTouchTarget + 36 }]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={t('rider.support.sosAria')}
        activeOpacity={0.9}
      >
        <Siren size={28} color={colors.white} />
        <Text style={styles.sosLabel}>{t('rider.support.sosTitle')}</Text>
        <Text style={styles.sosHint}>{t('rider.support.sosSubtitle')}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

function ShareTripButton({
  reducedMotion,
  minTouchTarget,
  hasActiveTrip,
  onPress,
  t,
}: {
  reducedMotion: boolean
  minTouchTarget: number
  hasActiveTrip: boolean
  onPress: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.97, { damping: 18, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 18, stiffness: 400 }) }
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={[styles.shareWrap, btnStyle]}>
      <TouchableOpacity
        style={[styles.shareBtn, { minHeight: minTouchTarget + 36 }, !hasActiveTrip && styles.shareBtnDim]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={t('rider.support.shareAria')}
        accessibilityState={hasActiveTrip ? {} : { disabled: false }}
        activeOpacity={0.9}
      >
        <Share2 size={26} color={colors.primary} />
        <Text style={styles.shareLabel}>{t('rider.support.shareTitle')}</Text>
        <Text style={styles.shareHint}>{t('rider.support.shareSubtitle')}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

function SupportRow({
  icon: Icon,
  label,
  desc,
  aria,
  minTouchTarget,
  reducedMotion,
  onPress,
  divider,
}: {
  icon: LucideIcon
  label: string
  desc: string
  aria: string
  minTouchTarget: number
  reducedMotion: boolean
  onPress: () => void
  divider?: boolean
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.98, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={btnStyle}>
      <TouchableOpacity
        style={[styles.supportRow, divider && styles.supportRowBorder, { minHeight: minTouchTarget + 12 }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={aria}
        activeOpacity={0.85}
      >
        <View style={styles.supportRowIcon}>
          <Icon size={22} color={colors.primary} />
        </View>
        <View style={styles.supportRowBody}>
          <Text style={styles.supportRowLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.supportRowDesc} numberOfLines={1}>{desc}</Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  )
}

function EmergencyRow({
  icon: Icon,
  label,
  number,
  aria,
  minTouchTarget,
  reducedMotion,
  last,
  onPress,
}: {
  icon: LucideIcon
  label: string
  number: string
  aria: string
  minTouchTarget: number
  reducedMotion: boolean
  last: boolean
  onPress: () => void
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => { if (!reducedMotion) scale.value = withSpring(0.98, { damping: 20, stiffness: 400 }) }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 20, stiffness: 400 }) }
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={btnStyle}>
      <TouchableOpacity
        style={[styles.emergencyRow, !last && styles.emergencyRowBorder, { minHeight: minTouchTarget + 8 }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={aria}
        activeOpacity={0.85}
      >
        <View style={styles.emergencyIcon}>
          <Icon size={20} color={colors.error} />
        </View>
        <View style={styles.emergencyBody}>
          <Text style={styles.emergencyLabel} numberOfLines={1}>{label}</Text>
        </View>
        <View style={styles.emergencyNumberWrap}>
          <Phone size={14} color={colors.error} />
          <Text style={styles.emergencyNumber}>{number}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[5] },
  intro: { gap: spacing[1] },
  introTitle: { fontSize: fontSize['2xl'][0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  introSubtitle: { fontSize: fontSize.base[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  section: { gap: spacing[2] },
  sectionTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0], marginBottom: spacing[1] },

  // Trip help card
  tripCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  tripHead: { gap: spacing[1.5] },
  tripBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], alignSelf: 'flex-start' },
  tripBadgeText: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
  tripRef: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  tripRoute: { flexDirection: 'row', alignItems: 'center' },
  tripRouteText: { fontSize: fontSize.sm[0], color: colors.textSecondary, flex: 1 },
  tripItems: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  tripItemBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  tripItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripItemLabel: { flex: 1, fontSize: fontSize.base[0], fontWeight: '500', color: colors.text },

  // Safety grid
  safetyGrid: { flexDirection: 'row', gap: spacing[3] },
  sosWrap: { flex: 1, position: 'relative' },
  sosRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: radii['2xl'],
    borderWidth: 3,
    borderColor: colors.error,
  },
  sosBtn: {
    backgroundColor: colors.error,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    gap: spacing[1.5],
    flex: 1,
  },
  sosLabel: { fontSize: fontSize.xl[0], fontWeight: '800', color: colors.white, fontFamily: fontFamily.sansBold[0], letterSpacing: 1 },
  sosHint: { fontSize: fontSize.xs[0], color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontFamily: fontFamily.sans[0] },

  shareWrap: { flex: 1, position: 'relative' },
  shareBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    gap: spacing[1.5],
    flex: 1,
  },
  shareBtnDim: { borderColor: colors.border, opacity: 0.85 },
  shareLabel: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  shareHint: { fontSize: fontSize.xs[0], color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
  },
  searchInput: { flex: 1, fontSize: fontSize.base[0], color: colors.text, padding: 0 },
  searchClear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  // Support list
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  supportRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  supportRowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportRowBody: { flex: 1, gap: 2 },
  supportRowLabel: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  supportRowDesc: { fontSize: fontSize.sm[0], color: colors.textMuted },

  // Emergency
  emergencyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  emergencyRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBody: { flex: 1 },
  emergencyLabel: { fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  emergencyNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  emergencyNumber: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansSemiBold[0] },

  // Reassure footer
  reassure: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  reassureText: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
})
