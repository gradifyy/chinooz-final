import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  AccessibilityInfo,
  Linking,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Siren,
  X,
  Share2,
  ShieldAlert,
  CheckCircle2,
  LifeBuoy,
  Navigation,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadows } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery } from '@chinooz/types'

interface SafetySheetProps {
  visible: boolean
  delivery: ActiveDelivery
  onClose: () => void
}

type SosPhase = 'idle' | 'active'
type EmergencyCall = {
  key: string
  icon: LucideIcon
  label: string
  number: string
}

const EMERGENCY_CALLS: EmergencyCall[] = [
  { key: 'police', icon: Siren, label: 'Police', number: '100' },
  { key: 'ambulance', icon: LifeBuoy, label: 'Ambulance', number: '102' },
  { key: 'traffic', icon: Navigation, label: 'Traffic', number: '103' },
]

/**
 * RX4 — Safety sheet: always-reachable SOS with emergency options, share-trip,
 * and report safety issue.
 *
 * The SOS activation uses a press-and-hold pattern (3s) to prevent accidental
 * triggers, but the emergency call buttons are one-tap for genuine emergencies.
 * Share-trip sends live location + trip details to a trusted contact (mock).
 * Report safety issue deep-links to the existing /support/safety/report route.
 *
 * All actions are logged (mock analytics). Safety actions never blocked by
 * reduced-motion — haptics are skipped but actions always fire.
 */
