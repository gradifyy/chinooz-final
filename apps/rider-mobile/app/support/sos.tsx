import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
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
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Siren,
  Phone,
  MapPin,
  Package,
  Shield,
  UserPlus,
  LifeBuoy,
  Navigation,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily, easing } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'
import { useActiveDeliveryStore } from '@chinooz/state'

const HOLD_MS = 3000
const TICK_MS = 100

type DirectCall = {
  key: 'police' | 'ambulance' | 'traffic'
  icon: LucideIcon
  labelKey: string
  number: string
}

const DIRECT_CALLS: DirectCall[] = [
  { key: 'police', icon: Siren, labelKey: 'rider.support.emergencyPolice', number: '100' },
  { key: 'ambulance', icon: LifeBuoy, labelKey: 'rider.support.emergencyAmbulance', number: '102' },
  { key: 'traffic', icon: Navigation, labelKey: 'rider.support.emergencyTraffic', number: '103' },
]

type SosPhase = 'idle' | 'counting' | 'active'

export default function SosScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)

  const [phase, setPhase] = useState<SosPhase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(HOLD_MS / 1000))
  const [trustedContacts] = useState<{ name: string; phone: string }[]>([])

  const holdElapsed = useRef(0)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulse = useSharedValue(0)

  useEffect(() => {
    analytics.screen({ name: 'rider-support-sos', properties: { hasActiveTrip: !!activeDelivery } })
  }, [activeDelivery])

  // Calm ambient pulse on the idle button so it reads as alive, not alarming.
  useEffect(() => {
    if (reducedMotion || phase !== 'idle') {
      pulse.value = 0
      return
    }
    pulse.value = withTiming(1, { duration: 1800, easing: Easing.bezier(...easing.easeInOut) }, () => {
      pulse.value = withTiming(0, { duration: 1800, easing: Easing.bezier(...easing.easeInOut) })
    })
  }, [reducedMotion, phase])

  const ringStyle = useAnimatedStyle(() => ({ opacity: pulse.value * 0.4 }))

  const activate = useCallback(() => {
    setPhase('active')
    analytics.track({ event: 'rider_sos_activated', screen: 'rider-support-sos', properties: { hasActiveTrip: !!activeDelivery, orderRef: activeDelivery?.orderRef ?? null } })
    try {
      if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } catch {}
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.sos.activeAria')) } catch {}
  }, [activeDelivery, reducedMotion, t])

  const cancelCountdown = useCallback(() => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current)
      holdInterval.current = null
    }
    holdElapsed.current = 0
    setSecondsLeft(Math.ceil(HOLD_MS / 1000))
    setPhase('idle')
    analytics.track({ event: 'rider_sos_countdown_cancelled', screen: 'rider-support-sos' })
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.sos.deactivatedAria')) } catch {}
  }, [t])

  const deactivate = useCallback(() => {
    setPhase('idle')
    holdElapsed.current = 0
    setSecondsLeft(Math.ceil(HOLD_MS / 1000))
    analytics.track({ event: 'rider_sos_deactivated', screen: 'rider-support-sos' })
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.sos.deactivatedAria')) } catch {}
  }, [t])

  const beginHold = useCallback(() => {
    if (phase !== 'idle') return
    setPhase('counting')
    holdElapsed.current = 0
    setSecondsLeft(Math.ceil(HOLD_MS / 1000))
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}

    holdInterval.current = setInterval(() => {
      holdElapsed.current += TICK_MS
      const remaining = Math.max(0, HOLD_MS - holdElapsed.current)
      setSecondsLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0) {
        if (holdInterval.current) {
          clearInterval(holdInterval.current)
          holdInterval.current = null
        }
        runOnJS(activate)()
      }
    }, TICK_MS)
  }, [phase, reducedMotion, activate])

  const endHold = useCallback(() => {
    if (phase !== 'counting') return
    // Released before completion -> cancel back to idle.
    if (holdInterval.current) {
      clearInterval(holdInterval.current)
      holdInterval.current = null
    }
    holdElapsed.current = 0
    setSecondsLeft(Math.ceil(HOLD_MS / 1000))
    setPhase('idle')
  }, [phase])

  useEffect(() => {
    return () => {
      if (holdInterval.current) clearInterval(holdInterval.current)
    }
  }, [])

  const callDirect = useCallback((number: string, service: string) => {
    analytics.track({ event: 'rider_sos_direct_call', screen: 'rider-support-sos', properties: { service } })
    try { Linking.openURL(`tel:${number}`) } catch {}
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.back')}
          hitSlop={8}
          style={styles.topBarBtn}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.sos.title')}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('rider.support.sos.subtitle')}</Text>

        {/* SOS button / active state */}
        {phase === 'active' ? (
          <ActivePanel
            activeDelivery={activeDelivery}
            onDeactivate={deactivate}
            t={t}
          />
        ) : (
          <View style={styles.sosArea}>
            <Animated.View pointerEvents="none" style={[styles.holdRing, ringStyle]} />
            <Pressable
              style={styles.holdBtn}
              onPressIn={beginHold}
              onPressOut={endHold}
              accessibilityRole="button"
              accessibilityLabel={t('rider.support.sos.holdAria')}
              accessibilityState={{ busy: phase === 'counting' }}
            >
              <Siren size={48} color={colors.white} />
              <Text style={styles.holdLabel}>
                {phase === 'counting'
                  ? t('rider.support.sos.activating', { seconds: secondsLeft })
                  : t('rider.support.sos.holdTitle')}
              </Text>
              <Text style={styles.holdHint}>{t('rider.support.sos.holdSubtitle')}</Text>
            </Pressable>

            {phase === 'counting' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={cancelCountdown}
                accessibilityRole="button"
                accessibilityLabel={t('rider.support.sos.cancelAria')}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>{t('rider.support.sos.cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Direct emergency calls */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('rider.support.sos.callDirect')}
          </Text>
          <View style={styles.directCard}>
            {DIRECT_CALLS.map((c, i) => {
              const Icon = c.icon
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.directRow, i < DIRECT_CALLS.length - 1 && styles.directRowBorder]}
                  onPress={() => callDirect(c.number, c.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t(`rider.support.emergency${c.key === 'police' ? 'Police' : c.key === 'ambulance' ? 'Ambulance' : 'Traffic'}Aria`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.directIcon}>
                    <Icon size={20} color={colors.error} />
                  </View>
                  <Text style={styles.directLabel}>{t(c.labelKey)}</Text>
                  <View style={styles.directNumberWrap}>
                    <Phone size={14} color={colors.error} />
                    <Text style={styles.directNumber}>{c.number}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Trusted contacts */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {t('rider.support.sos.contactsTitle')}
          </Text>
          <Text style={styles.sectionSubtitle}>{t('rider.support.sos.contactsSubtitle')}</Text>

          {trustedContacts.length === 0 ? (
            <View style={styles.contactsEmpty}>
              <Text style={styles.contactsEmptyText}>{t('rider.support.sos.contactsNone')}</Text>
              <TouchableOpacity
                style={styles.contactsAddBtn}
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel={t('rider.support.sos.contactsAddAria')}
                activeOpacity={0.85}
              >
                <UserPlus size={16} color={colors.primary} />
                <Text style={styles.contactsAddText}>{t('rider.support.sos.contactsAdd')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contactsCard}>
              {trustedContacts.map((c, i) => (
                <View key={i} style={[styles.contactRow, i < trustedContacts.length - 1 && styles.directRowBorder]}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>
                      {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactBody}>
                    <Text style={styles.contactName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.contactPhone} numberOfLines={1}>{c.phone}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* What gets shared */}
        {phase === 'active' && (
          <View style={styles.sharedCard}>
            <SharedRow icon={MapPin} label={t('rider.support.sos.locationShared')} />
            <SharedRow icon={Package} label={t('rider.support.sos.tripShared')} divider />
            <SharedRow icon={Shield} label={t('rider.support.sos.safetyTeam')} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function ActivePanel({
  activeDelivery,
  onDeactivate,
  t,
}: {
  activeDelivery: { orderRef: string; pickupLabel: string; dropoffLabel: string } | null
  onDeactivate: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const breathe = useSharedValue(0)

  useEffect(() => {
    breathe.value = withTiming(1, { duration: 2000, easing: Easing.bezier(...easing.easeInOut) }, () => {
      breathe.value = withTiming(0, { duration: 2000, easing: Easing.bezier(...easing.easeInOut) })
    })
  }, [])

  const glowStyle = useAnimatedStyle(() => ({ opacity: breathe.value * 0.5 }))

  return (
    <View style={styles.activeArea}>
      <Animated.View pointerEvents="none" style={[styles.activeGlow, glowStyle]} />
      <View style={styles.activeCard} accessibilityRole="summary" accessibilityLabel={t('rider.support.sos.activeAria')}>
        <View style={styles.activeIconWrap}>
          <Siren size={36} color={colors.error} />
        </View>
        <Text accessibilityRole="header" style={styles.activeTitle}>
          {t('rider.support.sos.activeTitle')}
        </Text>
        <Text style={styles.activeBody}>{t('rider.support.sos.activeBody')}</Text>
        {activeDelivery && (
          <View style={styles.activeTrip}>
            <Text style={styles.activeTripText} numberOfLines={1}>
              {activeDelivery.pickupLabel} → {activeDelivery.dropoffLabel}
            </Text>
            <Text style={styles.activeTripRef} numberOfLines={1}>
              {t('rider.support.tripHelpSubtitle', { ref: activeDelivery.orderRef })}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.deactivateBtn}
          onPress={onDeactivate}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.sos.deactivateAria')}
          activeOpacity={0.85}
        >
          <Text style={styles.deactivateBtnText}>{t('rider.support.sos.deactivate')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function SharedRow({ icon: Icon, label, divider }: { icon: LucideIcon; label: string; divider?: boolean }) {
  return (
    <View style={[styles.sharedRow, divider && styles.directRowBorder]}>
      <View style={styles.sharedIcon}>
        <Icon size={18} color={colors.success} />
      </View>
      <Text style={styles.sharedLabel}>{label}</Text>
    </View>
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
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0], textAlign: 'center' },

  // SOS hold area
  sosArea: { alignItems: 'center', gap: spacing[4], paddingVertical: spacing[4] },
  holdRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: colors.error,
    top: 0,
  },
  holdBtn: {
    width: 240,
    height: 240,
    borderRadius: 9999,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  holdLabel: { fontSize: fontSize.lg[0], fontWeight: '800', color: colors.white, textAlign: 'center', fontFamily: fontFamily.sansBold[0] },
  holdHint: { fontSize: fontSize.xs[0], color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontFamily: fontFamily.sans[0] },
  cancelBtn: {
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.text },

  // Active state
  activeArea: { alignItems: 'center', paddingVertical: spacing[2] },
  activeGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: colors.error,
    top: -20,
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.error,
    padding: spacing[5],
    alignItems: 'center',
    gap: spacing[3],
    width: '100%',
  },
  activeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTitle: { fontSize: fontSize.xl[0], fontWeight: '800', color: colors.error, fontFamily: fontFamily.sansBold[0], textAlign: 'center' },
  activeBody: { fontSize: fontSize.base[0], color: colors.textSecondary, textAlign: 'center', lineHeight: 20, fontFamily: fontFamily.sans[0] },
  activeTrip: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: 2,
    alignSelf: 'stretch',
  },
  activeTripText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  activeTripRef: { fontSize: fontSize.xs[0], color: colors.textMuted, textAlign: 'center' },
  deactivateBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateBtnText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.error },

  // Sections
  section: { gap: spacing[2] },
  sectionTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },

  directCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  directRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  directRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  directIcon: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directLabel: { flex: 1, fontSize: fontSize.md[0], fontWeight: '600', color: colors.text },
  directNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: 9999,
  },
  directNumber: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansSemiBold[0] },

  // Contacts
  contactsEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  contactsEmptyText: { fontSize: fontSize.sm[0], color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  contactsAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  contactsAddText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.primary },
  contactsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.primary },
  contactBody: { flex: 1, gap: 2 },
  contactName: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  contactPhone: { fontSize: fontSize.sm[0], color: colors.textMuted },

  // Shared summary
  sharedCard: {
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.success,
    overflow: 'hidden',
  },
  sharedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  sharedIcon: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedLabel: { flex: 1, fontSize: fontSize.base[0], fontWeight: '600', color: colors.success, fontFamily: fontFamily.sansSemiBold[0] },
})
