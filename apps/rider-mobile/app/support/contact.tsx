import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
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
  Siren,
  LifeBuoy,
  Wallet,
  Package,
  Bug,
  Shield,
  UserCog,
  Banknote,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  MapPin,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'
import { useActiveDeliveryStore, hasActiveDelivery } from '@chinooz/state'
import {
  RIDER_TICKET_CATEGORIES,
  submitTicket,
  type RiderTicketCategory,
  type RiderTicketAttachment,
  type RiderTicketContext,
} from '@chinooz/mock-data'

const RIDER_HOTLINE = '+9779801200000'

const CATEGORY_ICONS: Record<RiderTicketCategory, LucideIcon> = {
  general: LifeBuoy,
  payout: Wallet,
  deliveryIssue: Package,
  appBug: Bug,
  safety: Shield,
  account: UserCog,
  cod: Banknote,
}

type ContactOption = 'chat' | 'call' | 'ticket'

const TF_PREFIX = 'rider.support.contact.ticketForm'
const tfKey = (k: string) => `${TF_PREFIX}.${k}`

export default function ContactSupportScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()
  const params = useLocalSearchParams<{ topic?: string; ref?: string }>()
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)

  const [activeOption, setActiveOption] = useState<ContactOption | null>(null)

  // Pre-fill context from active delivery or URL params.
  const prefillContext = useMemo<RiderTicketContext>(() => {
    if (activeDelivery && hasActiveDelivery(activeDelivery)) {
      return {
        orderRef: activeDelivery.orderRef,
        deliveryStatus: activeDelivery.status,
        pickup: activeDelivery.pickupLabel,
        dropoff: activeDelivery.dropoffLabel,
        payout: activeDelivery.payout,
        isCod: activeDelivery.isCod,
      }
    }
    if (params.ref) {
      return { orderRef: params.ref }
    }
    return {}
  }, [activeDelivery, params.ref])

  // Pre-select category from trip-help topic.
  const prefillCategory = useMemo<RiderTicketCategory>(() => {
    switch (params.topic) {
      case 'accident': return 'safety'
      case 'buyerIssue': return 'deliveryIssue'
      case 'navigation': return 'deliveryIssue'
      case 'itemIssue': return 'deliveryIssue'
      case 'cancel': return 'deliveryIssue'
      case 'payout': return 'payout'
      default: return 'general'
    }
  }, [params.topic])

  useEffect(() => {
    analytics.screen({
      name: 'rider-support-contact',
      properties: { topic: params.topic ?? 'general', orderRef: prefillContext.orderRef ?? null },
    })
  }, [])

  const startChat = useCallback(() => {
    analytics.track({ event: 'rider_support_chat_started', screen: 'rider-support-contact', properties: { topic: params.topic ?? 'general' } })
    try { AccessibilityInfo.announceForAccessibility(t('rider.support.contact.chatAria')) } catch {}
    // Chat reuses the messaging boundary — navigate to messages.
    router.push('/messages')
  }, [params.topic, router, t])

  const callSupport = useCallback(() => {
    analytics.track({ event: 'rider_support_call_tapped', screen: 'rider-support-contact' })
    try { Linking.openURL(`tel:${RIDER_HOTLINE}`) } catch {}
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
        <Text style={styles.topBarTitle} numberOfLines={1}>{t('rider.support.contact.title')}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>{t('rider.support.contact.subtitle')}</Text>

          {/* Contact option cards */}
          {activeOption === null && (
            <View style={styles.cards}>
              <ContactCardRow
                icon={MessageCircle}
                title={t('rider.support.contact.chatTitle')}
                desc={t('rider.support.contact.chatDesc')}
                btnLabel={t('rider.support.contact.chatBtn')}
                aria={t('rider.support.contact.chatAria')}
                primary
                reducedMotion={reducedMotion}
                onPress={startChat}
              />
              <ContactCardRow
                icon={Phone}
                title={t('rider.support.contact.callTitle')}
                desc={t('rider.support.contact.callDesc')}
                btnLabel={t('rider.support.contact.callBtn')}
                aria={t('rider.support.contact.callAria')}
                reducedMotion={reducedMotion}
                onPress={callSupport}
              />
              <ContactCardRow
                icon={LifeBuoy}
                title={t(tfKey('formTitle'))}
                desc={t(tfKey('formSubtitle'))}
                btnLabel={t(tfKey('formSubmitBtn'))}
                aria={t(tfKey('formSubmitAria'))}
                reducedMotion={reducedMotion}
                onPress={() => {
                  analytics.track({ event: 'rider_support_ticket_form_opened', screen: 'rider-support-contact', properties: { hasContext: !!prefillContext.orderRef } })
                  setActiveOption('ticket')
                }}
              />
            </View>
          )}

          {/* Ticket submit form */}
          {activeOption === 'ticket' && (
            <TicketForm
              t={t}
              prefillContext={prefillContext}
              prefillCategory={prefillCategory}
              onCancel={() => setActiveOption(null)}
              onSuccess={(ticketId) => {
                analytics.track({ event: 'rider_support_ticket_submitted', screen: 'rider-support-contact', properties: { ticketId } })
                router.replace({ pathname: '/support/tickets/[ticket]', params: { ticket: ticketId } })
              }}
            />
          )}

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
      </KeyboardAvoidingView>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Contact option card
// ---------------------------------------------------------------------------

function ContactCardRow({
  icon: Icon,
  title,
  desc,
  btnLabel,
  aria,
  primary,
  reducedMotion,
  onPress,
}: {
  icon: LucideIcon
  title: string
  desc: string
  btnLabel: string
  aria: string
  primary?: boolean
  reducedMotion: boolean
  onPress: () => void
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

  return (
    <Animated.View style={animStyle}>
      <View style={[styles.card, primary && styles.cardPrimary]}>
        <View style={[styles.cardIcon, primary && styles.cardIconPrimary]}>
          <Icon size={22} color={primary ? colors.white : colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
        <TouchableOpacity
          style={[styles.cardBtn, primary ? styles.cardBtnPrimary : styles.cardBtnOutline]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={aria}
          activeOpacity={0.85}
        >
          <Text style={[styles.cardBtnText, primary ? styles.cardBtnTextPrimary : styles.cardBtnTextOutline]}>
            {btnLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Ticket submit form
// ---------------------------------------------------------------------------

function TicketForm({
  t,
  prefillContext,
  prefillCategory,
  onCancel,
  onSuccess,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  prefillContext: RiderTicketContext
  prefillCategory: RiderTicketCategory
  onCancel: () => void
  onSuccess: (ticketId: string) => void
}) {
  const [category, setCategory] = useState<RiderTicketCategory>(prefillCategory)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<RiderTicketAttachment[]>([])
  const [context, setContext] = useState<RiderTicketContext>(prefillContext)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const MAX_DESC = 500

  // Announce pre-filled context on mount.
  useEffect(() => {
    if (context.orderRef) {
      try {
        AccessibilityInfo.announceForAccessibility(
          t(tfKey('formContextAria')) + '. ' + t(tfKey('formContextOrder'), { ref: context.orderRef }),
        )
      } catch {}
    }
  }, [])

  const addAttachment = (kind: 'screenshot' | 'photo') => {
    if (attachments.length >= 3) return
    const id = `att-${Date.now()}-${attachments.length}`
    const name = kind === 'screenshot' ? t(tfKey('formAttachBtn')) : t(tfKey('formAttachPhotoBtn'))
    setAttachments(prev => [...prev, { id, name, kind }])
    analytics.track({ event: 'rider_ticket_attachment_added', screen: 'rider-support-contact', properties: { kind, count: attachments.length + 1 } })
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const removeContext = () => {
    setContext({})
  }

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !description.trim()) {
      setValidationError(true)
      try {
        AccessibilityInfo.announceForAccessibility(t(tfKey('formValidationErrorAria')))
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      } catch {}
      return
    }
    setValidationError(false)
    setSubmitError(false)
    setIsSubmitting(true)
    try {
      const result = await submitTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
        attachments,
        context,
      })
      if (result.success && result.ticket) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) } catch {}
        onSuccess(result.ticket.id)
      } else {
        setSubmitError(true)
        try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.submitErrorAria')) } catch {}
      }
    } catch {
      // Preserve draft + attachments on failure.
      setSubmitError(true)
      try { AccessibilityInfo.announceForAccessibility(t('rider.support.states.submitErrorAria')) } catch {}
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.formWrap}>
      {/* Form header */}
      <View style={styles.formHeader}>
        <Text accessibilityRole="header" style={styles.formTitle}>{t(tfKey('formTitle'))}</Text>
        <TouchableOpacity
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('rider.support.back')}
          hitSlop={8}
        >
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Pre-filled context chip */}
      {context.orderRef ? (
        <View style={styles.contextChip}>
          <View style={styles.contextChipLeft}>
            <MapPin size={14} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.contextChipLabel}>{t(tfKey('formContextLabel'))}</Text>
              <Text style={styles.contextChipValue}>
                {t(tfKey('formContextOrder'), { ref: context.orderRef })}
              </Text>
              {context.pickup && context.dropoff && (
                <Text style={styles.contextChipSub}>
                  {t(tfKey('formContextRoute'), { pickup: context.pickup, dropoff: context.dropoff })}
                </Text>
              )}
              {context.payout != null && (
                <Text style={styles.contextChipSub}>
                  {t(tfKey('formContextPayout'), { amount: context.payout.toLocaleString() })}
                </Text>
              )}
              {context.isCod && (
                <Text style={styles.contextChipSub}>{t(tfKey('formContextCod'))}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={removeContext}
            accessibilityRole="button"
            accessibilityLabel={t(tfKey('formContextRemoveAria'))}
            hitSlop={8}
          >
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.contextNone}>{t(tfKey('formContextNone'))}</Text>
      )}

      {/* Category picker */}
      <Text accessibilityRole="header" style={styles.fieldLabel}>{t(tfKey('formCategoryLabel'))}</Text>
      <View style={styles.categoryGrid}>
        {RIDER_TICKET_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.key]
          const isActive = category === cat.key
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setCategory(cat.key)}
              accessibilityRole="button"
              accessibilityLabel={t(cat.labelKey)}
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.85}
            >
              <Icon size={15} color={isActive ? colors.white : colors.textMuted} />
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]} numberOfLines={1}>
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <Text style={styles.categoryDesc}>{t(RIDER_TICKET_CATEGORIES.find(c => c.key === category)?.descKey ?? tfKey('catGeneralDesc'))}</Text>

      {/* Subject */}
      <Text accessibilityRole="header" style={styles.fieldLabel}>{t(tfKey('formSubjectLabel'))}</Text>
      <TextInput
        style={[styles.textInput, validationError && !subject.trim() && styles.textInputError]}
        placeholder={t(tfKey('formSubjectPlaceholder'))}
        placeholderTextColor={colors.textTertiary}
        value={subject}
        onChangeText={setSubject}
        accessibilityLabel={t(tfKey('formSubjectAria'))}
        maxLength={80}
      />

      {/* Description */}
      <Text accessibilityRole="header" style={styles.fieldLabel}>{t(tfKey('formDescLabel'))}</Text>
      <TextInput
        style={[styles.textArea, validationError && !description.trim() && styles.textInputError]}
        placeholder={t(tfKey('formDescPlaceholder'))}
        placeholderTextColor={colors.textTertiary}
        value={description}
        onChangeText={setDescription}
        accessibilityLabel={t(tfKey('formDescAria'))}
        multiline
        maxLength={MAX_DESC}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{t(tfKey('formCharCount'), { count: description.length, max: MAX_DESC })}</Text>

      {/* Attachments */}
      <Text accessibilityRole="header" style={styles.fieldLabel}>{t(tfKey('formAttachmentsLabel'))}</Text>
      <View style={styles.attachRow}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => addAttachment('screenshot')}
          accessibilityRole="button"
          accessibilityLabel={t(tfKey('formAttachmentsAria'))}
          disabled={attachments.length >= 3}
          activeOpacity={0.85}
        >
          <ImageIcon size={16} color={attachments.length >= 3 ? colors.textTertiary : colors.primary} />
          <Text style={[styles.attachBtnText, attachments.length >= 3 && styles.attachBtnTextDisabled]}>
            {t(tfKey('formAttachBtn'))}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => addAttachment('photo')}
          accessibilityRole="button"
          accessibilityLabel={t(tfKey('formAttachmentsAria'))}
          disabled={attachments.length >= 3}
          activeOpacity={0.85}
        >
          <Camera size={16} color={attachments.length >= 3 ? colors.textTertiary : colors.primary} />
          <Text style={[styles.attachBtnText, attachments.length >= 3 && styles.attachBtnTextDisabled]}>
            {t(tfKey('formAttachPhotoBtn'))}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.attachHint}>{t(tfKey('formAttachHint'))}</Text>

      {/* Attachment thumbnails */}
      {attachments.length > 0 && (
        <View style={styles.attachList}>
          {attachments.map((att) => (
            <View key={att.id} style={styles.attachThumb}>
              <View style={styles.attachThumbIcon}>
                {att.kind === 'screenshot' ? (
                  <ImageIcon size={18} color={colors.primary} />
                ) : (
                  <Camera size={18} color={colors.primary} />
                )}
              </View>
              <Text style={styles.attachThumbName} numberOfLines={1}>{att.name}</Text>
              <TouchableOpacity
                onPress={() => removeAttachment(att.id)}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={8}
              >
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Validation error */}
      {validationError && (
        <View style={styles.validationError} accessibilityRole="alert">
          <Text style={styles.validationErrorText}>{t(tfKey('formValidationError'))}</Text>
        </View>
      )}

      {/* Submit error — draft + attachments preserved */}
      {submitError && (
        <View style={styles.submitErrorBanner} accessibilityRole="alert" accessibilityLabel={t('rider.support.states.submitErrorAria')}>
          <Text style={styles.submitErrorTitle}>{t('rider.support.states.submitErrorTitle')}</Text>
          <Text style={styles.submitErrorBody}>{t('rider.support.states.submitErrorBody')}</Text>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={t(tfKey('formSubmitAria'))}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <Text style={styles.submitBtnText}>{t(tfKey('formSubmitting'))}</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <CheckCircle2 size={18} color={colors.white} />
            <Text style={styles.submitBtnText}>{t(tfKey('formSubmitBtn'))}</Text>
          </View>
        )}
      </TouchableOpacity>
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
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },

  // Contact cards
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

  // Urgent
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

  // Form
  formWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    gap: spacing[2],
  },
  contextChipLeft: { flexDirection: 'row', gap: spacing[2], flex: 1 },
  contextChipLabel: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  contextChipValue: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  contextChipSub: { fontSize: fontSize.xs[0], color: colors.textMuted },
  contextNone: { fontSize: fontSize.sm[0], color: colors.textTertiary, fontStyle: 'italic', fontFamily: fontFamily.sans[0] },
  fieldLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 36,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },
  categoryChipTextActive: { color: colors.white },
  categoryDesc: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base[0],
    color: colors.text,
    minHeight: 48,
  },
  textInputError: { borderColor: colors.error },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base[0],
    color: colors.text,
    minHeight: 100,
  },
  charCount: { fontSize: fontSize.xs[0], color: colors.textTertiary, textAlign: 'right', fontFamily: fontFamily.sans[0] },
  attachRow: { flexDirection: 'row', gap: spacing[2] },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    minHeight: 44,
  },
  attachBtnText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  attachBtnTextDisabled: { color: colors.textTertiary },
  attachHint: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  attachList: { gap: spacing[2] },
  attachThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  attachThumbIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachThumbName: { flex: 1, fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },
  validationError: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
  },
  validationErrorText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.error },
  submitErrorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  submitErrorTitle: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.error },
  submitErrorBody: { fontSize: fontSize.xs[0], color: colors.textSecondary, lineHeight: 16 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[5],
    minHeight: 52,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },
})
