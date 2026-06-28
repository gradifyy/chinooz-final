import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CircleCheck,
  IdCard,
  Bike,
  FileText,
  ClipboardCheck,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import {
  useOnboardingStore,
  type OnboardingStep,
  type ConsentState,
  type DocumentKey,
} from '@chinooz/state'
import { submitRiderOnboarding } from '@chinooz/mock-data/api'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { analytics } from '@chinooz/analytics'
import ProgressStepper from './ProgressStepper'

const STEP_LABEL_KEYS: Record<OnboardingStep, string> = {
  personal: 'rider.onboarding.stepPersonal',
  vehicle: 'rider.onboarding.stepVehicle',
  documents: 'rider.onboarding.stepDocuments',
  review: 'rider.onboarding.stepReview',
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  bicycle: 'rider.onboarding.vehicle.typeBicycle',
  motorbike: 'rider.onboarding.vehicle.typeMotorbike',
  scooter: 'rider.onboarding.vehicle.typeScooter',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'rider.onboarding.review.genderMale',
  female: 'rider.onboarding.review.genderFemale',
  other: 'rider.onboarding.review.genderOther',
  prefer_not_to_say: 'rider.onboarding.review.genderPreferNotToSay',
}

const DOC_KEYS: DocumentKey[] = ['idFront', 'idBack', 'license', 'registration', 'selfie']

