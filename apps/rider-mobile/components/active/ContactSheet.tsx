import React, { useCallback, useState } from 'react'
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
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Phone,
  MessageCircle,
  X,
  Check,
  ShieldCheck,
  User,
  Store,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from '../A11yProvider'
import { analytics } from '@chinooz/analytics'
import type { ActiveDelivery, RouteStop } from '@chinooz/types'

interface ContactSheetProps {
  visible: boolean
  delivery: ActiveDelivery
  onClose: () => void
}

/** Mask a phone number for display: show last 4 digits, mask the rest. */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone
  return `•••••${phone.slice(-4)}`
}

/**
 * RX4 — Contact sheet: call (masked-number mock) + in-app chat (mock) with
 * quick canned messages.
 *
 * Shows both the buyer (drop-off contact) and seller (pickup contact) with
 * one-tap call (masked) and chat (mock coming-soon) actions, plus quick
 * canned message chips ("I'm arriving", "I'm outside", etc.).
 *
 * Phone numbers are masked in the UI; the actual call connects through a
 * Chinooz relay (mock — deep-links to tel: with the real number).
 */
export default function ContactSheet({ visible, delivery, onClose }: ContactSheetProps) {
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const [sentMsg, setSentMsg] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setSentMsg(null)
    onClose()
  }, [onClose])

  const handleCall = useCallback(async (stop: RouteStop, role: 'buyer' | 'seller') => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({
      event: 'rider_active_contact_call',
      screen: 'rider-active-delivery',
      target: role,
      masked: true,
    })
    try {
      AccessibilityInfo.announceForAccessibility(
        t('rider.active.contactSheetCallAria', { name: stop.contactName }),
      )
    } catch {}
    // Mock: deep-link to tel: with the real number (in production this would
    // go through a Chinooz relay so the rider's number is never exposed).
    const url = Platform.OS === 'ios' ? `telprompt:${stop.contactPhone}` : `tel:${stop.contactPhone}`
    try { await Linking.openURL(url) } catch {}
  }, [reducedMotion, t])

  const handleChat = useCallback((stop: RouteStop, role: 'buyer' | 'seller') => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({
      event: 'rider_active_contact_chat',
      screen: 'rider-active-delivery',
      target: role,
    })
    try {
      AccessibilityInfo.announceForAccessibility(
        t('rider.active.contactChatSoon'),
      )
    } catch {}
    Alert.alert(t('rider.active.contactChat'), t('rider.active.contactChatSoon'))
  }, [reducedMotion, t])

  const handleCanned = useCallback((message: string) => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({
      event: 'rider_active_canned_message',
      screen: 'rider-active-delivery',
      message,
    })
    setSentMsg(message)
    try { AccessibilityInfo.announceForAccessibility(t('rider.active.cannedSent')) } catch {}
    setTimeout(() => setSentMsg(null), 2000)
  }, [reducedMotion, t])

  const cannedMessages = [
    t('rider.active.cannedArriving'),
    t('rider.active.cannedOutside'),
    t('rider.active.cannedTraffic'),
    t('rider.active.cannedPickedUp'),
    t('rider.active.cannedDropped'),
  ]

  const contacts: { stop: RouteStop; role: 'buyer' | 'seller'; label: string; icon: React.ReactNode }[] = [
    {
      stop: delivery.pickup,
      role: 'seller',
      label: t('rider.active.contactSheetCallSeller'),
      icon: <Store size={18} color={colors.primary} />,
    },
    {
      stop: delivery.dropoff,
      role: 'buyer',
      label: t('rider.active.contactSheetCallBuyer'),
      icon: <User size={18} color={colors.primary} />,
    },
  ]

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
          accessibilityLabel={t('rider.active.contactSheetTitle')}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('rider.active.contactSheetTitle')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.active.issueClose')}
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Masked-number info */}
          <View style={styles.maskedBanner}>
            <ShieldCheck size={16} color={colors.success} />
            <View style={styles.maskedTextWrap}>
              <Text style={styles.maskedTitle}>{t('rider.active.contactSheetMasked')}</Text>
              <Text style={styles.maskedHint}>{t('rider.active.contactSheetMaskedHint')}</Text>
            </View>
          </View>

          {/* Contact rows: seller + buyer */}
          {contacts.map(({ stop, role, label, icon }) => (
            <View key={role} style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <View style={styles.contactIconWrap}>{icon}</View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactRole}>{label}</Text>
                  <Text style={styles.contactName} numberOfLines={1}>{stop.contactName}</Text>
                  <Text style={styles.contactPhone}>{maskPhone(stop.contactPhone)}</Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.active.contactSheetCallAria', { name: stop.contactName })}
                  onPress={() => handleCall(stop, role)}
                  style={[styles.actionBtn, { minHeight: minTouchTarget }]}
                  activeOpacity={0.85}
                  testID={`contact-call-${role}`}
                >
                  <Phone size={16} color={colors.primary} />
                  <Text style={styles.actionText}>{t('rider.active.contactCall')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('rider.active.contactSheetChatAria', { name: stop.contactName })}
                  onPress={() => handleChat(stop, role)}
                  style={[styles.actionBtn, styles.actionBtnChat, { minHeight: minTouchTarget }]}
                  activeOpacity={0.85}
                  testID={`contact-chat-${role}`}
                >
                  <MessageCircle size={16} color={colors.primary} />
                  <Text style={styles.actionText}>{t('rider.active.contactChat')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Quick canned messages */}
          <View style={styles.cannedSection}>
            <Text style={styles.cannedTitle}>{t('rider.active.contactSheetQuickMessages')}</Text>
            <View style={styles.cannedChips}>
              {cannedMessages.map((msg) => {
                const isSent = sentMsg === msg
                return (
                  <TouchableOpacity
                    key={msg}
                    accessibilityRole="button"
                    accessibilityLabel={t('rider.active.cannedSendAria', { message: msg })}
                    onPress={() => handleCanned(msg)}
                    style={[styles.chip, isSent && styles.chipSent]}
                    activeOpacity={0.85}
                    testID={`contact-canned-${msg.slice(0, 10)}`}
                  >
                    {isSent && <Check size={12} color={colors.success} strokeWidth={3} />}
                    <Text style={[styles.chipText, isSent && styles.chipTextSent]}>
                      {isSent ? t('rider.active.cannedSent') : msg}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
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
  title: {
    flex: 1,
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
  maskedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successLight,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  maskedTextWrap: {
    flex: 1,
    gap: 1,
  },
  maskedTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
  maskedHint: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textSecondary,
  },
  contactCard: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing[3],
    gap: spacing[2],
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    gap: 1,
  },
  contactRole: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  contactName: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  contactPhone: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.textMuted,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    paddingVertical: spacing[2.5],
  },
  actionBtnChat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary50,
  },
  actionText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.primary,
  },
  cannedSection: {
    gap: spacing[2],
  },
  cannedTitle: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  cannedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSent: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  chipText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sans[0],
    color: colors.text,
  },
  chipTextSent: {
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.success,
  },
})