export default function SafetySheet({ visible, delivery, onClose }: SafetySheetProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const [sosPhase, setSosPhase] = useState<SosPhase>('idle')
  const [tripShared, setTripShared] = useState(false)
  const holdElapsed = useRef(0)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const HOLD_MS = 3000
  const TICK_MS = 100

  // Reset state when sheet opens.
  useEffect(() => {
    if (visible) {
      setSosPhase('idle')
      setTripShared(false)
      holdElapsed.current = 0
    }
  }, [visible])

  // Cleanup hold interval on unmount.
  useEffect(() => {
    return () => {
      if (holdInterval.current) {
        clearInterval(holdInterval.current)
        holdInterval.current = null
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current)
      holdInterval.current = null
    }
    onClose()
  }, [onClose])

  // --- SOS press-and-hold ---
  const startHold = useCallback(() => {
    if (sosPhase === 'active') return
    holdElapsed.current = 0
    holdInterval.current = setInterval(() => {
      holdElapsed.current += TICK_MS
      if (holdElapsed.current >= HOLD_MS) {
        if (holdInterval.current) {
          clearInterval(holdInterval.current)
          holdInterval.current = null
        }
        setSosPhase('active')
        try {
          if (!reducedMotion) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          }
        } catch {}
        try {
          AccessibilityInfo.announceForAccessibility(t('rider.active.sosSheetActiveBody'))
        } catch {}
        analytics.track({
          event: 'rider_active_sos_activated',
          screen: 'rider-active-delivery',
          orderRef: delivery.orderRef,
        })
      }
    }, TICK_MS)
  }, [sosPhase, reducedMotion, t, delivery.orderRef])

  const cancelHold = useCallback(() => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current)
      holdInterval.current = null
    }
  }, [])

  // --- Emergency call ---
  const handleEmergencyCall = useCallback(async (call: EmergencyCall) => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    } catch {}
    analytics.track({
      event: 'rider_active_emergency_call',
      screen: 'rider-active-delivery',
      target: call.key,
    })
    try {
      AccessibilityInfo.announceForAccessibility(`${call.label}: ${call.number}`)
    } catch {}
    const url = Platform.OS === 'ios' ? `telprompt:${call.number}` : `tel:${call.number}`
    try { await Linking.openURL(url) } catch {}
  }, [reducedMotion])

  // --- Share trip status ---
  const handleShareTrip = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    analytics.track({
      event: 'rider_active_share_trip',
      screen: 'rider-active-delivery',
      orderRef: delivery.orderRef,
    })
    setTripShared(true)
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.sosSheetShareTripDone')) } catch {}
  }, [reducedMotion, t, delivery.orderRef])

  // --- Report safety issue (deep-link to existing route) ---
  const handleReportSafety = useCallback(() => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({
      event: 'rider_active_report_safety',
      screen: 'rider-active-delivery',
    })
    handleClose()
    router.push({
      pathname: '/support/safety/report',
      params: { ref: delivery.orderRef },
    })
  }, [reducedMotion, handleClose, router, delivery.orderRef])

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={styles.sheet}
          onPress={() => {}}
          accessibilityRole="alert"
          accessibilityLabel={t('rider.active.sosSheetAria')}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Siren size={22} color={colors.error} />
              <Text style={styles.title}>{t('rider.active.sosSheetTitle')}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.sosSheetClose')}
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>{t('rider.active.sosSheetSubtitle')}</Text>

          {/* SOS button: press-and-hold to activate */}
          {sosPhase === 'idle' ? (
            <View style={styles.sosSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('rider.active.sosSheetConfirm')}
                accessibilityHint={t('rider.active.sosSheetConfirmBody')}
                onPressIn={startHold}
                onPressOut={cancelHold}
                style={[styles.sosHoldBtn, { minHeight: 88 }]}
              >
                <Siren size={32} color={colors.white} />
                <Text style={styles.sosHoldText}>{t('rider.active.sosSheetConfirm')}</Text>
              </Pressable>
              <Text style={styles.sosConfirmBody}>{t('rider.active.sosSheetConfirmBody')}</Text>
            </View>
          ) : (
            <View style={styles.sosActiveSection}>
              <View style={styles.sosActiveBadge}>
                <CheckCircle2 size={24} color={colors.success} />
                <Text style={styles.sosActiveText}>{t('rider.active.sosSheetActive')}</Text>
              </View>
              <Text style={styles.sosActiveBody}>{t('rider.active.sosSheetActiveBody')}</Text>
            </View>
          )}

          {/* Emergency direct calls */}
          <View style={styles.emergencySection}>
            <Text style={styles.sectionTitle}>{t('rider.active.sosSheetCallEmergency')}</Text>
            <View style={styles.emergencyRow}>
              {EMERGENCY_CALLS.map((call) => {
                const Icon = call.icon
                return (
                  <TouchableOpacity
                    key={call.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${call.label}: ${call.number}`}
                    onPress={() => handleEmergencyCall(call)}
                    style={[styles.emergencyBtn, { minHeight: minTouchTarget }]}
                    activeOpacity={0.85}
                    testID={`sos-emergency-${call.key}`}
                  >
                    <Icon size={20} color={colors.error} />
                    <Text style={styles.emergencyLabel}>{call.label}</Text>
                    <Text style={styles.emergencyNumber}>{call.number}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Share trip + Report safety */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.sosSheetShareTrip')}
              accessibilityHint={t('rider.active.sosSheetShareTripHint')}
              onPress={handleShareTrip}
              style={[styles.secondaryBtn, tripShared && styles.secondaryBtnDone, { minHeight: minTouchTarget }]}
              activeOpacity={0.85}
              disabled={tripShared}
              testID="sos-share-trip"
            >
              <Share2 size={18} color={tripShared ? colors.success : colors.primary} />
              <Text style={[styles.secondaryText, tripShared && styles.secondaryTextDone]}>
                {tripShared ? t('rider.active.sosSheetShareTripDone') : t('rider.active.sosSheetShareTrip')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.sosSheetReportSafety')}
              accessibilityHint={t('rider.active.sosSheetReportSafetyHint')}
              onPress={handleReportSafety}
              style={[styles.secondaryBtn, { minHeight: minTouchTarget }]}
              activeOpacity={0.85}
              testID="sos-report-safety"
            >
              <ShieldAlert size={18} color={colors.warning} />
              <Text style={styles.secondaryText}>{t('rider.active.sosSheetReportSafety')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  // SOS hold button
  sosSection: {
    gap: spacing[2],
  },
  sosHoldBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.error,
    borderRadius: radii.xl,
    width: '100%',
    ...shadows.md,
  },
  sosHoldText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.white,
  },
  sosConfirmBody: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // SOS active
  sosActiveSection: {
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successLight,
    borderRadius: radii.xl,
    padding: spacing[4],
  },
  sosActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sosActiveText: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.success,
  },
  sosActiveBody: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Emergency calls
  emergencySection: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  emergencyRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  emergencyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.error,
  },
  emergencyLabel: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.error,
  },
  emergencyNumber: {
    fontSize: fontSize.lg[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.error,
  },
  // Secondary actions
  actionsSection: {
    gap: spacing[2],
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  secondaryBtnDone: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  secondaryText: {
    flex: 1,
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  secondaryTextDone: {
    color: colors.success,
  },
})
