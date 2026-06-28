import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  AccessibilityInfo,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Phone,
  Mail,
  Siren,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'
import { useActiveDeliveryStore } from '@chinooz/state'

const RIDER_HOTLINE = '+9779801200000'
const RIDER_EMAIL = 'riders@chinooz.com'

type ContactCard = {
  key: 'chat' | 'call' | 'email'
  icon: LucideIcon
  titleKey: string
  descKey: string
  btnKey: string
  ariaKey: string
  onPress: () => void
  primary?: boolean
}

export default function ContactSupportScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const params = useLocalSearchParams<{ topic?: string; ref?: string }>()
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)

  useEffect(() => {
    analytics.screen({
      name: 'rider-support-contact',
      properties: { topic: params.topic ?? 'general', orderRef: params.ref ?? activeDelivery?.orderRef ?? null },
    })
  }, [])

  const startChat = useCallback(() => {
    analytics.track({ event: 'rider_support_chat_started', screen: 'rider-support-contact', properties: { topic: params.topic ?? 'general' } })
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.contact.chatAria')) } catch {}
    // Chat surface is a future task; this is the entry point.
  }, [params.topic])

  const callSupport = useCallback(() => {
    analytics.track({ event: 'rider_support_call_tapped', screen: 'rider-support-contact' })
    try { Linking.openURL(`tel:${RIDER_HOTLINE}`) } catch {}
  }, [])

  const emailSupport = useCallback(() => {
    analytics.track({ event: 'rider_support_email_tapped', screen: 'rider-support-contact' })
    const subject = params.ref ? `Order ${params.ref}` : 'Rider support'
    try { Linking.openURL(`mailto:${RIDER_EMAIL}?subject=${encodeURIComponent(subject)}`) } catch {}
  }, [params.ref])

  const cards: ContactCard[] = [
    { key: 'chat', icon: MessageCircle, titleKey: 'rider.support.contact.chatTitle', descKey: 'rider.support.contact.chatDesc', btnKey: 'rider.support.contact.chatBtn', ariaKey: 'rider.support.contact.chatAria', onPress: startChat, primary: true },
    { key: 'call', icon: Phone, titleKey: 'rider.support.contact.callTitle', descKey: 'rider.support.contact.callDesc', btnKey: 'rider.support.contact.callBtn', ariaKey: 'rider.support.contact.callAria', onPress: callSupport },
    { key: 'email', icon: Mail, titleKey: 'rider.support.contact.emailTitle', descKey: 'rider.support.contact.emailDesc', btnKey: 'rider.support.contact.emailBtn', ariaKey: 'rider.support.contact.emailAria', onPress: emailSupport },
  ]

  const topicHint = params.ref
    ? t('rider.support.tripHelpSubtitle', { ref: params.ref })
    : null

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
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.contact.title')}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{t('rider.support.contact.subtitle')}</Text>

        {topicHint && (
          <View style={styles.topicChip} accessibilityRole="text">
            <Text style={styles.topicChipText}>{topicHint}</Text>
          </View>
        )}

        <View style={styles.cards}>
          {cards.map((card) => (
            <ContactCardRow key={card.key} card={card} reducedMotion={reducedMotion} t={t} />
          ))}
        </View>

        {/* Urgent / emergency pointer to SOS */}
        <View style={styles.urgentCard}>
          <View style={styles.urgentHead}>
            <Siren size={20} color={colors.error} />
            <Text accessibilityRole="header" style={styles.urgentTitle}>
              {t('rider.support.contact.urgentTitle')}
            </Text>
          </View>
          <Text style={styles.urgentBody}>{t('rider.support.contact.urgentBody')}</Text>
          <TouchableOpacity
            style={styles.urgentBtn}
            onPress={() => router.push('/support/sos')}
            accessibilityRole="button"
            accessibilityLabel={t('rider.support.contact.urgentBtnAria')}
            activeOpacity={0.85}
          >
            <Text style={styles.urgentBtnText}>{t('rider.support.contact.urgentBtn')}</Text>
            <ChevronRight size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function ContactCardRow({
  card,
  reducedMotion,
  t,
}: {
  card: ContactCard
  reducedMotion: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const scale = useSharedValue(1)
  const handlePressIn = () => {
    if (!reducedMotion) {
      scale.value = withSpring(0.97, { damping: 18, stiffness: 400 })
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    }
  }
  const handlePressOut = () => { if (!reducedMotion) scale.value = withSpring(1, { damping: 18, stiffness: 400 }) }
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const Icon = card.icon

  return (
    <Animated.View style={animStyle}>
      <View style={[styles.card, card.primary && styles.cardPrimary]}>
        <View style={[styles.cardIcon, card.primary && styles.cardIconPrimary]}>
          <Icon size={22} color={card.primary ? colors.white : colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{t(card.titleKey)}</Text>
          <Text style={styles.cardDesc}>{t(card.descKey)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.cardBtn, card.primary ? styles.cardBtnPrimary : styles.cardBtnOutline]}
          onPress={card.onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={t(card.ariaKey)}
          activeOpacity={0.85}
        >
          <Text style={[styles.cardBtnText, card.primary ? styles.cardBtnTextPrimary : styles.cardBtnTextOutline]}>
            {t(card.btnKey)}
          </Text>
        </TouchableOpacity>
      </View>
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
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  topicChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary50,
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  topicChipText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  cards: { gap: spacing[3] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardPrimary: { borderColor: colors.primary, borderWidth: 2 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconPrimary: { backgroundColor: colors.primary },
  cardBody: { gap: 2 },
  cardTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: fontSize.sm[0], color: colors.textMuted },
  cardBtn: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnPrimary: { backgroundColor: colors.primary },
  cardBtnOutline: { borderWidth: 1.5, borderColor: colors.primary },
  cardBtnText: { fontSize: fontSize.base[0], fontWeight: '700' },
  cardBtnTextPrimary: { color: colors.white },
  cardBtnTextOutline: { color: colors.primary },
  urgentCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing[4],
    gap: spacing[2],
    marginTop: spacing[2],
  },
  urgentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  urgentTitle: { fontSize: fontSize.md[0], fontWeight: '700', color: colors.error },
  urgentBody: { fontSize: fontSize.sm[0], color: colors.textSecondary, lineHeight: 20 },
  urgentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  urgentBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },
})
