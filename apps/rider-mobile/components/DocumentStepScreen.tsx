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
  Image,
  Alert,
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
  Camera,
  ImagePlus,
  RefreshCw,
  Check,
  ShieldCheck,
  IdCard,
  CreditCard,
  FileText,
  Info,
  CircleCheck,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import {
  useOnboardingStore,
  type DocumentDraft,
  type DocumentKey,
  type DocumentItemDraft,
  type OnboardingStep,
} from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { compressImage } from '@chinooz/utils'
import { analytics } from '@chinooz/analytics'
import ProgressStepper from './ProgressStepper'
import { UploadError, EmptyDocsState } from './OnboardingStates'

type DocStatus = 'notUploaded' | 'uploaded' | 'pending'

interface DocConfig {
  key: DocumentKey
  labelKey: string
  guidanceKey: string
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  /** Whether this document is required for motorized vehicles only. */
  motorizedOnly: boolean
  /** Whether this document is always required. */
  alwaysRequired: boolean
}

const DOC_CONFIGS: DocConfig[] = [
  {
    key: 'idFront',
    labelKey: 'rider.onboarding.documents.idFrontLabel',
    guidanceKey: 'rider.onboarding.documents.idFrontGuidance',
    icon: IdCard,
    motorizedOnly: false,
    alwaysRequired: true,
  },
  {
    key: 'idBack',
    labelKey: 'rider.onboarding.documents.idBackLabel',
    guidanceKey: 'rider.onboarding.documents.idBackGuidance',
    icon: IdCard,
    motorizedOnly: false,
    alwaysRequired: true,
  },
  {
    key: 'license',
    labelKey: 'rider.onboarding.documents.licenseLabel',
    guidanceKey: 'rider.onboarding.documents.licenseGuidance',
    icon: CreditCard,
    motorizedOnly: true,
    alwaysRequired: false,
  },
  {
    key: 'registration',
    labelKey: 'rider.onboarding.documents.registrationLabel',
    guidanceKey: 'rider.onboarding.documents.registrationGuidance',
    icon: FileText,
    motorizedOnly: true,
    alwaysRequired: false,
  },
  {
    key: 'selfie',
    labelKey: 'rider.onboarding.documents.selfieLabel',
    guidanceKey: 'rider.onboarding.documents.selfieGuidance',
    icon: Camera,
    motorizedOnly: false,
    alwaysRequired: true,
  },
]

const STEP_LABEL_KEYS: Record<OnboardingStep, string> = {
  personal: 'rider.onboarding.stepPersonal',
  vehicle: 'rider.onboarding.stepVehicle',
  documents: 'rider.onboarding.stepDocuments',
  review: 'rider.onboarding.stepReview',
}

