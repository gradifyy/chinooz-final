import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Upload, Check, X, FileText, ShieldCheck } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { businessKycSchema } from '@chinooz/validation'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import WizardStepper from './WizardStepper'
import LanguageToggle from './LanguageToggle'

interface Props {
  onContinue: () => void
  onBack: () => void
}

type DocState = 'empty' | 'uploading' | 'uploaded' | 'failed'

export default function BusinessStep({ onContinue, onBack }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const updateDraft = useSellerSessionStore(s => s.updateDraft)
  const setKycStatus = useSellerSessionStore(s => s.setKycStatus)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [docStates, setDocStates] = useState<Record<string, DocState>>({
    docId: draft.docId ? 'uploaded' : 'empty',
    docReg: draft.docReg ? 'uploaded' : 'empty',
    docPan: draft.docPan ? 'uploaded' : 'empty',
  })

  const shakeX = useSharedValue(0)

  const updateField = useCallback((field: string, value: string) => {
    updateDraft({ [field]: value } as any)
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [updateDraft])

  const handleMockUpload = useCallback((docKey: string) => {
    setDocStates(prev => ({ ...prev, [docKey]: 'uploading' }))
    setTimeout(() => {
      const filename = `${docKey}-${Date.now()}.pdf`
      updateDraft({ [docKey]: filename } as any)
      setDocStates(prev => ({ ...prev, [docKey]: 'uploaded' }))
      setErrors(prev => ({ ...prev, [docKey]: '' }))
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    }, 1200)
  }, [updateDraft])

  const handleRemoveDoc = useCallback((docKey: string) => {
    updateDraft({ [docKey]: '' } as any)
    setDocStates(prev => ({ ...prev, [docKey]: 'empty' }))
  }, [updateDraft])

  const handleSubmit = useCallback(() => {
    const result = businessKycSchema.safeParse({
      businessType: draft.businessType,
      legalName: draft.legalName,
      panNumber: draft.panNumber,
      regNumber: draft.regNumber,
      docId: draft.docId,
      docReg: draft.docReg,
      docPan: draft.docPan,
    })

    if (!result.success) {
      const newErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!newErrors[field]) newErrors[field] = issue.message
      }
      setErrors(newErrors)
      if (!reduced) {
        shakeX.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        )
      }
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch {}
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setKycStatus('pending')
      updateDraft({ setupStep: 2 })
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
      setSubmitting(false)
      onContinue()
    }, 800)
  }, [draft, setKycStatus, updateDraft, onContinue, reduced])

  const steps = [
    { key: 'store', labelKey: 'seller.setup.stepStore', label: t('seller.setup.stepStore') },
    { key: 'business', labelKey: 'seller.setup.stepBusiness', label: t('seller.setup.stepBusiness') },
    { key: 'bank', labelKey: 'seller.setup.stepBank', label: t('seller.setup.stepBank') },
    { key: 'review', labelKey: 'seller.setup.stepReview', label: t('seller.setup.stepReview') },
  ]

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const isRegistered = draft.businessType === 'registered'
  const ConditionalEnter = reduced ? FadeIn : SlideInDown
  const ConditionalExit = reduced ? FadeOut : SlideOutUp

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <Animated.View style={containerStyle}>
        <View style={styles.stepperWrap}>
          <WizardStepper steps={steps} current={1} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('seller.setup.businessTitle')}
            </Text>
            <Text style={styles.subtitle}>{t('seller.setup.businessSubtitle')}</Text>
          </View>

          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('seller.setup.businessTypeLabel')}</Text>
              <View style={styles.bizTypeRow}>
                <Pressable
                  onPress={() => updateField('businessType', 'individual')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isRegistered }}
                  style={[styles.bizTypeBtn, !isRegistered && styles.bizTypeBtnActive]}
                >
                  <Text style={[styles.bizTypeLabel, !isRegistered && styles.bizTypeLabelActive]}>{t('seller.setup.businessTypeIndividual')}</Text>
                  <Text style={[styles.bizTypeDesc, !isRegistered && styles.bizTypeDescActive]}>{t('seller.setup.businessTypeIndividualDesc')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateField('businessType', 'registered')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isRegistered }}
                  style={[styles.bizTypeBtn, isRegistered && styles.bizTypeBtnActive]}
                >
                  <Text style={[styles.bizTypeLabel, isRegistered && styles.bizTypeLabelActive]}>{t('seller.setup.businessTypeRegistered')}</Text>
                  <Text style={[styles.bizTypeDesc, isRegistered && styles.bizTypeDescActive]}>{t('seller.setup.businessTypeRegisteredDesc')}</Text>
                </Pressable>
              </View>
            </View>

            <Field label={t('seller.setup.legalNameLabel')} error={errors.legalName} helper={t('seller.setup.legalNameHelper')}>
              <TextInput style={styles.input} value={draft.legalName} onChangeText={v => updateField('legalName', v)} placeholder={t('seller.setup.legalNamePlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('seller.setup.legalNameLabel')} />
            </Field>

            <Field label={t('seller.setup.panLabel')} error={errors.panNumber} helper={t('seller.setup.panHelper')}>
              <TextInput style={styles.input} value={draft.panNumber} onChangeText={v => updateField('panNumber', v.replace(/\D/g, '').slice(0, 9))} placeholder={t('seller.setup.panPlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="number-pad" accessibilityLabel={t('seller.setup.panLabel')} />
            </Field>

            {isRegistered && (
              <Animated.View entering={ConditionalEnter.springify().damping(20).stiffness(300)} exiting={ConditionalExit.springify().damping(20).stiffness(300)} style={styles.conditionalBlock}>
                <Field label={t('seller.setup.regNumberLabel')} error={errors.regNumber} helper={t('seller.setup.regNumberHelper')}>
                  <TextInput style={styles.input} value={draft.regNumber} onChangeText={v => updateField('regNumber', v)} placeholder={t('seller.setup.regNumberPlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('seller.setup.regNumberLabel')} />
                </Field>
              </Animated.View>
            )}

            <View style={styles.callout}>
              <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.calloutText}>{t('seller.setup.dataCallout')}</Text>
            </View>

            <Text style={styles.sectionLabel}>{t('seller.setup.docIdLabel')}</Text>
            <DocUploadCard docKey="docId" draft={draft} docStates={docStates} errors={errors} onUpload={handleMockUpload} onRemove={handleRemoveDoc} t={t} reduced={reduced} />
            {isRegistered && (
              <Animated.View entering={ConditionalEnter.springify().damping(20).stiffness(300)} exiting={ConditionalExit.springify().damping(20).stiffness(300)}>
                <DocUploadCard docKey="docReg" draft={draft} docStates={docStates} errors={errors} onUpload={handleMockUpload} onRemove={handleRemoveDoc} t={t} reduced={reduced} />
              </Animated.View>
            )}
            <DocUploadCard docKey="docPan" draft={draft} docStates={docStates} errors={errors} onUpload={handleMockUpload} onRemove={handleRemoveDoc} t={t} reduced={reduced} />
          </View>
        </ScrollView>
      </Animated.View>

      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[styles.primaryCta, submitting && styles.primaryCtaDisabled]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('seller.setup.submitReview')}>
          <Text style={styles.primaryCtaText}>{submitting ? t('seller.setup.submitting') : t('seller.setup.submitReview')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.secondaryCta} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('seller.setup.back')}>
          <Text style={styles.secondaryCtaText}>{t('seller.setup.back')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function Field({ label, error, helper, children }: { label: string; error?: string; helper?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  )
}

function DocUploadCard({ docKey, draft, docStates, errors, onUpload, onRemove, t, reduced }: {
  docKey: string
  draft: any
  docStates: Record<string, DocState>
  errors: Record<string, string>
  onUpload: (k: string) => void
  onRemove: (k: string) => void
  t: any
  reduced: boolean
}) {
  const state = docStates[docKey] || 'empty'
  const filename = (draft as any)[docKey] || ''
  const labelMap: Record<string, { label: string; hint: string; helper: string }> = {
    docId: { label: t('seller.setup.docIdLabel'), hint: t('seller.setup.docIdHint'), helper: t('seller.setup.docIdHelper') },
    docReg: { label: t('seller.setup.docRegLabel'), hint: t('seller.setup.docRegHint'), helper: t('seller.setup.docRegHelper') },
    docPan: { label: t('seller.setup.docPanLabel'), hint: t('seller.setup.docPanHint'), helper: t('seller.setup.docPanHelper') },
  }
  const meta = labelMap[docKey]
  const error = errors[docKey]

  if (state === 'uploaded' && filename) {
    return (
      <View style={styles.docCardUploaded}>
        <View style={styles.docUploadedInfo}>
          <View style={styles.docIconWrap}><FileText size={18} color={colors.primary} strokeWidth={2} /></View>
          <View style={styles.docUploadedText}>
            <Text style={styles.docFilename} numberOfLines={1}>{filename}</Text>
            <View style={styles.docUploadedBadge}><Check size={12} color={colors.success} strokeWidth={3} /><Text style={styles.docUploadedLabel}>{t('seller.setup.uploaded')}</Text></View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onRemove(docKey)} accessibilityRole="button" accessibilityLabel={t('seller.setup.uploadRemove')} style={styles.docRemoveBtn}>
          <X size={18} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.docCardWrap}>
      <TouchableOpacity
        onPress={() => onUpload(docKey)}
        style={[styles.docCard, state === 'uploading' && styles.docCardUploading, error && styles.docCardError]}
        accessibilityRole="button"
        accessibilityLabel={t('seller.setup.uploadAria', { doc: meta.label })}
        activeOpacity={0.8}
      >
        {state === 'uploading' ? (
          <View style={styles.docUploadingWrap}>
            <View style={styles.spinner} />
            <Text style={styles.docUploadingText}>{t('seller.setup.uploading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.docUploadIcon}><Upload size={20} color={colors.textMuted} strokeWidth={2} /></View>
            <Text style={styles.docUploadLabel}>{t('seller.setup.uploadLabel', { doc: meta.label })}</Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={styles.docHint}>{meta.hint}</Text>
      {error ? <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text> : null}
      <Text style={styles.helper}>{meta.helper}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  stepperWrap: { paddingBottom: spacing[2] },
  scroll: { flex: 1 },
  header: { paddingHorizontal: spacing[6], paddingTop: spacing[4], paddingBottom: spacing[3] },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing[1], fontFamily: fontFamily.sansBold[0] },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  fields: { paddingHorizontal: spacing[6], gap: spacing[4] },
  field: { gap: spacing[1.5] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  input: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  fieldError: { fontSize: 12, color: colors.error },
  helper: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  bizTypeRow: { flexDirection: 'row', gap: spacing[3] },
  bizTypeBtn: { flex: 1, paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', gap: 2 },
  bizTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  bizTypeLabel: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  bizTypeLabelActive: { color: colors.white },
  bizTypeDesc: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  bizTypeDescActive: { color: colors.primary50 },
  conditionalBlock: { gap: spacing[4] },
  callout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2.5], backgroundColor: colors.primary50, borderRadius: radii.lg, paddingHorizontal: spacing[3.5], paddingVertical: spacing[3] },
  calloutText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 19, fontWeight: '500' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0], marginTop: spacing[1] },
  docCardWrap: { gap: spacing[1.5] },
  docCard: { borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surface, paddingVertical: spacing[4], paddingHorizontal: spacing[4], alignItems: 'center', justifyContent: 'center' },
  docCardUploading: { borderColor: colors.primary, borderStyle: 'solid' },
  docCardError: { borderColor: colors.error },
  docUploadIcon: { alignItems: 'center', justifyContent: 'center' },
  docUploadLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  docUploadingWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  docUploadingText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  spinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary50, borderTopColor: colors.primary },
  docHint: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  docCardUploaded: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primary50, paddingHorizontal: spacing[3.5], paddingVertical: spacing[3] },
  docUploadedInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], flex: 1 },
  docIconWrap: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  docUploadedText: { flex: 1, gap: 2 },
  docFilename: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  docUploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docUploadedLabel: { fontSize: 12, color: colors.success, fontWeight: '600' },
  docRemoveBtn: { padding: spacing[1] },
  ctaDock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing[6], paddingTop: spacing[3], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: spacing[2] },
  primaryCta: { height: 52, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryCtaDisabled: { opacity: 0.7 },
  primaryCtaText: { fontSize: 16, fontWeight: '600', color: colors.white, fontFamily: fontFamily.sansSemiBold[0] },
  secondaryCta: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryCtaText: { fontSize: 15, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
})