export default function ReviewStepScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useOnboardingStore(s => s.draft)
  const setConsent = useOnboardingStore(s => s.setConsent)
  const setCurrentStep = useOnboardingStore(s => s.setCurrentStep)
  const reset = useOnboardingStore(s => s.reset)

  const [consent, setConsentState] = useState<ConsentState>(draft.consent)
  const [initialConsent, setInitialConsent] = useState<ConsentState>(draft.consent)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [dirtyOpen, setDirtyOpen] = useState(false)
  const pendingExit = useRef<(() => void) | null>(null)

  useEffect(() => {
    setCurrentStep('review')
    analytics.screen({ name: 'rider-onboarding-review' })
  }, [setCurrentStep])

  const stepLabels = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(STEP_LABEL_KEYS) as OnboardingStep[]).map(k => [
          k,
          t(STEP_LABEL_KEYS[k]),
        ]),
      ) as Record<OnboardingStep, string>,
    [t],
  )

  const isDirty = useMemo(() => {
    return consent.riderAgreement !== initialConsent.riderAgreement ||
      consent.dataProcessing !== initialConsent.dataProcessing
  }, [consent, initialConsent])

  const toggleConsent = useCallback(
    (key: keyof ConsentState) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      setConsentState(prev => ({ ...prev, [key]: !prev[key] }))
      setConsentError(false)
    },
    [],
  )

  const docsUploadedCount = useMemo(() => {
    return DOC_KEYS.filter(k => draft.documents[k].uploaded).length
  }, [draft.documents])

  const guardedExit = useCallback(
    (exitFn: () => void) => {
      if (!isDirty) {
        exitFn()
        return
      }
      pendingExit.current = exitFn
      setDirtyOpen(true)
    },
    [isDirty],
  )

  const handleBack = useCallback(() => {
    guardedExit(() => router.back())
  }, [guardedExit, router])

  const editJump = useCallback(
    (step: 'personal' | 'vehicle' | 'documents') => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      setCurrentStep(step)
      router.push(`/onboarding/${step === 'personal' ? '' : step}` as never)
    },
    [router, setCurrentStep],
  )

  const handleSubmit = useCallback(async () => {
    if (!consent.riderAgreement || !consent.dataProcessing) {
      setConsentError(true)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        AccessibilityInfo.announceForAccessibility(
          t('rider.onboarding.review.consentRequired'),
        )
      } catch {}
      return
    }

    setSubmitting(true)
    setConsent(consent)
    try {
      await submitRiderOnboarding({
        personal: draft.personal,
        vehicle: draft.vehicle,
        documents: draft.documents,
        consent,
      })
      setInitialConsent(consent)
      setSubmitted(true)
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      analytics.track({ name: 'rider_onboarding_submitted' })
    } finally {
      setSubmitting(false)
    }
  }, [consent, draft, setConsent, t])

  const handleGoPending = useCallback(() => {
    reset()
    router.replace('/pending')
  }, [reset, router])

  const submitBtnScale = useSharedValue(1)
  const onPressInSubmit = useCallback(() => {
    if (reduced) return
    submitBtnScale.value = withSpring(0.97, { damping: 18, stiffness: 400 })
  }, [reduced])
  const onPressOutSubmit = useCallback(() => {
    if (reduced) return
    submitBtnScale.value = withSpring(1, { damping: 18, stiffness: 400 })
  }, [reduced])
  const submitBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitBtnScale.value }],
  }))

  if (submitted) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.topRow}>
            <View style={styles.backBtnPlaceholder} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('rider.onboarding.review.title')}
            </Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
          <ProgressStepper currentStep="review" labels={stepLabels} />
        </View>

        <View style={styles.submittedBody}>
          <View style={styles.submittedIconWrap} accessibilityRole="image">
            <CircleCheck size={48} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={styles.submittedTitle}>
            {t('rider.onboarding.review.submittedTitle')}
          </Text>
          <Text style={styles.submittedBodyText}>
            {t('rider.onboarding.review.submittedBody')}
          </Text>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <TouchableOpacity
            onPress={handleGoPending}
            style={styles.nextBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('rider.pending.goOnlineAria')}
          >
            <Text style={styles.nextBtnText}>
              {t('rider.pending.title')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* Header with back + stepper */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.review.backAria')}
          >
            <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('rider.onboarding.review.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <ProgressStepper currentStep="review" labels={stepLabels} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing[10] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            {t('rider.onboarding.review.subtitle')}
          </Text>

          {/* Personal details summary */}
          <SummaryCard
            icon={IdCard}
            title={t('rider.onboarding.review.sectionPersonal')}
            editLabel={t('rider.onboarding.review.edit')}
            editAria={t('rider.onboarding.review.editAria')}
            onEdit={() => editJump('personal')}
          >
            <SummaryRow label={t('rider.onboarding.review.personalName')} value={draft.personal.name || '—'} />
            <SummaryRow label={t('rider.onboarding.review.personalDob')} value={draft.personal.dateOfBirth || '—'} />
            <SummaryRow
              label={t('rider.onboarding.review.personalGender')}
              value={draft.personal.gender ? t(GENDER_LABELS[draft.personal.gender] ?? '') : '—'}
            />
            <SummaryRow label={t('rider.onboarding.review.personalCity')} value={draft.personal.city || '—'} />
            <SummaryRow label={t('rider.onboarding.review.personalZone')} value={draft.personal.zone || '—'} />
            <SummaryRow
              label={t('rider.onboarding.review.personalEmergency')}
              value={draft.personal.emergencyName ? `${draft.personal.emergencyName} (${draft.personal.emergencyPhone})` : '—'}
            />
          </SummaryCard>

          {/* Vehicle details summary */}
          <SummaryCard
            icon={Bike}
            title={t('rider.onboarding.review.sectionVehicle')}
            editLabel={t('rider.onboarding.review.edit')}
            editAria={t('rider.onboarding.review.editVehicleAria')}
            onEdit={() => editJump('vehicle')}
          >
            <SummaryRow
              label={t('rider.onboarding.review.vehicleType')}
              value={draft.vehicle.type ? t(VEHICLE_TYPE_LABELS[draft.vehicle.type] ?? '') : '—'}
            />
            <SummaryRow label={t('rider.onboarding.review.vehicleMakeModel')} value={draft.vehicle.makeModel || '—'} />
            <SummaryRow label={t('rider.onboarding.review.vehiclePlate')} value={draft.vehicle.plate || '—'} />
            <SummaryRow label={t('rider.onboarding.review.vehicleColor')} value={draft.vehicle.color || '—'} />
          </SummaryCard>

          {/* Documents summary */}
          <SummaryCard
            icon={FileText}
            title={t('rider.onboarding.review.sectionDocuments')}
            editLabel={t('rider.onboarding.review.edit')}
            editAria={t('rider.onboarding.review.editDocumentsAria')}
            onEdit={() => editJump('documents')}
          >
            <View style={styles.docsSummaryRow}>
              <Text style={styles.summaryRowLabel}>
                {docsUploadedCount} {t('rider.onboarding.review.docsCount')}
              </Text>
              <View style={styles.docsStatusWrap}>
                {DOC_KEYS.map(key => {
                  const uploaded = draft.documents[key].uploaded
                  return (
                    <View
                      key={key}
                      style={[styles.docDot, uploaded ? styles.docDotUploaded : styles.docDotNot]}
                      accessibilityRole="image"
                      accessibilityLabel={uploaded ? t('rider.onboarding.review.docsUploaded') : t('rider.onboarding.review.docsNotUploaded')}
                    >
                      {uploaded ? <Check size={8} color={colors.white} strokeWidth={3} /> : null}
                    </View>
                  )
                })}
              </View>
            </View>
          </SummaryCard>

          {/* Consent checkboxes */}
          <View style={styles.consentSection}>
            <Text style={styles.consentTitle} accessibilityRole="header">
              {t('rider.onboarding.review.consentTitle')}
            </Text>

            <ConsentCheckbox
              checked={consent.riderAgreement}
              onPress={() => toggleConsent('riderAgreement')}
              label={t('rider.onboarding.review.consentRiderAgreement')}
            />
            <ConsentCheckbox
              checked={consent.dataProcessing}
              onPress={() => toggleConsent('dataProcessing')}
              label={t('rider.onboarding.review.consentDataProcessing')}
            />

            {consentError ? (
              <Text style={styles.consentError} accessibilityRole="alert">
                {t('rider.onboarding.review.consentRequired')}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with Submit */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <Animated.View style={[styles.submitBtnWrap, submitBtnStyle]}>
          <TouchableOpacity
            onPressIn={onPressInSubmit}
            onPressOut={onPressOutSubmit}
            onPress={handleSubmit}
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.review.submitAria')}
          >
            <ClipboardCheck size={20} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.submitBtnText}>
              {submitting
                ? t('rider.onboarding.review.submitting')
                : t('rider.onboarding.review.submit')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Dirty guard dialog */}
      <Modal visible={dirtyOpen} transparent animationType="fade" onRequestClose={() => setDirtyOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyOpen(false)}>
          <Pressable style={styles.dirtySheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.dirtyTitle}>
              {t('rider.onboarding.review.dirtyTitle')}
            </Text>
            <Text style={styles.dirtyBody}>
              {t('rider.onboarding.review.dirtyBody')}
            </Text>
            <View style={styles.dirtyActions}>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current = null
                }}
                style={styles.dirtyStayBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.review.dirtyStay')}
              >
                <Text style={styles.dirtyStayText}>{t('rider.onboarding.review.dirtyStay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current?.()
                  pendingExit.current = null
                }}
                style={styles.dirtyLeaveBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.review.dirtyLeave')}
              >
                <Text style={styles.dirtyLeaveText}>{t('rider.onboarding.review.dirtyLeave')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ----- Sub-components ----------------------------------------------------

function SummaryCard({
  icon: Icon,
  title,
  editLabel,
  editAria,
  onEdit,
  children,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  title: string
  editLabel: string
  editAria: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCardHeader}>
        <View style={styles.summaryCardLeft}>
          <View style={styles.summaryIconWrap}>
            <Icon size={18} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.summaryCardTitle} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onEdit}
          style={styles.editBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={editAria}
        >
          <Text style={styles.editText}>{editLabel}</Text>
          <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      <View style={styles.summaryCardBody}>
        {children}
      </View>
    </View>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function ConsentCheckbox({
  checked,
  onPress,
  label,
}: {
  checked: boolean
  onPress: () => void
  label: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.consentRow}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.consentLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  backBtnPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  // Summary cards
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  editText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  summaryCardBody: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2.5],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  summaryRowLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '500',
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    flexShrink: 0,
  },
  summaryRowValue: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'right',
    flex: 1,
  },
  // Docs summary
  docsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docsStatusWrap: {
    flexDirection: 'row',
    gap: spacing[1.5],
  },
  docDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docDotUploaded: {
    backgroundColor: colors.success,
  },
  docDotNot: {
    backgroundColor: colors.border,
  },
  // Consent
  consentSection: {
    gap: spacing[3],
    paddingTop: spacing[2],
  },
  consentTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  consentError: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.error,
  },
  // Submitted state
  submittedBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  submittedIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  submittedTitle: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  submittedBodyText: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fontFamily.sans[0],
  },
  // Footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  submitBtnWrap: {
    width: '100%',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  nextBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dirtySheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[5],
    gap: spacing[2],
  },
  dirtyTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  dirtyBody: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    lineHeight: 20,
    fontFamily: fontFamily.sans[0],
    marginBottom: spacing[2],
  },
  dirtyActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dirtyStayBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyStayText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  dirtyLeaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirtyLeaveText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