export default function DocumentStepScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useOnboardingStore(s => s.draft.documents)
  const vehicleType = useOnboardingStore(s => s.draft.vehicle.type)
  const setDocuments = useOnboardingStore(s => s.setDocuments)
  const setCurrentStep = useOnboardingStore(s => s.setCurrentStep)

  const [form, setForm] = useState<DocumentDraft>(draft)
  const [initial, setInitial] = useState<DocumentDraft>(draft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<Record<string, boolean>>({})
  const [dirtyOpen, setDirtyOpen] = useState(false)
  const pendingExit = useRef<(() => void) | null>(null)

  useEffect(() => {
    setCurrentStep('documents')
    analytics.screen({ name: 'rider-onboarding-documents' })
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

  const isMotorized = vehicleType === 'motorbike' || vehicleType === 'scooter'

  /** Whether any documents have been uploaded yet (for empty state). */
  const hasAnyUploads = useMemo(
    () => (Object.keys(form) as DocumentKey[]).some(k => form[k].uploaded),
    [form],
  )

  /** Documents visible for the current vehicle type. */
  const visibleDocs = useMemo(
    () => DOC_CONFIGS.filter(d => !d.motorizedOnly || isMotorized),
    [isMotorized],
  )

  const isDirty = useMemo(() => {
    return (Object.keys(form) as DocumentKey[]).some(
      k =>
        form[k].uploaded !== initial[k].uploaded ||
        form[k].uri !== initial[k].uri,
    )
  }, [form, initial])

  const setDocField = useCallback(
    (key: DocumentKey, data: Partial<DocumentItemDraft>) => {
      setForm(prev => ({
        ...prev,
        [key]: { ...prev[key], ...data },
      }))
      setErrors(prev => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
      setSaved(false)
    },
    [],
  )

  const clearUploadError = useCallback((key: DocumentKey) => {
    setUploadErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const simulateUpload = useCallback(
    async (key: DocumentKey, uri: string) => {
      // Compress the image before upload (battery/data conscious).
      const compressedUri = await compressImage(uri, { maxWidth: 1024, quality: 0.8 })

      // Simulate ~15% upload failure for error-state demonstration.
      if (__DEV__ && Math.random() < 0.15) {
        setUploadErrors(prev => ({ ...prev, [key]: true }))
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          AccessibilityInfo.announceForAccessibility(
            t('rider.onboarding.states.errorUploadTitle'),
          )
        } catch {}
        return
      }
      clearUploadError(key)
      setDocField(key, { uploaded: true, uri: compressedUri })
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.onboarding.documents.statusUploaded'),
        )
      } catch {}
    },
    [clearUploadError, setDocField, t],
  )

  const handleCapture = useCallback(
    (key: DocumentKey) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      Alert.alert(
        t('rider.onboarding.documents.capture'),
        t(DOC_CONFIGS.find(d => d.key === key)!.guidanceKey),
        [
          {
            text: t('rider.onboarding.documents.capture'),
            onPress: () => simulateUpload(key, 'mock://camera'),
          },
          {
            text: t('rider.onboarding.documents.upload'),
            onPress: () => simulateUpload(key, 'mock://gallery'),
          },
          { text: t('common.cancel'), style: 'cancel' as const },
        ],
      )
    },
    [t, simulateUpload],
  )

  const handleReplace = useCallback(
    (key: DocumentKey) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      Alert.alert(
        t('rider.onboarding.documents.replace'),
        t(DOC_CONFIGS.find(d => d.key === key)!.guidanceKey),
        [
          {
            text: t('rider.onboarding.documents.capture'),
            onPress: () => simulateUpload(key, 'mock://camera-replace'),
          },
          {
            text: t('rider.onboarding.documents.upload'),
            onPress: () => simulateUpload(key, 'mock://gallery-replace'),
          },
          { text: t('common.cancel'), style: 'cancel' as const },
        ],
      )
    },
    [t, simulateUpload],
  )

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    const validationMap: Record<DocumentKey, string> = {
      idFront: t('rider.onboarding.documents.validationIdFront'),
      idBack: t('rider.onboarding.documents.validationIdBack'),
      license: t('rider.onboarding.documents.validationLicense'),
      registration: t('rider.onboarding.documents.validationRegistration'),
      selfie: t('rider.onboarding.documents.validationSelfie'),
    }
    for (const doc of visibleDocs) {
      if (doc.alwaysRequired || (doc.motorizedOnly && isMotorized)) {
        if (!form[doc.key].uploaded) {
          e[doc.key] = validationMap[doc.key]
        }
      }
    }
    setErrors(e)
    if (Object.keys(e).length > 0) {
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.onboarding.documents.validationMissing'),
        )
      } catch {}
      return false
    }
    return true
  }, [form, visibleDocs, isMotorized, t])

  // ----- Dirty guard -----------------------------------------------------
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

  // ----- Next → Review ---------------------------------------------------
  const handleNext = useCallback(async () => {
    if (!validate()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      return
    }
    setSaving(true)
    setDocuments(form)
    try {
      await new Promise(r => setTimeout(r, 350))
      setInitial(form)
      setSaved(true)
      setCurrentStep('review')
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      analytics.track({ name: 'rider_onboarding_documents_next' })
      setTimeout(() => router.push('/onboarding/review'), 400)
    } finally {
      setSaving(false)
    }
  }, [validate, form, setDocuments, setCurrentStep, router])

  const nextBtnScale = useSharedValue(1)
  const onPressInNext = useCallback(() => {
    if (reduced) return
    nextBtnScale.value = withSpring(0.97, { damping: 18, stiffness: 400 })
  }, [reduced])
  const onPressOutNext = useCallback(() => {
    if (reduced) return
    nextBtnScale.value = withSpring(1, { damping: 18, stiffness: 400 })
  }, [reduced])
  const nextBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextBtnScale.value }],
  }))

  const getDocStatus = (key: DocumentKey): DocStatus => {
    if (!form[key].uploaded) return 'notUploaded'
    return 'uploaded'
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
            accessibilityLabel={t('rider.onboarding.documents.backAria')}
          >
            <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('rider.onboarding.documents.title')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <ProgressStepper currentStep="documents" labels={stepLabels} />
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
            {t('rider.onboarding.documents.subtitle')}
          </Text>

          {/* Trust / privacy reassurance */}
          <View style={styles.trustCard} accessibilityRole="summary">
            <View style={styles.trustHeader}>
              <ShieldCheck size={20} color={colors.primary} strokeWidth={2} />
              <Text style={styles.trustTitle}>
                {t('rider.onboarding.documents.trustTitle')}
              </Text>
            </View>
            <Text style={styles.trustBody}>
              {t('rider.onboarding.documents.trustBody')}
            </Text>
          </View>

          {/* Photo guidance tips */}
          <View style={styles.guidanceCard} accessibilityRole="summary">
            <Text style={styles.guidanceTitle}>
              {t('rider.onboarding.documents.guidanceTitle')}
            </Text>
            <View style={styles.guidanceList}>
              <Text style={styles.guidanceItem}>
                {'\u2022'} {t('rider.onboarding.documents.guidanceGoodLight')}
              </Text>
              <Text style={styles.guidanceItem}>
                {'\u2022'} {t('rider.onboarding.documents.guidanceFlatSurface')}
              </Text>
              <Text style={styles.guidanceItem}>
                {'\u2022'} {t('rider.onboarding.documents.guidanceFillFrame')}
              </Text>
              <Text style={styles.guidanceItem}>
                {'\u2022'} {t('rider.onboarding.documents.guidanceNoGlare')}
              </Text>
              <Text style={styles.guidanceItem}>
                {'\u2022'} {t('rider.onboarding.documents.guidanceSteady')}
              </Text>
            </View>
          </View>

          {/* Empty state — no documents uploaded yet */}
          {!hasAnyUploads ? (
            <EmptyDocsState
              title={t('rider.onboarding.states.emptyDocsTitle')}
              body={t('rider.onboarding.states.emptyDocsBody')}
              ariaLabel={t('rider.onboarding.states.emptyDocsTitle')}
              actionLabel={t('rider.onboarding.states.emptyDocsUpload')}
              actionAria={t('rider.onboarding.states.emptyDocsUploadAria')}
              onAction={() => handleCapture(visibleDocs[0]?.key ?? 'idFront')}
            />
          ) : null}

          {/* Document upload cards */}
          {visibleDocs.map(doc => {
            const Icon = doc.icon
            const status = getDocStatus(doc.key)
            const isUploaded = status === 'uploaded'
            const required = doc.alwaysRequired || (doc.motorizedOnly && isMotorized)

            return (
              <View
                key={doc.key}
                style={styles.docCard}
                accessibilityRole="summary"
                accessibilityLabel={`${t(doc.labelKey)}, ${required ? t('rider.onboarding.documents.requiredTag') : t('rider.onboarding.documents.optionalTag')}, ${t(`rider.onboarding.documents.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}`}
              >
                {/* Card header: icon + label + required tag + status chip */}
                <View style={styles.docCardHeader}>
                  <View style={styles.docCardLeft}>
                    <View style={styles.docIconWrap}>
                      <Icon size={20} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.docCardBody}>
                      <Text style={styles.docCardLabel}>
                        {t(doc.labelKey)}
                      </Text>
                      {doc.motorizedOnly ? (
                        <Text style={styles.docCardSub}>
                          {t('rider.onboarding.documents.ifMotorized')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <StatusChip status={status} label={t(`rider.onboarding.documents.status${status.charAt(0).toUpperCase() + status.slice(1)}`)} />
                </View>

                {/* Preview / upload area */}
                {isUploaded ? (
                  <View style={styles.previewRow}>
                    <View style={styles.previewThumb}>
                      <Image
                        source={{ uri: form[doc.key].uri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleReplace(doc.key)}
                      style={styles.replaceBtn}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('rider.onboarding.documents.replaceAria')}
                    >
                      <RefreshCw size={16} color={colors.primary} strokeWidth={2.5} />
                      <Text style={styles.replaceText}>
                        {t('rider.onboarding.documents.replace')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadActions}>
                    <TouchableOpacity
                      onPress={() => handleCapture(doc.key)}
                      style={styles.captureBtn}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('rider.onboarding.documents.captureAria')}
                    >
                      <Camera size={18} color={colors.primary} strokeWidth={2.5} />
                      <Text style={styles.actionText}>
                        {t('rider.onboarding.documents.capture')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleCapture(doc.key)}
                      style={styles.uploadBtn}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('rider.onboarding.documents.uploadAria')}
                    >
                      <ImagePlus size={18} color={colors.textMuted} strokeWidth={2.5} />
                      <Text style={styles.actionTextMuted}>
                        {t('rider.onboarding.documents.upload')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Upload error — inline, preserves other items */}
                {uploadErrors[doc.key] ? (
                  <UploadError
                    title={t('rider.onboarding.states.errorUploadTitle')}
                    body={t('rider.onboarding.states.errorUploadBody')}
                    ariaLabel={t('rider.onboarding.states.errorUploadTitle')}
                    retryLabel={t('rider.onboarding.states.errorUploadRetry')}
                    retryAria={t('rider.onboarding.states.errorUploadRetryAria')}
                    onRetry={() => handleCapture(doc.key)}
                  />
                ) : null}

                {/* Guidance text */}
                <Text style={styles.docGuidance}>
                  {t(doc.guidanceKey)}
                </Text>

                {/* Error */}
                {errors[doc.key] ? (
                  <Text style={styles.fieldError} accessibilityRole="alert">
                    {errors[doc.key]}
                  </Text>
                ) : null}
              </View>
            )
          })}

          {saved ? (
            <View style={styles.savedRow}>
              <Check size={16} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.savedText}>{t('rider.onboarding.documents.saved')}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with Back + Next */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <View style={styles.footerBtns}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backNavBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.documents.backAria')}
          >
            <Text style={styles.backNavText}>{t('rider.onboarding.documents.back')}</Text>
          </TouchableOpacity>
          <Animated.View style={[styles.nextBtnWrap, nextBtnStyle]}>
            <TouchableOpacity
              onPressIn={onPressInNext}
              onPressOut={onPressOutNext}
              onPress={handleNext}
              style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={t('rider.onboarding.documents.nextAria')}
            >
              <Text style={styles.nextBtnText}>
                {saving ? t('rider.onboarding.documents.saving') : t('rider.onboarding.documents.next')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Dirty guard dialog */}
      <Modal visible={dirtyOpen} transparent animationType="fade" onRequestClose={() => setDirtyOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDirtyOpen(false)}>
          <Pressable style={styles.dirtySheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.dirtyTitle}>
              {t('rider.onboarding.documents.dirtyTitle')}
            </Text>
            <Text style={styles.dirtyBody}>
              {t('rider.onboarding.documents.dirtyBody')}
            </Text>
            <View style={styles.dirtyActions}>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current = null
                }}
                style={styles.dirtyStayBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.documents.dirtyStay')}
              >
                <Text style={styles.dirtyStayText}>{t('rider.onboarding.documents.dirtyStay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDirtyOpen(false)
                  pendingExit.current?.()
                  pendingExit.current = null
                }}
                style={styles.dirtyLeaveBtn}
                accessibilityRole="button"
                accessibilityLabel={t('rider.onboarding.documents.dirtyLeave')}
              >
                <Text style={styles.dirtyLeaveText}>{t('rider.onboarding.documents.dirtyLeave')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ----- Sub-components ----------------------------------------------------

function StatusChip({ status, label }: { status: DocStatus; label: string }) {
  const config = {
    notUploaded: { bg: colors.borderLight, text: colors.textTertiary, icon: null },
    uploaded: { bg: colors.infoLight, text: colors.info, icon: CircleCheck },
    pending: { bg: colors.warningLight, text: colors.warning, icon: Info },
  } as const

  const cfg = config[status]
  const Icon = cfg.icon

  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      {Icon ? <Icon size={12} color={cfg.text} strokeWidth={2.5} /> : null}
      <Text style={[styles.statusChipText, { color: cfg.text }]}>{label}</Text>
    </View>
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
  // Trust card
  trustCard: {
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  trustTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansBold[0],
  },
  trustBody: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  // Guidance card
  guidanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  guidanceTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  guidanceList: {
    gap: spacing[1.5],
  },
  guidanceItem: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  // Document upload card
  docCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  docCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardBody: {
    flex: 1,
    gap: spacing[0.5],
  },
  docCardLabel: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  docCardSub: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  // Status chip
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.sm,
  },
  statusChipText: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Preview area
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  previewImage: {
    width: 72,
    height: 72,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  replaceText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Upload actions (not uploaded)
  uploadActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  actionText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  actionTextMuted: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Guidance
  docGuidance: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
  },
  // Error
  fieldError: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.error,
  },
  // Saved indicator
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    justifyContent: 'center',
    paddingTop: spacing[2],
  },
  savedText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  backNavBtn: {
    flex: 1,
    height: 54,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavText: {
    fontSize: fontSize.lg[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  nextBtnWrap: {
    flex: 1.5,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.7,
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
