import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  X,
  Camera,
  CheckCircle2,
  Shield,
  Car,
  MapPinOff,
  CircleAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useActiveDeliveryStore, hasActiveDelivery } from '@chinooz/state'
import {
  RIDER_SAFETY_INCIDENT_TYPES,
  reportSafetyIncident,
  type RiderSafetyIncidentType,
  type RiderSafetyIncidentAttachment,
  type RiderSafetyIncidentContext,
} from '@chinooz/mock-data'

const INCIDENT_ICONS: Record<RiderSafetyIncidentType, LucideIcon> = {
  harassment: Shield,
  accident: Car,
  unsafeAddress: MapPinOff,
  other: CircleAlert,
}

const SF_PREFIX = 'rider.support.sos.safety'
const sfKey = (k: string) => `${SF_PREFIX}.${k}`

export default function ReportIncidentScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ ref?: string }>()
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)

  const [type, setType] = useState<RiderSafetyIncidentType | null>(null)
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<RiderSafetyIncidentAttachment[]>([])
  const [context, setContext] = useState<RiderSafetyIncidentContext>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null)
  const MAX_DESC = 500

  // Pre-fill context from active delivery.
  useEffect(() => {
    if (activeDelivery && hasActiveDelivery(activeDelivery)) {
      setContext({
        orderRef: activeDelivery.orderRef,
        pickup: activeDelivery.pickupLabel,
        dropoff: activeDelivery.dropoffLabel,
        deliveryStatus: activeDelivery.status,
      })
    } else if (params.ref) {
      setContext({ orderRef: params.ref })
    }
  }, [])

  useEffect(() => {
    analytics.screen({ name: 'rider-safety-report-incident', properties: { orderRef: context.orderRef ?? null } })
  }, [])

  const addPhoto = () => {
    if (attachments.length >= 4) return
    const id = `photo-${Date.now()}-${attachments.length}`
    const name = `Photo ${attachments.length + 1}`
    setAttachments(prev => [...prev, { id, name, kind: 'photo' }])
    analytics.track({ event: 'rider_safety_photo_added', screen: 'rider-safety-report-incident', properties: { count: attachments.length + 1 } })
  }

  const removePhoto = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleSubmit = async () => {
    if (!type || !description.trim()) {
      setValidationError(true)
      try {
        AccessibilityInfo.announceForAccessibility(t(sfKey('incidentValidationErrorAria')))
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      } catch {}
      return
    }
    setValidationError(false)
    setSubmitError(false)
    setIsSubmitting(true)
    try {
      const result = await reportSafetyIncident({
        type,
        description: description.trim(),
        attachments,
        context,
      })
      if (result.success && result.incident) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) } catch {}
        analytics.track({ event: 'rider_safety_incident_reported', screen: 'rider-safety-report-incident', properties: { incidentId: result.incident.id, type } })
        setSubmitted({ id: result.incident.id })
      } else {
        // Preserve draft + attachments on failure.
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

  // ---- Success state ----
  if (submitted) {
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
          <Text style={styles.topBarTitle} numberOfLines={1}>{t(sfKey('incidentFormTitle'))}</Text>
          <View style={styles.topBarBtn} />
        </View>
        <View style={styles.successWrap} accessibilityLiveRegion="polite" accessibilityLabel={t(sfKey('incidentSuccessTitle'))}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={44} color={colors.success} />
          </View>
          <Text accessibilityRole="header" style={styles.successTitle}>{t(sfKey('incidentSuccessTitle'))}</Text>
          <Text style={styles.successBody}>{t(sfKey('incidentSuccessBody'), { id: submitted.id })}</Text>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successPrimaryBtn}
              onPress={() => router.replace('/support/sos')}
              accessibilityRole="button"
              accessibilityLabel={t(sfKey('incidentSuccessDone'))}
            >
              <Text style={styles.successPrimaryText}>{t(sfKey('incidentSuccessDone'))}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successSecondaryBtn}
              onPress={() => {
                setSubmitted(null)
                setType(null)
                setDescription('')
                setAttachments([])
                setValidationError(false)
              }}
              accessibilityRole="button"
              accessibilityLabel={t(sfKey('incidentSuccessNew'))}
            >
              <Text style={styles.successSecondaryText}>{t(sfKey('incidentSuccessNew'))}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

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
        <Text style={styles.topBarTitle} numberOfLines={1}>{t(sfKey('incidentFormTitle'))}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[6] }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.formHeader}>
            <TriangleAlert size={20} color={colors.error} />
            <Text style={styles.formTitle}>{t(sfKey('incidentFormTitle'))}</Text>
          </View>
          <Text style={styles.formSubtitle}>{t(sfKey('incidentFormSubtitle'))}</Text>

          {/* Linked trip context */}
          {context.orderRef && (
            <View style={styles.contextChip} accessibilityLabel={t(sfKey('incidentContextAria'))}>
              <Shield size={14} color={colors.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.contextChipLabel}>{t(sfKey('incidentContextLabel'))}</Text>
                <Text style={styles.contextChipValue}>{t('rider.support.tripHelpSubtitle', { ref: context.orderRef })}</Text>
                {context.pickup && context.dropoff && (
                  <Text style={styles.contextChipSub}>{context.pickup} → {context.dropoff}</Text>
                )}
              </View>
            </View>
          )}

          {/* Incident type picker */}
          <Text accessibilityRole="header" style={styles.fieldLabel}>{t(sfKey('incidentTypeLabel'))}</Text>
          <View style={styles.typeGrid}>
            {RIDER_SAFETY_INCIDENT_TYPES.map((it) => {
              const Icon = INCIDENT_ICONS[it.key]
              const isActive = type === it.key
              return (
                <TouchableOpacity
                  key={it.key}
                  style={[styles.typeCard, isActive && styles.typeCardActive]}
                  onPress={() => setType(it.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t(it.labelKey)}
                  accessibilityState={{ selected: isActive }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.typeIcon, isActive && styles.typeIconActive]}>
                    <Icon size={18} color={isActive ? colors.white : colors.error} />
                  </View>
                  <View style={styles.typeBody}>
                    <Text style={[styles.typeLabel, isActive && styles.typeLabelActive]}>{t(it.labelKey)}</Text>
                    <Text style={styles.typeDesc} numberOfLines={2}>{t(it.descKey)}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Description */}
          <Text accessibilityRole="header" style={styles.fieldLabel}>{t(sfKey('incidentDescLabel'))}</Text>
          <TextInput
            style={[styles.textArea, validationError && !description.trim() && styles.textInputError]}
            placeholder={t(sfKey('incidentDescPlaceholder'))}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            accessibilityLabel={t(sfKey('incidentDescAria'))}
            multiline
            maxLength={MAX_DESC}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{t(sfKey('incidentCharCount'), { count: description.length, max: MAX_DESC })}</Text>

          {/* Photos */}
          <Text accessibilityRole="header" style={styles.fieldLabel}>{t(sfKey('incidentPhotosLabel'))}</Text>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={addPhoto}
            accessibilityRole="button"
            accessibilityLabel={t(sfKey('incidentPhotosAria'))}
            disabled={attachments.length >= 4}
            activeOpacity={0.85}
          >
            <Camera size={16} color={attachments.length >= 4 ? colors.textTertiary : colors.primary} />
            <Text style={[styles.photoBtnText, attachments.length >= 4 && styles.photoBtnTextDisabled]}>
              {t(sfKey('incidentPhotoBtn'))}
            </Text>
          </TouchableOpacity>
          <Text style={styles.photoHint}>{t(sfKey('incidentPhotoHint'))}</Text>

          {attachments.length > 0 && (
            <View style={styles.photoList}>
              {attachments.map((att) => (
                <View key={att.id} style={styles.photoThumb}>
                  <View style={styles.photoThumbIcon}>
                    <Camera size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.photoThumbName} numberOfLines={1}>{att.name}</Text>
                  <TouchableOpacity
                    onPress={() => removePhoto(att.id)}
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
              <Text style={styles.validationErrorText}>{t(sfKey('incidentValidationError'))}</Text>
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
            accessibilityLabel={t(sfKey('incidentSubmitAria'))}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <Text style={styles.submitBtnText}>{t(sfKey('incidentSubmitting'))}</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <TriangleAlert size={18} color={colors.white} />
                <Text style={styles.submitBtnText}>{t(sfKey('incidentSubmitBtn'))}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[3], paddingVertical: spacing[3], backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] },

  // Form header
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  formTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  formSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, lineHeight: 18, fontFamily: fontFamily.sans[0] },

  // Context chip
  contextChip: {
    flexDirection: 'row', gap: spacing[2], backgroundColor: colors.primary50, borderRadius: radii.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2.5],
  },
  contextChipLabel: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  contextChipValue: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  contextChipSub: { fontSize: fontSize.xs[0], color: colors.textMuted },

  // Fields
  fieldLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },

  // Type grid
  typeGrid: { gap: spacing[2] },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: spacing[3], paddingVertical: spacing[3],
  },
  typeCardActive: { borderColor: colors.error, borderWidth: 2, backgroundColor: colors.errorLight },
  typeIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.errorLight, alignItems: 'center', justifyContent: 'center' },
  typeIconActive: { backgroundColor: colors.error },
  typeBody: { flex: 1, gap: 2 },
  typeLabel: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.text },
  typeLabelActive: { color: colors.error },
  typeDesc: { fontSize: fontSize.sm[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },

  // Text input
  textArea: {
    backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontSize: fontSize.base[0], color: colors.text,
    minHeight: 120, textAlignVertical: 'top',
  },
  textInputError: { borderColor: colors.error },
  charCount: { fontSize: fontSize.xs[0], color: colors.textTertiary, textAlign: 'right', fontFamily: fontFamily.sans[0] },

  // Photos
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], borderRadius: radii.md, borderWidth: 1.5,
    borderColor: colors.primary, paddingVertical: spacing[2.5], paddingHorizontal: spacing[4], minHeight: 44,
    alignSelf: 'flex-start',
  },
  photoBtnText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  photoBtnTextDisabled: { color: colors.textTertiary },
  photoHint: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  photoList: { gap: spacing[2] },
  photoThumb: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.primary50, borderRadius: radii.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
  },
  photoThumbIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  photoThumbName: { flex: 1, fontSize: fontSize.sm[0], fontWeight: '500', color: colors.text },

  // Validation
  validationError: {
    backgroundColor: colors.errorLight, borderRadius: radii.md, borderWidth: 1, borderColor: colors.error,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2.5],
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

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error,
    borderRadius: radii.md, paddingVertical: spacing[3.5], paddingHorizontal: spacing[5], minHeight: 52,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] },
  successIcon: { width: 72, height: 72, borderRadius: 9999, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: fontSize.xl[0], fontWeight: '800', color: colors.success, textAlign: 'center', fontFamily: fontFamily.sansBold[0] },
  successBody: { fontSize: fontSize.base[0], color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: fontFamily.sans[0] },
  successActions: { gap: spacing[2], marginTop: spacing[2], alignSelf: 'stretch' },
  successPrimaryBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing[3.5], alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  successPrimaryText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base[0] },
  successSecondaryBtn: { borderRadius: radii.md, paddingVertical: spacing[3], borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  successSecondaryText: { color: colors.textMuted, fontWeight: '600', fontSize: fontSize.base[0] },
})
