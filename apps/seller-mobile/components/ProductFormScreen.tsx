import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontSize, fontFamily } from '@chinooz/theme'
import { BottomSheet, SafeImage } from '@chinooz/ui'
import { useSellerCategories, useSellerProducts } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPR } from '@chinooz/utils'
import {
  productFormSchema,
  productMediaSectionSchema,
  productDetailsSectionSchema,
  productPricingSectionSchema,
  productDescriptionSectionSchema,
} from '@chinooz/validation'
import { useA11y } from './A11yProvider'

type SectionKey = 'media' | 'details' | 'pricing' | 'description'

interface FormState {
  image: string
  name: string
  sku: string
  categoryId: string
  price: string
  compareAtPrice: string
  stockCount: string
  description: string
  specs: string
  weight: string
  shippingWidth: string
  shippingHeight: string
  shippingLength: string
  status: 'active' | 'draft'
}

const EMPTY_FORM: FormState = {
  image: '',
  name: '',
  sku: '',
  categoryId: '',
  price: '',
  compareAtPrice: '',
  stockCount: '',
  description: '',
  specs: '',
  weight: '',
  shippingWidth: '',
  shippingHeight: '',
  shippingLength: '',
  status: 'draft',
}

const SECTION_ICONS: Record<SectionKey, string> = {
  media: '🖼',
  details: '🏷',
  pricing: '₨',
  description: '📄',
}

const SPRING_CONFIG = { damping: 25, stiffness: 300, mass: 0.8 }

