import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Image as ImageIcon, Check, X, Loader, ChevronDown } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { storeSetupSchema } from '@chinooz/validation'
import { checkHandleAvailability, getCategories } from '@chinooz/mock-data'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import WizardStepper from './WizardStepper'
import StorefrontPreview from './StorefrontPreview'
import LanguageToggle from './LanguageToggle'

import type { Category } from '@chinooz/types'

interface Props {
  onContinue: () => void
  onBack: () => void
}

export default function StoreStep({ onContinue, onBack }: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const updateDraft = useSellerSessionStore(s => s.updateDraft)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [categories, setCategories] = useState<Pick<Category, 'id' | 'name' | 'slug'>[]>([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shakeX = useSharedValue(0)

  useEffect(() => {
    getCategories().then(cats => {
      setCategories(cats.filter(c => !c.parentId).map(c => ({ id: c.id, name: c.name, slug: c.slug })))
    })
  }, [])

  const handleSlugCheck = useCallback((slug: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (slug.length < 3) {
      setHandleStatus('idle')
      return
    }
    setHandleStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const available = await checkHandleAvailability(slug)
      setHandleStatus(available ? 'available' : 'taken')
    }, 400)
  }, [])

  const updateField = useCallback((field: string, value: string) => {
    updateDraft({ [field]: value } as any)
    setErrors(prev => ({ ...prev, [field]: '' }))
    if (field === 'handle') {
      handleSlugCheck(value)
    }
  }, [updateDraft, handleSlugCheck])

  const handleContinue = useCallback(() => {
    const result = storeSetupSchema.safeParse({
      storeName: draft.storeName,
      handle: draft.handle,
      description: draft.description,
      categoryId: draft.categoryId,
      logoUrl: draft.logoUrl,
      bannerUrl: draft.bannerUrl,
      pickupStreet: draft.pickupStreet,
      pickupArea: draft.pickupArea,
      pickupCity: draft.pickupCity,
      pickupPhone: draft.pickupPhone,
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

    if (handleStatus === 'taken') {
      setErrors({ handle: t('seller.setup.handleTaken') })
      return
    }

    updateDraft({ setupStep: 1 })
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    onContinue()
  }, [draft, handleStatus, updateDraft, onContinue, t, reduced])

  const selectedCategory = categories.find(c => c.id === draft.categoryId)

  const steps: WizardStep[] = [
    { key: 'store', labelKey: 'seller.setup.stepStore', label: t('seller.setup.stepStore') },
    { key: 'business', labelKey: 'seller.setup.stepBusiness', label: t('seller.setup.stepBusiness') },
    { key: 'bank', labelKey: 'seller.setup.stepBank', label: t('seller.setup.stepBank') },
    { key: 'review', labelKey: 'seller.setup.stepReview', label: t('seller.setup.stepReview') },
  ]

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const slugResultStyle = useAnimatedStyle(() => ({
    opacity: handleStatus === 'idle' ? 0 : 1,
  }))

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <Animated.View style={containerStyle}>
        <View style={styles.stepperWrap}>
          <WizardStepper steps={steps} current={0} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('seller.setup.storeTitle')}
            </Text>
            <Text style={styles.subtitle}>{t('seller.setup.storeSubtitle')}</Text>
          </View>

          <View style={styles.fields}>
            <Field label={t('seller.setup.storeNameLabel')} error={errors.storeName}>
              <TextInput
                style={styles.input}
                value={draft.storeName}
                onChangeText={v => updateField('storeName', v)}
                placeholder={t('seller.setup.storeNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('seller.setup.storeNameLabel')}
              />
              <Text style={styles.helper}>{t('seller.setup.storeNameHelper')}</Text>
            </Field>

            <Field label={t('seller.setup.handleLabel')} error={errors.handle}>
              <View style={styles.slugRow}>
                <Text style={styles.slugPrefix}>chinooz.com/store/</Text>
                <TextInput
                  style={[styles.input, styles.slugInput]}
                  value={draft.handle}
                  onChangeText={v => updateField('handle', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder={t('seller.setup.handlePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  accessibilityLabel={t('seller.setup.handleLabel')}
                />
                {handleStatus === 'checking' && <Loader size={16} color={colors.textMuted} strokeWidth={2} />}
                {handleStatus === 'available' && <Check size={16} color={colors.success} strokeWidth={2.5} />}
                {handleStatus === 'taken' && <X size={16} color={colors.error} strokeWidth={2.5} />}
              </View>
              <Text style={styles.helper}>{t('seller.setup.handleHelper')}</Text>
              <Animated.View style={slugResultStyle}>
                {handleStatus === 'available' && (
                  <Text
                    style={styles.slugAvailable}
                    accessibilityLabel={t('seller.setup.handleAvailableAria')}
                  >
                    {t('seller.setup.handleAvailable')}
                  </Text>
                )}
                {handleStatus === 'taken' && (
                  <Text
                    style={styles.slugTaken}
                    accessibilityLabel={t('seller.setup.handleTakenAria')}
                  >
                    {t('seller.setup.handleTaken')}
                  </Text>
                )}
                {handleStatus === 'checking' && (
                  <Text style={styles.slugChecking}>{t('seller.setup.handleChecking')}</Text>
                )}
              </Animated.View>
            </Field>

            <View style={styles.uploadRow}>
              <UploadField
                label={t('seller.setup.logoLabel')}
                helper={t('seller.setup.logoHelper')}
                ariaLabel={t('seller.setup.logoUploadAria')}
                imageUrl={draft.logoUrl}
                size="logo"
              />
              <UploadField
                label={t('seller.setup.bannerLabel')}
                helper={t('seller.setup.bannerHelper')}
                ariaLabel={t('seller.setup.bannerUploadAria')}
                imageUrl={draft.bannerUrl}
                size="banner"
              />
            </View>

            <Field label={t('seller.setup.descLabel')}>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={draft.description}
                onChangeText={v => updateField('description', v.slice(0, 200))}
                placeholder={t('seller.setup.descPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('seller.setup.descLabel')}
              />
              <Text style={styles.helper}>
                {t('seller.setup.descHelper', { count: draft.description.length })}
              </Text>
            </Field>

            <Field label={t('seller.setup.categoryLabel')} error={errors.categoryId}>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setCategoryOpen(!categoryOpen)}
                accessibilityLabel={t('seller.setup.categoryLabel')}
              >
                <Text style={[styles.selectText, !selectedCategory && styles.selectPlaceholder]}>
                  {selectedCategory ? selectedCategory.name : t('seller.setup.categoryPlaceholder')}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
              {categoryOpen && (
                <View style={styles.selectDropdown}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.selectOption}
                      onPress={() => {
                        updateField('categoryId', cat.id)
                        setCategoryOpen(false)
                      }}
                    >
                      <Text style={styles.selectOptionText}>{cat.name}</Text>
                      {cat.id === draft.categoryId && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.helper}>{t('seller.setup.categoryHelper')}</Text>
            </Field>

            <View style={styles.addressSection}>
              <Text style={styles.sectionLabel}>{t('seller.setup.addressLabel')}</Text>
              <Field label={t('seller.setup.addressStreet')} error={errors.pickupStreet}>
                <TextInput
                  style={styles.input}
                  value={draft.pickupStreet}
                  onChangeText={v => updateField('pickupStreet', v)}
                  placeholder={t('seller.setup.addressStreet')}
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('seller.setup.addressStreet')}
                />
              </Field>
              <Field label={t('seller.setup.addressArea')} error={errors.pickupArea}>
                <TextInput
                  style={styles.input}
                  value={draft.pickupArea}
                  onChangeText={v => updateField('pickupArea', v)}
                  placeholder={t('seller.setup.addressArea')}
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('seller.setup.addressArea')}
                />
              </Field>
              <View style={styles.addressRow}>
                <Field label={t('seller.setup.addressCity')} error={errors.pickupCity}>
                  <TextInput
                    style={styles.input}
                    value={draft.pickupCity}
                    onChangeText={v => updateField('pickupCity', v)}
                    placeholder={t('seller.setup.addressCity')}
                    placeholderTextColor={colors.textTertiary}
                    accessibilityLabel={t('seller.setup.addressCity')}
                  />
                </Field>
                <Field label={t('seller.setup.addressPhone')} error={errors.pickupPhone}>
                  <TextInput
                    style={styles.input}
                    value={draft.pickupPhone}
                    onChangeText={v => updateField('pickupPhone', v.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98XXXXXXXX"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    accessibilityLabel={t('seller.setup.addressPhone')}
                  />
                </Field>
              </View>
            </View>

            <View style={styles.previewWrap}>
              <StorefrontPreview
                storeName={draft.storeName}
                categoryName={selectedCategory?.name || ''}
                logoUrl={draft.logoUrl}
                bannerUrl={draft.bannerUrl}
                noLogoLabel={t('seller.setup.previewNoLogo')}
                noBannerLabel={t('seller.setup.previewNoBanner')}
                noNameLabel={t('seller.setup.previewNoName')}
                noCategoryLabel={t('seller.setup.previewNoCategory')}
                previewTitle={t('seller.setup.previewTitle')}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={handleContinue}
          style={styles.primaryCta}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('seller.setup.continue')}
        >
          <Text style={styles.primaryCtaText}>{t('seller.setup.continue')}</Text>
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

function Field({
  label,
  error,
  helper,
  children,
}: {
  label: string
  error?: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  )
}

function UploadField({
  label,
  helper,
  ariaLabel,
  imageUrl,
  size,
}: {
  label: string
  helper: string
  ariaLabel: string
  imageUrl: string
  size: 'logo' | 'banner'
}) {
  return (
    <View style={styles.uploadField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={size === 'logo' ? styles.logoUpload : styles.bannerUpload}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.uploadPreview} resizeMode="cover" />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <ImageIcon size={20} color={colors.textTertiary} strokeWidth={2} />
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  )
}

// Need to import Image from react-native
import { Image } from 'react-native'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  stepperWrap: {
    paddingBottom: spacing[2],
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  fields: {
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  field: {
    gap: spacing[1.5],
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textarea: {
    height: 80,
    paddingTop: spacing[2.5],
    paddingBottom: spacing[2.5],
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
  },
  helper: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '400',
  },
  slugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  slugPrefix: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  slugInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    height: '100%',
  },
  slugAvailable: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing[1],
  },
  slugTaken: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    marginTop: spacing[1],
  },
  slugChecking: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: spacing[1],
  },
  uploadRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  uploadField: {
    flex: 1,
    gap: spacing[1.5],
  },
  logoUpload: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerUpload: {
    width: '100%',
    height: 72,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  selectText: {
    fontSize: 15,
    color: colors.text,
  },
  selectPlaceholder: {
    color: colors.textTertiary,
  },
  selectDropdown: {
    marginTop: spacing[1],
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  selectOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  addressSection: {
    gap: spacing[4],
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  addressRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  previewWrap: {
    marginTop: spacing[2],
  },
  ctaDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2],
  },
  primaryCta: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  secondaryCta: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
