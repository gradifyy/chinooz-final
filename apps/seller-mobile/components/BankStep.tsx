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
import { Check, Lock, Info, ChevronDown, Building2, Wallet } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { payoutSchema } from '@chinooz/validation'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import WizardStepper from './WizardStepper'
import LanguageToggle from './LanguageToggle'

interface Props {
  onContinue: () => void
  onBack: () => void
}

const NEPAL_BANKS = [
  'Nepal Bank Limited',
  'Rastriya Banijya Bank',
  'Nabil Bank',
  'Nepal Investment Bank',
  'Standard Chartered Bank Nepal',
  'Himalayan Bank Limited',
  'Nepal SBI Bank',
  'Everest Bank Limited',
  'Bank of Kathmandu',
  'Global IME Bank',
  'Prime Commercial Bank',
  'Laxmi Sunrise Bank',
  'Mega Bank Nepal',
  'Citizens Bank International',
  'Nepal Bangladesh Bank',
]

export default function BankStep({ onContinue, onBack }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const updateDraft = useSellerSessionStore(s => s.updateDraft)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  const shakeX = useSharedValue(0)

  const updateField = useCallback((field: string, value: any) => {
    updateDraft({ [field]: value } as any)
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [updateDraft])

  const accountsMatch = draft.accountNumber.length > 0 && draft.accountNumber === draft.accountConfirm

  const handleSave = useCallback(() => {
    const result = payoutSchema.safeParse({
      payoutMethod: draft.payoutMethod,
      bankName: draft.bankName,
      accountName: draft.accountName,
      accountNumber: draft.accountNumber,
      accountConfirm: draft.accountConfirm,
      branch: draft.branch,
      walletNumber: draft.walletNumber,
      isDefault: draft.payoutIsDefault,
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

    setSaving(true)
    setTimeout(() => {
      updateDraft({ setupStep: 3 })
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
      setSaving(false)
      onContinue()
    }, 600)
  }, [draft, updateDraft, onContinue, reduced])

  const steps = [
    { key: 'store', labelKey: 'seller.setup.stepStore', label: t('seller.setup.stepStore') },
    { key: 'business', labelKey: 'seller.setup.stepBusiness', label: t('seller.setup.stepBusiness') },
    { key: 'bank', labelKey: 'seller.setup.stepBank', label: t('seller.setup.stepBank') },
    { key: 'review', labelKey: 'seller.setup.stepReview', label: t('seller.setup.stepReview') },
  ]

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const isBank = draft.payoutMethod === 'bank'
  const ConditionalEnter = reduced ? FadeIn : SlideInDown
  const ConditionalExit = reduced ? FadeOut : SlideOutUp

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <Animated.View style={containerStyle}>
        <View style={styles.stepperWrap}>
          <WizardStepper steps={steps} current={2} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('seller.setup.bankTitle')}
            </Text>
            <Text style={styles.subtitle}>{t('seller.setup.bankSubtitle')}</Text>
          </View>

          <View style={styles.fields}>
            <View style={styles.methodCards}>
              <MethodCard
                active={draft.payoutMethod === 'bank'}
                onPress={() => updateField('payoutMethod', 'bank')}
                icon="bank"
                label={t('seller.setup.methodBank')}
                desc={t('seller.setup.methodBankDesc')}
                isDefault={draft.payoutIsDefault}
                defaultLabel={t('seller.setup.defaultBadge')}
                ariaLabel={t('seller.setup.methodAria', { name: t('seller.setup.methodBank') })}
              />
              <MethodCard
                active={draft.payoutMethod === 'esewa'}
                onPress={() => updateField('payoutMethod', 'esewa')}
                icon="wallet"
                label={t('seller.setup.methodEsewa')}
                desc={t('seller.setup.methodEsewaDesc')}
                isDefault={draft.payoutIsDefault}
                defaultLabel={t('seller.setup.defaultBadge')}
                ariaLabel={t('seller.setup.methodAria', { name: t('seller.setup.methodEsewa') })}
              />
              <MethodCard
                active={draft.payoutMethod === 'khalti'}
                onPress={() => updateField('payoutMethod', 'khalti')}
                icon="wallet"
                label={t('seller.setup.methodKhalti')}
                desc={t('seller.setup.methodKhaltiDesc')}
                isDefault={draft.payoutIsDefault}
                defaultLabel={t('seller.setup.defaultBadge')}
                ariaLabel={t('seller.setup.methodAria', { name: t('seller.setup.methodKhalti') })}
              />
            </View>

            {isBank ? (
              <Animated.View
                entering={ConditionalEnter.springify().damping(20).stiffness(300)}
                exiting={ConditionalExit.springify().damping(20).stiffness(300)}
                style={styles.conditionalBlock}
              >
                <View style={styles.secureRow}>
                  <Lock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.secureText}>Bank transfer · encrypted</Text>
                </View>

                <Field label={t('seller.setup.bankNameLabel')} error={errors.bankName} helper={t('seller.setup.bankNameHelper')}>
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => setBankOpen(!bankOpen)}
                    accessibilityLabel={t('seller.setup.bankNameLabel')}
                  >
                    <Text style={[styles.selectText, !draft.bankName && styles.selectPlaceholder]}>
                      {draft.bankName || t('seller.setup.bankNamePlaceholder')}
                    </Text>
                    <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                  {bankOpen && (
                    <View style={styles.selectDropdown}>
                      {NEPAL_BANKS.map(bank => (
                        <TouchableOpacity
                          key={bank}
                          style={styles.selectOption}
                          onPress={() => {
                            updateField('bankName', bank)
                            setBankOpen(false)
                          }}
                        >
                          <Text style={styles.selectOptionText}>{bank}</Text>
                          {bank === draft.bankName && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Field>

                <Field label={t('seller.setup.accountNameLabel')} error={errors.accountName} helper={t('seller.setup.accountNameHelper')}>
                  <TextInput style={styles.input} value={draft.accountName} onChangeText={v => updateField('accountName', v)} placeholder={t('seller.setup.accountNamePlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('seller.setup.accountNameLabel')} />
                </Field>

                <Field label={t('seller.setup.accountNumberLabel')} error={errors.accountNumber} helper={t('seller.setup.accountNumberHelper')}>
                  <TextInput style={styles.input} value={draft.accountNumber} onChangeText={v => updateField('accountNumber', v)} placeholder={t('seller.setup.accountNumberPlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="number-pad" accessibilityLabel={t('seller.setup.accountNumberLabel')} />
                </Field>

                <Field label={t('seller.setup.accountConfirmLabel')} error={errors.accountConfirm} helper={t('seller.setup.accountConfirmHelper')}>
                  <View style={styles.confirmRow}>
                    <TextInput style={[styles.input, styles.confirmInput]} value={draft.accountConfirm} onChangeText={v => updateField('accountConfirm', v)} placeholder={t('seller.setup.accountConfirmPlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="number-pad" accessibilityLabel={t('seller.setup.accountConfirmLabel')} />
                    {accountsMatch && <Check size={20} color={colors.success} strokeWidth={2.5} />}
                  </View>
                  {accountsMatch && (
                    <Text style={styles.matchText} accessibilityRole="alert">{t('seller.setup.accountMatch')}</Text>
                  )}
                </Field>

                <Field label={t('seller.setup.branchLabel')} error={errors.branch} helper={t('seller.setup.branchHelper')}>
                  <TextInput style={styles.input} value={draft.branch} onChangeText={v => updateField('branch', v)} placeholder={t('seller.setup.branchPlaceholder')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('seller.setup.branchLabel')} />
                </Field>
              </Animated.View>
            ) : (
              <Animated.View
                entering={ConditionalEnter.springify().damping(20).stiffness(300)}
                exiting={ConditionalExit.springify().damping(20).stiffness(300)}
                style={styles.conditionalBlock}
              >
                <View style={styles.secureRow}>
                  <Lock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.secureText}>{draft.payoutMethod === 'esewa' ? 'eSewa · encrypted' : 'Khalti · encrypted'}</Text>
                </View>
                <Field label={t('seller.setup.walletNumberLabel')} error={errors.walletNumber} helper={t('seller.setup.walletNumberHelper')}>
                  <TextInput style={styles.input} value={draft.walletNumber} onChangeText={v => updateField('walletNumber', v.replace(/\D/g, '').slice(0, 10))} placeholder={t('seller.setup.walletNumberPlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" accessibilityLabel={t('seller.setup.walletNumberLabel')} />
                </Field>
              </Animated.View>
            )}

            <View style={styles.callout}>
              <Info size={18} color={colors.primary} strokeWidth={2} />
              <View style={styles.calloutTextWrap}>
                <Text style={styles.calloutTitle}>{t('seller.setup.payoutInfoTitle')}</Text>
                <Text style={styles.calloutBody}>{t('seller.setup.payoutInfoBody')}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => updateField('payoutIsDefault', !draft.payoutIsDefault)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.payoutIsDefault }}
              style={styles.defaultRow}
            >
              <View style={[styles.checkbox, draft.payoutIsDefault && styles.checkboxChecked]}>
                {draft.payoutIsDefault && <Check size={14} color={colors.white} strokeWidth={3} />}
              </View>
              <Text style={styles.defaultLabel}>{t('seller.setup.setDefault')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>

      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.primaryCta, saving && styles.primaryCtaDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('seller.setup.save')}
        >
          <Text style={styles.primaryCtaText}>
            {saving ? t('seller.setup.saving') : t('seller.setup.save')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onBack}
          style={styles.secondaryCta}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('seller.setup.back')}
        >
          <Text style={styles.secondaryCtaText}>{t('seller.setup.back')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function MethodCard({ active, onPress, icon, label, desc, isDefault, defaultLabel, ariaLabel }: {
  active: boolean; onPress: () => void; icon: string; label: string; desc: string; isDefault: boolean; defaultLabel: string; ariaLabel: string
}) {
  const Icon = icon === 'bank' ? Building2 : Wallet
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={ariaLabel}
      style={[styles.methodCard, active && styles.methodCardActive]}
    >
      <View style={[styles.methodIconWrap, active && styles.methodIconWrapActive]}>
        <Icon size={22} color={active ? colors.primary : colors.textMuted} strokeWidth={2} />
      </View>
      <View style={styles.methodText}>
        <View style={styles.methodLabelRow}>
          <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{label}</Text>
          {active && isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{defaultLabel}</Text>
            </View>
          )}
        </View>
        <Text style={styles.methodDesc}>{desc}</Text>
      </View>
      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
        {active && <View style={styles.radioInner} />}
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  stepperWrap: { paddingBottom: spacing[2] },
  scroll: { flex: 1 },
  header: { paddingHorizontal: spacing[6], paddingTop: spacing[4], paddingBottom: spacing[3] },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing[1], fontFamily: fontFamily.sansBold[0] },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  fields: { paddingHorizontal: spacing[6], gap: spacing[4] },
  methodCards: { gap: spacing[3] },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: spacing[3.5], paddingVertical: spacing[3.5],
  },
  methodCardActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  methodIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  methodIconWrapActive: { backgroundColor: colors.surface },
  methodText: { flex: 1, gap: 2 },
  methodLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  methodLabel: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  methodLabelActive: { color: colors.primary },
  methodDesc: { fontSize: 12, color: colors.textMuted },
  defaultBadge: { backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '600', color: colors.white },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  conditionalBlock: { gap: spacing[4] },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] },
  secureText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  field: { gap: spacing[1.5] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  input: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  fieldError: { fontSize: 12, color: colors.error },
  helper: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  confirmInput: { flex: 1 },
  matchText: { fontSize: 12, color: colors.success, fontWeight: '600', marginTop: spacing[1] },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], backgroundColor: colors.surface },
  selectText: { fontSize: 15, color: colors.text },
  selectPlaceholder: { color: colors.textTertiary },
  selectDropdown: { marginTop: spacing[1], backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  selectOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  selectOptionText: { fontSize: 14, color: colors.text },
  callout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2.5], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing[3.5], paddingVertical: spacing[3] },
  calloutTextWrap: { flex: 1, gap: 2 },
  calloutTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  calloutBody: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingVertical: spacing[1] },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  defaultLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  ctaDock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing[6], paddingTop: spacing[3], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: spacing[2] },
  primaryCta: { height: 52, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryCtaDisabled: { opacity: 0.7 },
  primaryCtaText: { fontSize: 16, fontWeight: '600', color: colors.white, fontFamily: fontFamily.sansSemiBold[0] },
  secondaryCta: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryCtaText: { fontSize: 15, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
})