export default function ProductFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams()
  const { reducedMotion } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const editId = (params?.id as string) || undefined
  const isEdit = !!editId

  const { data: sellerCats } = useSellerCategories()
  const { data: productData } = useSellerProducts({})

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showUnsaved, setShowUnsaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['media']))

  const formRef = useRef<FormState>(form)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snackbarOpacity = useSharedValue(0)

  formRef.current = form

  useEffect(() => {
    analytics.screen({ name: isEdit ? 'seller-product-edit' : 'seller-product-new' })
  }, [isEdit])

  if (!isLoggedIn) return <Redirect href="/onboarding" />

  // Load product for edit
  useEffect(() => {
    if (!isEdit || !productData) return
    const product = productData.items.find(p => p.id === editId)
    if (product) {
      const loaded: FormState = {
        image: product.image,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        price: String(product.price),
        compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
        stockCount: String(product.stockCount),
        description: product.name + ' — ' + product.categoryName,
        specs: '',
        weight: '',
        shippingWidth: '',
        shippingHeight: '',
        shippingLength: '',
        status: product.status === 'active' ? 'active' : 'draft',
      }
      setForm(loaded)
      setInitialForm(loaded)
    }
  }, [isEdit, editId, productData])

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm)
  }, [form, initialForm])

  // Autosave draft (debounced ~2s)
  useEffect(() => {
    if (!isDirty) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSaveState('saving')
    autosaveTimer.current = setTimeout(() => {
      setSaveState('saved')
      setInitialForm(formRef.current)
      analytics.track({ name: 'seller_product_autosave' })
      setTimeout(() => setSaveState('idle'), 2000)
    }, 2000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [form, isDirty])

  useEffect(() => {
    return () => { if (snackbarTimer.current) clearTimeout(snackbarTimer.current) }
  }, [])

  const showSnackbar = (msg: string) => {
    setSnackbar(msg)
    snackbarOpacity.value = reducedMotion ? 1 : withTiming(1, { duration: 200 })
    try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => {
      setSnackbar(null)
      snackbarOpacity.value = reducedMotion ? 0 : withTiming(0, { duration: 200 })
    }, 3000)
  }

  const snackbarStyle = useAnimatedStyle(() => ({
    opacity: snackbarOpacity.value,
    transform: [{ translateY: snackbarOpacity.value === 1 ? 0 : 20 }],
  }))

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const toggleSection = (key: SectionKey) => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Section validation
  const sectionErrors = useMemo(() => {
    const parseData = {
      ...form,
      price: form.price ? Number(form.price) : undefined,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      stockCount: form.stockCount ? Number(form.stockCount) : undefined,
    } as any

    const sections: Record<SectionKey, number> = { media: 0, details: 0, pricing: 0, description: 0 }
    const mediaRes = productMediaSectionSchema.safeParse(parseData)
    if (!mediaRes.success) sections.media = mediaRes.error.issues.length
    const detailsRes = productDetailsSectionSchema.safeParse(parseData)
    if (!detailsRes.success) sections.details = detailsRes.error.issues.length
    const pricingRes = productPricingSectionSchema.safeParse(parseData)
    if (!pricingRes.success) sections.pricing = pricingRes.error.issues.length
    const descRes = productDescriptionSectionSchema.safeParse(parseData)
    if (!descRes.success) sections.description = descRes.error.issues.length
    return sections
  }, [form])

  const totalErrors = Object.values(sectionErrors).reduce((a, b) => a + b, 0)
  const sectionComplete = useMemo(() => ({
    media: sectionErrors.media === 0,
    details: sectionErrors.details === 0,
    pricing: sectionErrors.pricing === 0,
    description: sectionErrors.description === 0,
  }), [sectionErrors])

  const sections: { key: SectionKey; label: string; hint: string }[] = [
    { key: 'media', label: t('seller.products.formSectionMedia'), hint: t('seller.products.formSectionMediaHint') },
    { key: 'details', label: t('seller.products.formSectionDetails'), hint: t('seller.products.formSectionDetailsHint') },
    { key: 'pricing', label: t('seller.products.formSectionPricing'), hint: t('seller.products.formSectionPricingHint') },
    { key: 'description', label: t('seller.products.formSectionDescription'), hint: t('seller.products.formSectionDescriptionHint') },
  ]

  const validateAll = (): boolean => {
    const parseData = {
      ...form,
      price: form.price ? Number(form.price) : 0,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      stockCount: form.stockCount ? Number(form.stockCount) : 0,
      weight: form.weight ? Number(form.weight) : undefined,
      shippingWidth: form.shippingWidth ? Number(form.shippingWidth) : undefined,
      shippingHeight: form.shippingHeight ? Number(form.shippingHeight) : undefined,
      shippingLength: form.shippingLength ? Number(form.shippingLength) : undefined,
    } as any
    const result = productFormSchema.safeParse(parseData)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!newErrors[field]) newErrors[field] = issue.message
      }
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSaveDraft = () => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track({ name: 'seller_product_save_draft' })
    setSaveState('saving')
    setTimeout(() => {
      setSaveState('saved')
      setInitialForm(form)
      showSnackbar(t('seller.products.formDraftSaved'))
      setTimeout(() => setSaveState('idle'), 2000)
    }, 500)
  }

  const handlePublish = () => {
    if (!validateAll()) {
      try { if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch {}
      showSnackbar(t('seller.products.formErrorSummary'))
      return
    }
    setPublishing(true)
    analytics.track({ name: 'seller_product_publish' })
    setTimeout(() => {
      setPublishing(false)
      setInitialForm(form)
      showSnackbar(t('seller.products.formPublished'))
      setTimeout(() => router.replace('/(tabs)/products'), 1200)
    }, 600)
  }

  const handleBack = () => {
    if (isDirty) {
      setShowUnsaved(true)
    } else {
      router.back()
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('seller.products.formBackAria')}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isEdit ? t('seller.products.formTitleEdit') : t('seller.products.formTitleNew')}
          </Text>
          {saveState === 'saving' && (
            <Text style={styles.saveIndicator}>{t('seller.products.formSaving')}</Text>
          )}
          {saveState === 'saved' && (
            <Text style={styles.saveIndicatorSaved}>✓ {t('seller.products.formSaved')}</Text>
          )}
        </View>
        {totalErrors > 0 && (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>{totalErrors}</Text>
          </View>
        )}
      </View>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[4], paddingBottom: 100, gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Error summary */}
          {totalErrors > 0 && (
            <View style={styles.errorSummary} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Text style={styles.errorSummaryTitle}>{t('seller.products.formErrorSummary')}</Text>
              {Object.entries(errors).map(([field, msg]) => (
                <Text key={field} style={styles.errorSummaryItem}>• {msg}</Text>
              ))}
            </View>
          )}

          {/* Collapsible sections */}
          {sections.map(s => (
            <CollapsibleSection
              key={s.key}
              sectionKey={s.key}
              label={s.label}
              hint={s.hint}
              icon={SECTION_ICONS[s.key]}
              complete={sectionComplete[s.key]}
              errorCount={sectionErrors[s.key]}
              expanded={expandedSections.has(s.key)}
              onToggle={() => toggleSection(s.key)}
              reduced={reducedMotion}
            >
              {s.key === 'media' && <MediaSection form={form} errors={errors} updateField={updateField} t={t} />}
              {s.key === 'details' && <DetailsSection form={form} errors={errors} updateField={updateField} t={t} categories={sellerCats} />}
              {s.key === 'pricing' && <PricingSection form={form} errors={errors} updateField={updateField} t={t} />}
              {s.key === 'description' && <DescriptionSection form={form} errors={errors} updateField={updateField} t={t} />}
            </CollapsibleSection>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky save bar */}
      <View style={styles.saveBar}>
        <TouchableOpacity
          onPress={handleSaveDraft}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel={t('seller.products.formSaveDraftAria')}
          style={styles.saveDraftBtn}
        >
          <Text style={styles.saveDraftText}>{t('seller.products.formSaveDraft')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel={t('seller.products.formPublishAria')}
          style={styles.publishBtn}
        >
          <Text style={styles.publishText}>{publishing ? '…' : t('seller.products.formPublish')}</Text>
        </TouchableOpacity>
      </View>

      {/* Unsaved dialog */}
      <BottomSheet visible={showUnsaved} onClose={() => setShowUnsaved(false)} title={t('seller.products.formUnsavedTitle')}>
        <Text style={styles.unsavedBody}>{t('seller.products.formUnsavedBody')}</Text>
        <View style={styles.unsavedActions}>
          <TouchableOpacity
            onPress={() => { setShowUnsaved(false); router.back() }}
            style={styles.unsavedLeaveBtn}
          >
            <Text style={styles.unsavedLeaveText}>{t('seller.products.formUnsavedLeave')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowUnsaved(false)}
            style={styles.unsavedStayBtn}
          >
            <Text style={styles.unsavedStayText}>{t('seller.products.formUnsavedStay')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Snackbar */}
      {snackbar && (
        <Animated.View style={[styles.snackbarWrap, snackbarStyle]} pointerEvents="none">
          <View style={styles.snackbar}>
            <Text style={styles.snackbarText}>{snackbar}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  )
}

// ---- Collapsible section ----

function CollapsibleSection({
  sectionKey,
  label,
  hint,
  icon,
  complete,
  errorCount,
  expanded,
  onToggle,
  reduced,
  children,
}: {
  sectionKey: SectionKey
  label: string
  hint: string
  icon: string
  complete: boolean
  errorCount: number
  expanded: boolean
  onToggle: () => void
  reduced: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const height = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    height.value = expanded ? 1 : 0
  }, [expanded])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    height: height.value === 0 ? 0 : undefined,
  }))

  return (
    <View style={styles.sectionCard}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${label} — ${complete ? t('seller.products.formComplete') : errorCount > 0 ? t('seller.products.formErrors', { count: errorCount }) : t('seller.products.formIncomplete')}`}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionIcon}>{icon}</Text>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{label}</Text>
          <Text style={styles.sectionHint}>{hint}</Text>
        </View>
        {complete ? (
          <Text style={styles.sectionComplete}>✓</Text>
        ) : errorCount > 0 ? (
          <View style={styles.sectionErrorBadge}>
            <Text style={styles.sectionErrorBadgeText}>{errorCount}</Text>
          </View>
        ) : null}
        <Text style={[styles.sectionChevron, expanded && styles.sectionChevronExpanded]}>›</Text>
      </Pressable>
      <Animated.View style={[contentStyle, styles.sectionBody]}>
        {children}
      </Animated.View>
    </View>
  )
}

// ---- Form sections ----

function Field({ label, hint, error, errorId, children }: { label: string; hint?: string; error?: string; errorId?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  )
}

function MediaSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any }) {
  return (
    <View style={styles.sectionContent}>
      <Field label={t('seller.products.formFieldImage')} hint={t('seller.products.formFieldImageHint')} error={errors.image}>
        <View style={styles.mediaRow}>
          <View style={styles.mediaPreview}>
            {form.image ? (
              <SafeImage source={form.image} alt="Preview" style={styles.mediaImage} />
            ) : (
              <Text style={styles.mediaPlaceholder}>🖼</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={form.image}
              onChangeText={v => updateField('image', v)}
              placeholder={t('seller.products.formFieldImageUrl')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('seller.products.formFieldImageUrl')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldHint}>{t('seller.products.formFieldImageUrlHint')}</Text>
          </View>
        </View>
      </Field>
    </View>
  )
}

function DetailsSection({ form, errors, updateField, t, categories }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any; categories?: { id: string; name: string }[] }) {
  return (
    <View style={styles.sectionContent}>
      <Field label={t('seller.products.formFieldName')} hint={t('seller.products.formFieldNameHint')} error={errors.name}>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={v => updateField('name', v)}
          placeholder="e.g. Handmade Dhaka Topi"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('seller.products.formFieldName')}
        />
      </Field>
      <Field label={t('seller.products.formFieldSku')} hint={t('seller.products.formFieldSkuHint')} error={errors.sku}>
        <TextInput
          style={[styles.input, { fontFamily: 'monospace' }]}
          value={form.sku}
          onChangeText={v => updateField('sku', v)}
          placeholder="e.g. TOP-RED-STD"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('seller.products.formFieldSku')}
          autoCapitalize="none"
        />
      </Field>
      <Field label={t('seller.products.formFieldCategory')} error={errors.categoryId}>
        <View style={styles.categoryList}>
          {(categories ?? []).map(c => {
            const selected = form.categoryId === c.id
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => updateField('categoryId', c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.categoryChip, selected && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Field>
    </View>
  )
}

function PricingSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any }) {
  return (
    <View style={styles.sectionContent}>
      <View style={styles.priceRow}>
        <Field label={t('seller.products.formFieldPrice')} hint={t('seller.products.formFieldPriceHint')} error={errors.price}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.price}
            onChangeText={v => updateField('price', v)}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.formFieldPrice')}
          />
        </Field>
        <Field label={t('seller.products.formFieldCompareAtPrice')} hint={t('seller.products.formFieldCompareAtPriceHint')} error={errors.compareAtPrice}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.compareAtPrice}
            onChangeText={v => updateField('compareAtPrice', v)}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.formFieldCompareAtPrice')}
          />
        </Field>
      </View>
      <Field label={t('seller.products.formFieldStock')} hint={t('seller.products.formFieldStockHint')} error={errors.stockCount}>
        <TextInput
          style={styles.input}
          value={form.stockCount}
          onChangeText={v => updateField('stockCount', v)}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          inputMode="numeric"
          accessibilityLabel={t('seller.products.formFieldStock')}
        />
      </Field>
      {/* Live preview snippet */}
      <View style={styles.pricePreview}>
        <Text style={styles.pricePreviewLabel}>{t('seller.products.formPreview')}</Text>
        <Text style={styles.pricePreviewValue}>
          {form.price ? formatNPR(Number(form.price)) : 'NPR 0'}
        </Text>
      </View>
    </View>
  )
}

function DescriptionSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any }) {
  return (
    <View style={styles.sectionContent}>
      <Field label={t('seller.products.formFieldDescription')} hint={t('seller.products.formFieldDescriptionHint')} error={errors.description}>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={form.description}
          onChangeText={v => updateField('description', v)}
          placeholder="Describe your product in detail..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={5}
          accessibilityLabel={t('seller.products.formFieldDescription')}
        />
      </Field>
      <Field label={t('seller.products.formFieldSpecs')} hint={t('seller.products.formFieldSpecsHint')} error={errors.specs}>
        <TextInput
          style={[styles.input, styles.textarea, { minHeight: 80 }]}
          value={form.specs}
          onChangeText={v => updateField('specs', v)}
          placeholder="Material: Cotton, Dimensions: 30cm x 20cm..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          accessibilityLabel={t('seller.products.formFieldSpecs')}
        />
      </Field>
      <Field label={t('seller.products.formFieldWeight')}>
        <TextInput
          style={styles.input}
          value={form.weight}
          onChangeText={v => updateField('weight', v)}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          inputMode="numeric"
          accessibilityLabel={t('seller.products.formFieldWeight')}
        />
      </Field>
      <Text style={styles.dimsLabel}>{t('seller.products.formFieldShippingDims')}</Text>
      <View style={styles.dimsRow}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            value={form.shippingWidth}
            onChangeText={v => updateField('shippingWidth', v)}
            placeholder={t('seller.products.formFieldShippingWidth')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.formFieldShippingWidth')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            value={form.shippingHeight}
            onChangeText={v => updateField('shippingHeight', v)}
            placeholder={t('seller.products.formFieldShippingHeight')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.formFieldShippingHeight')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            value={form.shippingLength}
            onChangeText={v => updateField('shippingLength', v)}
            placeholder={t('seller.products.formFieldShippingLength')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel={t('seller.products.formFieldShippingLength')}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.white, fontSize: 26, fontWeight: '400', marginTop: -4 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.white },
  saveIndicator: { fontSize: 12, color: colors.primary50, marginTop: 2 },
  saveIndicatorSaved: { fontSize: 12, color: colors.white, marginTop: 2 },
  errorBadge: {
    backgroundColor: colors.error,
    borderRadius: radii.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: spacing[1.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  errorSummary: {
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    padding: spacing[3],
  },
  errorSummaryTitle: { fontSize: 13, fontWeight: '600', color: colors.error, marginBottom: spacing[1] },
  errorSummaryItem: { fontSize: 12, color: colors.error, marginLeft: spacing[2] },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  sectionIcon: { fontSize: 20 },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sectionComplete: { color: colors.success, fontSize: 18, fontWeight: '700' },
  sectionErrorBadge: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: radii.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: spacing[1.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionErrorBadgeText: { color: colors.error, fontSize: 12, fontWeight: '700' },
  sectionChevron: { fontSize: 22, color: colors.textTertiary, transform: [{ rotate: '0deg' }] },
  sectionChevronExpanded: { transform: [{ rotate: '90deg' }] },
  sectionBody: { overflow: 'hidden' },
  sectionContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[4] },

  field: { gap: spacing[1.5] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  fieldHint: { fontSize: 12, color: colors.textMuted },
  fieldError: { fontSize: 12, color: colors.error },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textarea: {
    minHeight: 100,
    paddingVertical: spacing[3],
    textAlignVertical: 'top',
  },

  mediaRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaImage: { width: '100%', height: '100%' },
  mediaPlaceholder: { fontSize: 28, color: colors.textTertiary },

  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  categoryChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 32,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  categoryChipTextActive: { color: colors.white },

  priceRow: { flexDirection: 'row', gap: spacing[3] },
  pricePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginTop: spacing[1],
  },
  pricePreviewLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  pricePreviewValue: { fontSize: 18, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },

  dimsLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  dimsRow: { flexDirection: 'row', gap: spacing[2] },

  saveBar: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 5,
  },
  saveDraftBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftText: { fontSize: 14, fontWeight: '600', color: colors.text },
  publishBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: { fontSize: 14, fontWeight: '700', color: colors.white },

  unsavedBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20, paddingHorizontal: spacing[4], marginTop: spacing[2] },
  unsavedActions: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[5] },
  unsavedLeaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsavedLeaveText: { fontSize: 14, fontWeight: '600', color: colors.text },
  unsavedStayBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsavedStayText: { fontSize: 14, fontWeight: '700', color: colors.white },

  snackbarWrap: { position: 'absolute', bottom: 72, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  snackbar: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  snackbarText: { fontSize: 14, fontWeight: '600', color: colors.text },
})
