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
import { useSellerCategories, useSellerProducts, useCategories } from '@chinooz/hooks'
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
import type { Category } from '@chinooz/types'
import { useA11y } from './A11yProvider'

type SectionKey = 'media' | 'details' | 'pricing' | 'description'

interface VariantOption {
  id: string
  name: string
  values: string[]
}

interface VariantRow {
  id: string
  label: string
  enabled: boolean
  sku: string
  price: string
  compareAtPrice: string
  stock: string
}

interface SpecRow {
  id: string
  key: string
  value: string
}

interface FormState {
  images: string[]
  videoUrl: string
  name: string
  brand: string
  sku: string
  categoryId: string
  tags: string[]
  condition: 'new' | 'used'
  price: string
  compareAtPrice: string
  costPrice: string
  stockCount: string
  options: VariantOption[]
  variants: VariantRow[]
  description: string
  descriptionNe: string
  specRows: SpecRow[]
  specs: string
  weight: string
  shippingWidth: string
  shippingHeight: string
  shippingLength: string
  handlingTime: string
  returnPolicy: string
  pickupLocation: string
  status: 'active' | 'draft'
}

const EMPTY_FORM: FormState = {
  images: [],
  videoUrl: '',
  name: '',
  brand: '',
  sku: '',
  categoryId: '',
  tags: [],
  condition: 'new',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  stockCount: '',
  options: [],
  variants: [],
  description: '',
  descriptionNe: '',
  specRows: [],
  specs: '',
  weight: '',
  shippingWidth: '',
  shippingHeight: '',
  shippingLength: '',
  handlingTime: '',
  returnPolicy: 'accept',
  pickupLocation: '',
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
  const { data: categoryTree } = useCategories()
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
        images: product.image ? [product.image] : [],
        videoUrl: '',
        name: product.name,
        brand: '',
        sku: product.sku,
        categoryId: product.categoryId,
        tags: [],
        condition: 'new' as const,
        price: String(product.price),
        compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
        costPrice: '',
        stockCount: String(product.stockCount),
        options: [],
        variants: [],
        description: product.name + ' — ' + product.categoryName,
        descriptionNe: '',
        specRows: [],
        specs: '',
        weight: '',
        shippingWidth: '',
        shippingHeight: '',
        shippingLength: '',
        handlingTime: '1-2',
        returnPolicy: 'accept',
        pickupLocation: '',
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

  const updateField = useCallback((field: keyof FormState, value: string | string[] | VariantOption[] | VariantRow[] | SpecRow[]) => {
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
              {s.key === 'media' && <MediaSection form={form} errors={errors} updateField={updateField} t={t} reduced={reducedMotion} />}
              {s.key === 'details' && <DetailsSection form={form} errors={errors} updateField={updateField} t={t} categories={sellerCats} categoryTree={categoryTree} reduced={reducedMotion} />}
              {s.key === 'pricing' && <PricingSection form={form} errors={errors} updateField={updateField} t={t} reduced={reducedMotion} />}
              {s.key === 'description' && <DescriptionSection form={form} errors={errors} updateField={updateField} t={t} reduced={reducedMotion} />}
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

const MAX_IMAGES = 8

interface MediaImage {
  id: string
  url: string
  uploading: boolean
  progress: number
  error?: boolean
}

function MediaSection({ form, errors, updateField, t, reduced }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | string[]) => void; t: any; reduced: boolean }) {
  const [mediaImages, setMediaImages] = useState<MediaImage[]>(
    form.images.map((url, i) => ({ id: `img-${i}-${Date.now()}`, url, uploading: false, progress: 100 }))
  )
  const [imageUrl, setImageUrl] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const syncToForm = useCallback((imgs: MediaImage[]) => {
    const urls = imgs.filter(i => !i.uploading).map(i => i.url)
    updateField('images', urls)
  }, [updateField])

  const addImage = (url: string) => {
    if (!url.trim()) return
    if (mediaImages.length >= MAX_IMAGES) return
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newImg: MediaImage = { id, url: url.trim(), uploading: true, progress: 0 }
    setMediaImages(prev => [...prev, newImg])
    let pct = 0
    const interval = setInterval(() => {
      pct += Math.random() * 30 + 15
      if (pct >= 100) {
        pct = 100
        clearInterval(interval)
        setMediaImages(prev => {
          const next = prev.map(img => img.id === id ? { ...img, uploading: false, progress: 100 } : img)
          syncToForm(next)
          return next
        })
      } else {
        setMediaImages(prev => prev.map(img => img.id === id ? { ...img, progress: pct } : img))
      }
    }, 200)
  }

  const handleAddFromUrl = () => {
    if (!imageUrl.trim()) return
    addImage(imageUrl)
    setImageUrl('')
  }

  const retryUpload = (id: string) => {
    setMediaImages(prev => prev.map(i => i.id === id ? { ...i, error: false, uploading: true, progress: 0 } : i))
    let pct = 0
    const interval = setInterval(() => {
      pct += Math.random() * 30 + 15
      if (pct >= 100) {
        pct = 100
        clearInterval(interval)
        setMediaImages(prev => {
          const next = prev.map(i => i.id === id ? { ...i, uploading: false, progress: 100, error: false } : i)
          syncToForm(next)
          return next
        })
      } else {
        setMediaImages(prev => prev.map(i => i.id === id ? { ...i, progress: pct } : i))
      }
    }, 200)
  }

  const handleDelete = (id: string) => {
    setMediaImages(prev => {
      const next = prev.filter(img => img.id !== id)
      syncToForm(next)
      return next
    })
    setDeleteConfirm(null)
  }

  const handleSetCover = (id: string) => {
    setMediaImages(prev => {
      const idx = prev.findIndex(img => img.id === id)
      if (idx <= 0) return prev
      const next = [prev[idx], ...prev.filter((_, i) => i !== idx)]
      syncToForm(next)
      return next
    })
  }

  const moveImage = (id: string, dir: -1 | 1) => {
    setMediaImages(prev => {
      const idx = prev.findIndex(img => img.id === id)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      syncToForm(next)
      return next
    })
  }

  const canAdd = mediaImages.length < MAX_IMAGES

  return (
    <View style={styles.mediaSectionContent}>
      <Field label={t('seller.products.formFieldImage')} hint={t('seller.products.formFieldImageHint')} error={errors.images}>
        {/* Thumbnail grid */}
        <View style={styles.mediaGrid}>
          {mediaImages.map((img, idx) => {
            const isCover = idx === 0
            return (
              <View
                key={img.id}
                style={styles.mediaThumbWrap}
                accessibilityLabel={t('seller.products.mediaThumbAria', { n: idx + 1, cover: isCover ? `, ${t('seller.products.mediaCoverLabel')}` : '' })}
                accessibilityRole="image"
              >
                <View style={styles.mediaThumb}>
                  {img.error ? (
                    <View style={styles.mediaErrorWrap}>
                      <Text style={styles.mediaErrorIcon}>⚠</Text>
                      <Text style={styles.mediaErrorText}>{t('seller.products.uploadError')}</Text>
                      <TouchableOpacity
                        onPress={() => retryUpload(img.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.products.uploadRetryAria', { n: idx + 1 })}
                        style={styles.mediaRetryBtn}
                      >
                        <Text style={styles.mediaRetryText}>{t('seller.products.uploadRetry')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : img.uploading && img.progress < 100 ? (
                    <View style={styles.mediaUploading}>
                      <View style={styles.mediaProgressTrack}>
                        <View
                          style={[styles.mediaProgressBar, { width: `${img.progress}%` }]}
                          accessibilityRole="progressbar"
                          accessibilityLabel={t('seller.products.mediaUploadProgress', { percent: Math.round(img.progress) })}
                        />
                      </View>
                    </View>
                  ) : (
                    <SafeImage source={img.url} alt="" style={styles.mediaImage} />
                  )}

                  {/* Cover badge */}
                  {isCover && !img.uploading && (
                    <View style={styles.mediaCoverBadge}>
                      <Text style={styles.mediaCoverBadgeText}>★ {t('seller.products.mediaCoverBadge')}</Text>
                    </View>
                  )}
                </View>

                {/* Action row */}
                {!img.uploading && (
                  <View style={styles.mediaActions}>
                    <TouchableOpacity
                      onPress={() => moveImage(img.id, -1)}
                      disabled={idx === 0}
                      accessibilityRole="button"
                      accessibilityLabel={t('seller.products.mediaMoveLeftAria', { n: idx + 1 })}
                      style={[styles.mediaActionBtn, idx === 0 && styles.mediaActionDisabled]}
                    >
                      <Text style={styles.mediaActionIcon}>‹</Text>
                    </TouchableOpacity>
                    {!isCover && (
                      <TouchableOpacity
                        onPress={() => handleSetCover(img.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.products.mediaSetCoverAria', { n: idx + 1 })}
                        style={styles.mediaActionBtn}
                      >
                        <Text style={styles.mediaActionIcon}>★</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => moveImage(img.id, 1)}
                      disabled={idx === mediaImages.length - 1}
                      accessibilityRole="button"
                      accessibilityLabel={t('seller.products.mediaMoveRightAria', { n: idx + 1 })}
                      style={[styles.mediaActionBtn, idx === mediaImages.length - 1 && styles.mediaActionDisabled]}
                    >
                      <Text style={styles.mediaActionIcon}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDeleteConfirm(img.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('seller.products.mediaDeleteAria', { n: idx + 1 })}
                      style={[styles.mediaActionBtn, styles.mediaActionDanger]}
                    >
                      <Text style={[styles.mediaActionIcon, { color: colors.error }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}

          {/* Add tile */}
          {canAdd && (
            <TouchableOpacity
              onPress={handleAddFromUrl}
              disabled={!imageUrl.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('seller.products.mediaAddTileAria')}
              style={[styles.mediaAddTile, !imageUrl.trim() && styles.mediaAddTileDisabled]}
            >
              <Text style={styles.mediaAddIcon}>+</Text>
              <Text style={styles.mediaAddText}>{t('seller.products.mediaAddTile')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* URL input */}
        <View style={styles.mediaUrlRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder={t('seller.products.formFieldImageUrl')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.products.formFieldImageUrl')}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleAddFromUrl}
            disabled={!imageUrl.trim()}
            style={[styles.mediaUrlAddBtn, !imageUrl.trim() && styles.mediaAddTileDisabled]}
          >
            <Text style={styles.mediaUrlAddText}>{t('seller.products.mediaAddTile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Max count */}
        {mediaImages.length >= MAX_IMAGES && (
          <Text style={styles.mediaMaxCount}>{t('seller.products.mediaMaxCount', { max: MAX_IMAGES })}</Text>
        )}

        {/* Empty state */}
        {mediaImages.length === 0 && (
          <Text style={styles.fieldHint}>{t('seller.products.mediaEmpty')}</Text>
        )}
      </Field>

      {/* Video URL */}
      <Field label={t('seller.products.formFieldVideoUrl')} hint={t('seller.products.formFieldVideoUrlHint')}>
        <TextInput
          style={styles.input}
          value={form.videoUrl}
          onChangeText={v => updateField('videoUrl', v)}
          placeholder="https://youtube.com/..."
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('seller.products.formFieldVideoUrl')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      {/* Delete confirm */}
      <BottomSheet visible={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={t('seller.products.mediaDeleteConfirm')}>
        <View style={styles.mediaDeleteConfirmActions}>
          <TouchableOpacity
            onPress={() => setDeleteConfirm(null)}
            style={styles.mediaDeleteCancelBtn}
          >
            <Text style={styles.mediaDeleteCancelText}>{t('seller.products.actionCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteConfirm && handleDelete(deleteConfirm)}
            style={styles.mediaDeleteConfirmBtn}
          >
            <Text style={styles.mediaDeleteConfirmText}>{t('seller.products.actionDelete')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  )
}

function generateSkuFromName(name: string): string {
  if (!name.trim()) return ''
  const words = name.trim().toLowerCase().split(/\s+/).slice(0, 3)
  const prefix = words.map(w => w.replace(/[^a-z0-9]/g, '').slice(0, 4)).join('-').toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${prefix}-${suffix}`
}

function findCategoryPath(tree: Category[] | undefined, targetId: string): Category[] {
  if (!tree) return []
  for (const cat of tree) {
    if (cat.id === targetId) return [cat]
    if (cat.children) {
      const sub = findCategoryPath(cat.children, targetId)
      if (sub.length > 0) return [cat, ...sub]
    }
  }
  return []
}

function flattenCategories(tree: Category[] | undefined): { id: string; name: string; parentId: string | null; level: number }[] {
  if (!tree) return []
  const result: { id: string; name: string; parentId: string | null; level: number }[] = []
  const walk = (cats: Category[], level: number) => {
    for (const c of cats) {
      result.push({ id: c.id, name: c.name, parentId: c.parentId, level })
      if (c.children) walk(c.children, level + 1)
    }
  }
  walk(tree, 0)
  return result
}

function DetailsSection({ form, errors, updateField, t, categories, categoryTree, reduced }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | string[]) => void; t: any; categories?: { id: string; name: string }[]; categoryTree?: Category[]; reduced: boolean }) {
  const [catPickerOpen, setCatPickerOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [skuEdited, setSkuEdited] = useState(false)

  const flatCats = useMemo(() => flattenCategories(categoryTree), [categoryTree])
  const selectedPath = useMemo(() => findCategoryPath(categoryTree, form.categoryId), [categoryTree, form.categoryId])
  const pathString = selectedPath.map(c => c.name).join(' › ')
  const suggestedSku = useMemo(() => generateSkuFromName(form.name), [form.name])

  useEffect(() => {
    if (!skuEdited && form.name && !form.sku) {
      updateField('sku', suggestedSku)
    }
  }, [suggestedSku, skuEdited, form.name, form.sku, updateField])

  const filteredCats = useMemo(() => {
    if (!catSearch.trim()) return flatCats
    const q = catSearch.toLowerCase()
    return flatCats.filter(c => c.name.toLowerCase().includes(q))
  }, [flatCats, catSearch])

  const handleAddTag = () => {
    const tag = tagInput.trim().replace(/,/g, '')
    if (!tag) return
    if (form.tags.length >= 10) return
    if (form.tags.includes(tag)) { setTagInput(''); return }
    updateField('tags', [...form.tags, tag])
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    updateField('tags', form.tags.filter(t => t !== tag))
  }

  const handleSkuAutoSuggest = () => {
    setSkuEdited(false)
    updateField('sku', suggestedSku)
  }

  return (
    <View style={styles.sectionContent}>
      {/* Product name */}
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

      {/* Brand */}
      <Field label={t('seller.products.formFieldBrand')} hint={t('seller.products.formFieldBrandHint')}>
        <TextInput
          style={styles.input}
          value={form.brand}
          onChangeText={v => updateField('brand', v)}
          placeholder="e.g. Samsung"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('seller.products.formFieldBrand')}
        />
      </Field>

      {/* SKU + auto-suggest */}
      <Field label={t('seller.products.formFieldSku')} hint={t('seller.products.formFieldSkuHint')} error={errors.sku}>
        <View style={styles.skuRow}>
          <TextInput
            style={[styles.input, { flex: 1, fontFamily: 'monospace' }]}
            value={form.sku}
            onChangeText={v => { setSkuEdited(true); updateField('sku', v) }}
            placeholder="e.g. TOP-RED-STD"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.products.formFieldSku')}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleSkuAutoSuggest}
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.formFieldSkuAutoSuggestBtnAria')}
            style={styles.skuAutoBtn}
          >
            <Text style={styles.skuAutoBtnText} numberOfLines={1}>{t('seller.products.formFieldSkuAutoSuggestBtn')}</Text>
          </TouchableOpacity>
        </View>
        {suggestedSku && skuEdited && (
          <TouchableOpacity onPress={handleSkuAutoSuggest} style={styles.skuSuggestLink}>
            <Text style={styles.skuSuggestText}>
              {t('seller.products.formFieldSkuAutoSuggest', { sku: suggestedSku })}
            </Text>
          </TouchableOpacity>
        )}
      </Field>

      {/* Category picker (BottomSheet) */}
      <Field label={t('seller.products.formFieldCategory')} error={errors.categoryId}>
        <TouchableOpacity
          onPress={() => { setCatPickerOpen(true); setCatSearch('') }}
          accessibilityRole="button"
          accessibilityLabel={pathString ? t('seller.products.formFieldCategoryPathAria', { path: pathString }) : t('seller.products.formFieldCategory')}
          style={styles.catPickerBtn}
        >
          <Text style={form.categoryId ? styles.catPickerText : styles.catPickerPlaceholder} numberOfLines={1}>
            {pathString || t('seller.products.formFieldCategoryPlaceholder')}
          </Text>
          <Text style={styles.catPickerIcon}>›</Text>
        </TouchableOpacity>
      </Field>

      {/* Tags chip input */}
      <Field label={t('seller.products.formFieldTags')} hint={t('seller.products.formFieldTagsHint')}>
        <View style={styles.tagInputWrap}>
          {form.tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(tag)}
                accessibilityRole="button"
                accessibilityLabel={t('seller.products.formFieldTagRemoveAria', { tag })}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.tagChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={handleAddTag}
            placeholder={form.tags.length === 0 ? t('seller.products.formFieldTagsPlaceholder') : ''}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.products.formFieldTagsAria')}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {form.tags.length >= 10 && (
          <Text style={styles.tagMaxWarn}>Maximum 10 tags</Text>
        )}
      </Field>

      {/* Condition segmented control */}
      <Field label={t('seller.products.formFieldCondition')}>
        <View style={styles.segmentWrap} accessibilityRole="radiogroup" accessibilityLabel={t('seller.products.formFieldConditionAria')}>
          {(['new', 'used'] as const).map(c => {
            const active = form.condition === c
            return (
              <TouchableOpacity
                key={c}
                onPress={() => updateField('condition', c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>
                  {t(`seller.products.formFieldCondition${c.charAt(0).toUpperCase() + c.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Field>

      {/* Status segmented control */}
      <Field label={t('seller.products.formFieldStatus')}>
        <View style={styles.segmentWrap} accessibilityRole="radiogroup" accessibilityLabel={t('seller.products.formFieldStatusAria')}>
          {(['draft', 'active'] as const).map(s => {
            const active = form.status === s
            return (
              <TouchableOpacity
                key={s}
                onPress={() => updateField('status', s)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>
                  {t(`seller.products.formFieldStatus${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Field>

      {/* Category picker BottomSheet */}
      <BottomSheet visible={catPickerOpen} onClose={() => setCatPickerOpen(false)} title={t('seller.products.formFieldCategory')}>
        <View style={styles.catSearchWrap}>
          <TextInput
            style={styles.catSearchInput}
            value={catSearch}
            onChangeText={setCatSearch}
            placeholder={t('seller.products.formFieldCategorySearch')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.products.formFieldCategorySearch')}
          />
        </View>
        <ScrollView style={styles.catList} keyboardShouldPersistTaps="handled">
          {filteredCats.map(c => {
            const isSelected = form.categoryId === c.id
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => { updateField('categoryId', c.id); setCatPickerOpen(false) }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.catRow, isSelected && styles.catRowActive, { paddingLeft: 16 + c.level * 16 }]}
              >
                <Text style={[styles.catRowText, isSelected && styles.catRowTextActive]}>
                  {c.level > 0 ? '›  ' : ''}{c.name}
                </Text>
                {isSelected && <Text style={styles.catRowCheck}>✓</Text>}
              </TouchableOpacity>
            )
          })}
          {filteredCats.length === 0 && (
            <Text style={styles.catEmpty}>No categories found</Text>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  )
}

function generateVariantMatrix(options: VariantOption[]): VariantRow[] {
  if (options.length === 0 || options.every(o => o.values.length === 0)) return []
  const combos: string[][] = [[]]
  for (const opt of options) {
    if (opt.values.length === 0) continue
    const next: string[][] = []
    for (const combo of combos) {
      for (const val of opt.values) {
        next.push([...combo, val])
      }
    }
    combos.length = 0
    combos.push(...next)
  }
  return combos.map((combo, i) => ({
    id: `var-${i}-${Date.now()}`,
    label: combo.join(' / '),
    enabled: true,
    sku: '',
    price: '',
    compareAtPrice: '',
    stock: '',
  }))
}

function vatInclusive(price: number): number {
  return Math.round(price / 1.13)
}

function marginPercent(price: number, cost: number): number | null {
  if (!cost || cost <= 0 || !price || price <= 0) return null
  return Math.round(((price - cost) / price) * 100)
}

function validateVariantRow(row: VariantRow): { compareAt?: boolean; negative?: boolean; empty?: boolean } {
  const errs: { compareAt?: boolean; negative?: boolean; empty?: boolean } = {}
  if (row.compareAtPrice && row.price) {
    if (Number(row.compareAtPrice) <= Number(row.price)) errs.compareAt = true
  }
  if (row.stock && Number(row.stock) < 0) errs.negative = true
  if (row.enabled && !row.price) errs.empty = true
  return errs
}

function PricingSection({ form, errors, updateField, t, reduced }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | string[] | VariantOption[] | VariantRow[]) => void; t: any; reduced: boolean }) {
  const [newOptionName, setNewOptionName] = useState('')
  const [optionValueInput, setOptionValueInput] = useState<Record<string, string>>({})
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')

  const hasOptions = form.options.length > 0 && form.options.some(o => o.values.length > 0)
  const variants = form.variants
  const priceNum = form.price ? Number(form.price) : 0
  const costNum = form.costPrice ? Number(form.costPrice) : 0
  const margin = marginPercent(priceNum, costNum)
  const vatAmt = priceNum > 0 ? vatInclusive(priceNum) : 0

  const regenerateMatrix = useCallback((opts: VariantOption[]) => {
    updateField('variants', generateVariantMatrix(opts))
  }, [updateField])

  const addOption = () => {
    if (!newOptionName.trim()) return
    const next = [...form.options, { id: `opt-${Date.now()}`, name: newOptionName.trim(), values: [] }]
    updateField('options', next)
    setNewOptionName('')
  }

  const removeOption = (id: string) => {
    const next = form.options.filter(o => o.id !== id)
    updateField('options', next)
    regenerateMatrix(next)
  }

  const addOptionValue = (optId: string) => {
    const val = (optionValueInput[optId] || '').trim().replace(/,/g, '')
    if (!val) return
    const next = form.options.map(o => o.id === optId ? { ...o, values: [...o.values, val] } : o)
    updateField('options', next)
    setOptionValueInput(prev => ({ ...prev, [optId]: '' }))
    regenerateMatrix(next)
  }

  const removeOptionValue = (optId: string, val: string) => {
    const next = form.options.map(o => o.id === optId ? { ...o, values: o.values.filter(v => v !== val) } : o)
    updateField('options', next)
    regenerateMatrix(next)
  }

  const updateVariant = (id: string, field: keyof VariantRow, value: string | boolean) => {
    updateField('variants', form.variants.map(v => v.id === id ? { ...v, [field]: value } : v))
  }

  const applyBulkPrice = () => {
    if (!bulkPrice) return
    updateField('variants', form.variants.map(v => ({ ...v, price: bulkPrice })))
    setBulkPrice('')
  }

  const applyBulkStock = () => {
    if (!bulkStock) return
    updateField('variants', form.variants.map(v => ({ ...v, stock: bulkStock })))
    setBulkStock('')
  }

  return (
    <View style={styles.sectionContent}>
      {/* Single-variant pricing */}
      {!hasOptions && (
        <>
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
              {priceNum > 0 && (
                <Text style={styles.vatText}>{t('seller.products.vatInclusive')} · NPR {vatAmt.toLocaleString('en-IN')}</Text>
              )}
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
          <View style={styles.priceRow}>
            <Field label={t('seller.products.formFieldStock')} hint={t('seller.products.formFieldStockHint')} error={errors.stockCount}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.stockCount}
                onChangeText={v => updateField('stockCount', v)}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                inputMode="numeric"
                accessibilityLabel={t('seller.products.formFieldStock')}
              />
            </Field>
            <Field label={t('seller.products.formFieldCostPrice')} hint={t('seller.products.formFieldCostPriceHint')}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.costPrice}
                onChangeText={v => updateField('costPrice', v)}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                inputMode="numeric"
                accessibilityLabel={t('seller.products.formFieldCostPrice')}
              />
            </Field>
          </View>
          {margin !== null && (
            <Text style={[styles.marginHint, margin < 0 ? { color: colors.error } : margin < 20 ? { color: colors.warning } : { color: colors.success }]}>
              {margin < 0
                ? t('seller.products.marginNegative', { percent: Math.abs(margin) })
                : margin < 20
                ? t('seller.products.marginThin', { percent: margin })
                : t('seller.products.marginHealthy', { percent: margin })}
            </Text>
          )}
          <View style={styles.singleModeHint}>
            <Text style={styles.singleModeText}>{t('seller.products.variantsSingleMode')}</Text>
          </View>
        </>
      )}

      {/* Option builder */}
      <View style={styles.optionBuilderWrap}>
        <Text style={styles.optionBuilderTitle}>{t('seller.products.variantsTitle')}</Text>
        <Text style={styles.optionBuilderSubtitle}>{t('seller.products.variantsSubtitle')}</Text>

        {form.options.map(opt => (
          <View key={opt.id} style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionName}>{opt.name}</Text>
              <TouchableOpacity onPress={() => removeOption(opt.id)} accessibilityRole="button" accessibilityLabel={t('seller.products.variantsRemoveOptionAria', { name: opt.name })}>
                <Text style={styles.optionRemoveText}>{t('seller.products.variantsRemoveOption')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.optionValuesWrap}>
              {opt.values.map(val => (
                <View key={val} style={styles.optionValueChip}>
                  <Text style={styles.optionValueChipText}>{val}</Text>
                  <TouchableOpacity onPress={() => removeOptionValue(opt.id, val)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={styles.optionValueChipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={styles.optionValueInput}
                value={optionValueInput[opt.id] || ''}
                onChangeText={v => setOptionValueInput(prev => ({ ...prev, [opt.id]: v }))}
                onSubmitEditing={() => addOptionValue(opt.id)}
                placeholder={t('seller.products.variantsOptionValuesPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={`${opt.name} ${t('seller.products.variantsOptionValues')}`}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        ))}

        <View style={styles.addOptionRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newOptionName}
            onChangeText={setNewOptionName}
            onSubmitEditing={addOption}
            placeholder={t('seller.products.variantsOptionNamePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={t('seller.products.variantsOptionName')}
          />
          <TouchableOpacity onPress={addOption} disabled={!newOptionName.trim()} style={[styles.addOptionBtn, !newOptionName.trim() && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={t('seller.products.variantsAddOptionAria')}>
            <Text style={styles.addOptionBtnText}>+ {t('seller.products.variantsAddOption')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Variant cards */}
      {hasOptions && variants.length > 0 && (
        <View style={styles.variantsWrap}>
          <Text style={styles.optionBuilderTitle}>{t('seller.products.variantsMatrixTitle')}</Text>

          {/* Bulk-edit */}
          <View style={styles.bulkRow}>
            <Text style={styles.bulkLabel}>{t('seller.products.variantsBulkApply')}</Text>
            <TextInput
              style={styles.bulkInput}
              value={bulkPrice}
              onChangeText={setBulkPrice}
              placeholder={t('seller.products.variantsColPrice')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              inputMode="numeric"
              accessibilityLabel={t('seller.products.variantsBulkPriceAria')}
            />
            <TouchableOpacity onPress={applyBulkPrice} disabled={!bulkPrice} style={[styles.bulkBtn, !bulkPrice && { opacity: 0.5 }]}>
              <Text style={styles.bulkBtnText}>↵</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.bulkInput}
              value={bulkStock}
              onChangeText={setBulkStock}
              placeholder={t('seller.products.variantsColStock')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              inputMode="numeric"
              accessibilityLabel={t('seller.products.variantsBulkStockAria')}
            />
            <TouchableOpacity onPress={applyBulkStock} disabled={!bulkStock} style={[styles.bulkBtn, !bulkStock && { opacity: 0.5 }]}>
              <Text style={styles.bulkBtnText}>↵</Text>
            </TouchableOpacity>
          </View>

          {/* Variant cards */}
          {variants.map(v => {
            const vErrs = validateVariantRow(v)
            return (
              <View key={v.id} style={[styles.variantCard, !v.enabled && styles.variantCardDisabled]}>
                <View style={styles.variantCardHeader}>
                  <Text style={styles.variantLabel}>{v.label}</Text>
                  <TouchableOpacity
                    onPress={() => updateVariant(v.id, 'enabled', !v.enabled)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: v.enabled }}
                    accessibilityLabel={t('seller.products.variantsEnableAria', { label: v.label })}
                    style={[styles.toggleSwitch, v.enabled && styles.toggleSwitchActive]}
                  >
                    <View style={[styles.toggleThumb, v.enabled && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
                <View style={styles.variantInputs}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.variantInput, { fontFamily: 'monospace' }]}
                      value={v.sku}
                      onChangeText={val => updateVariant(v.id, 'sku', val)}
                      placeholder="SKU"
                      placeholderTextColor={colors.textTertiary}
                      accessibilityLabel={t('seller.products.variantsSkuAria', { label: v.label })}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.variantInput, { textAlign: 'right' }]}
                      value={v.price}
                      onChangeText={val => updateVariant(v.id, 'price', val)}
                      placeholder="Price"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      inputMode="numeric"
                      accessibilityLabel={t('seller.products.variantsPriceAria', { label: v.label })}
                    />
                  </View>
                </View>
                <View style={styles.variantInputs}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.variantInput, { textAlign: 'right' }]}
                      value={v.compareAtPrice}
                      onChangeText={val => updateVariant(v.id, 'compareAtPrice', val)}
                      placeholder="Compare-at"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      inputMode="numeric"
                      accessibilityLabel={t('seller.products.variantsCompareAtAria', { label: v.label })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.variantInput, { textAlign: 'right' }]}
                      value={v.stock}
                      onChangeText={val => updateVariant(v.id, 'stock', val)}
                      placeholder="Stock"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      inputMode="numeric"
                      accessibilityLabel={t('seller.products.variantsStockAria', { label: v.label })}
                    />
                  </View>
                </View>
                {vErrs.compareAt && <Text style={styles.variantError}>{t('seller.products.variantsErrorCompareAt')}</Text>}
                {vErrs.negative && <Text style={styles.variantError}>{t('seller.products.variantsErrorNegative')}</Text>}
              </View>
            )
          })}
        </View>
      )}

      {hasOptions && variants.length === 0 && (
        <View style={styles.noVariantsWrap}>
          <Text style={styles.noVariantsText}>{t('seller.products.variantsNoOptions')}</Text>
        </View>
      )}
    </View>
  )
}

const CATEGORY_SPECS: Record<string, { key: string; value: string }[]> = {
  'cat-electronics': [{ key: 'Warranty', value: '' }, { key: 'Brand', value: '' }, { key: 'Model', value: '' }],
  'cat-phones': [{ key: 'Storage', value: '' }, { key: 'RAM', value: '' }, { key: 'Screen Size', value: '' }],
  'cat-fashion': [{ key: 'Material', value: '' }, { key: 'Size', value: '' }, { key: 'Color', value: '' }],
  'cat-home': [{ key: 'Material', value: '' }, { key: 'Dimensions', value: '' }],
  'cat-grocery': [{ key: 'Weight', value: '' }, { key: 'Shelf Life', value: '' }],
  'cat-beauty': [{ key: 'Skin Type', value: '' }, { key: 'Volume', value: '' }],
}

function getSuggestedSpecs(categoryId: string): { key: string; value: string }[] {
  if (!categoryId) return []
  if (CATEGORY_SPECS[categoryId]) return CATEGORY_SPECS[categoryId]
  for (const key of Object.keys(CATEGORY_SPECS)) {
    if (categoryId.startsWith(key.slice(0, 12))) return CATEGORY_SPECS[key]
  }
  return []
}

function DescriptionSection({ form, errors, updateField, t, reduced }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | string[] | VariantOption[] | VariantRow[] | SpecRow[]) => void; t: any; reduced: boolean }) {
  const [descLang, setDescLang] = useState<'en' | 'ne'>('en')
  const [specsPrefilled, setSpecsPrefilled] = useState(false)

  useEffect(() => {
    if (!specsPrefilled && form.categoryId && form.specRows.length === 0) {
      const suggested = getSuggestedSpecs(form.categoryId)
      if (suggested.length > 0) {
        const rows: SpecRow[] = suggested.map((s, i) => ({
          id: `spec-${Date.now()}-${i}`,
          key: s.key,
          value: s.value,
        }))
        updateField('specRows', rows)
        setSpecsPrefilled(true)
      }
    }
  }, [form.categoryId, form.specRows.length, specsPrefilled, updateField])

  const addSpecRow = () => {
    updateField('specRows', [...form.specRows, { id: `spec-${Date.now()}`, key: '', value: '' }])
  }

  const updateSpecRow = (id: string, field: 'key' | 'value', value: string) => {
    updateField('specRows', form.specRows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const removeSpecRow = (id: string) => {
    updateField('specRows', form.specRows.filter(r => r.id !== id))
  }

  const descValue = descLang === 'en' ? form.description : form.descriptionNe
  const setDescValue = (v: string) => {
    if (descLang === 'en') updateField('description', v)
    else updateField('descriptionNe', v)
  }

  const handlingOptions = [
    { value: '1', label: t('seller.products.formFieldHandlingTime1d') },
    { value: '1-2', label: t('seller.products.formFieldHandlingTime2d') },
    { value: '2-3', label: t('seller.products.formFieldHandlingTime3d') },
    { value: '7', label: t('seller.products.formFieldHandlingTime7d') },
  ]

  const returnOptions = [
    { value: 'accept', label: t('seller.products.formFieldReturnPolicyAccept') },
    { value: 'accept14', label: t('seller.products.formFieldReturnPolicyAccept14') },
    { value: 'no_return', label: t('seller.products.formFieldReturnPolicyNoReturn') },
  ]

  return (
    <View style={styles.sectionContent}>
      {/* Description with bilingual toggle */}
      <Field
        label={descLang === 'en' ? t('seller.products.formFieldDescription') : t('seller.products.formFieldDescriptionNe')}
        hint={descLang === 'en' ? t('seller.products.formFieldDescriptionHint') : t('seller.products.formFieldDescriptionNeHint')}
        error={errors.description}
      >
        {/* Language toggle */}
        <View style={styles.langToggleWrap} accessibilityRole="tablist" accessibilityLabel={t('seller.products.formFieldLangToggleAria')}>
          {(['en', 'ne'] as const).map(lang => {
            const active = descLang === lang
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => setDescLang(lang)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.langToggleBtn, active && styles.langToggleBtnActive]}
              >
                <Text style={[styles.langToggleText, active && styles.langToggleTextActive]}>
                  {lang === 'en' ? t('seller.products.formFieldLangEn') : t('seller.products.formFieldLangNe')}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Editor toolbar */}
        <View style={styles.editorToolbar}>
          <Text style={styles.editorToolbarHint}>B  I  •  H</Text>
        </View>

        {/* Editor */}
        <TextInput
          style={[styles.input, styles.textarea, { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 1, marginTop: -1 }]}
          value={descValue}
          onChangeText={setDescValue}
          placeholder={descLang === 'en' ? 'Describe your product...' : 'उत्पादन वर्णन गर्नुहोस्...'}
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={6}
          accessibilityLabel={descLang === 'en' ? t('seller.products.formFieldDescription') : t('seller.products.formFieldDescriptionNe')}
        />
      </Field>

      {/* Specs key-value rows */}
      <Field label={t('seller.products.formFieldSpecs')} hint={t('seller.products.formFieldSpecsHint')}>
        <View style={styles.specRowsWrap}>
          {form.specRows.map(row => (
            <View key={row.id} style={styles.specRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={row.key}
                onChangeText={v => updateSpecRow(row.id, 'key', v)}
                placeholder={t('seller.products.formFieldSpecsKeyPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={`${t('seller.products.formFieldSpecsKey')} ${row.key || ''}`}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={row.value}
                onChangeText={v => updateSpecRow(row.id, 'value', v)}
                placeholder={t('seller.products.formFieldSpecsValuePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={`${t('seller.products.formFieldSpecsValue')} ${row.key || ''}`}
              />
              <TouchableOpacity
                onPress={() => removeSpecRow(row.id)}
                accessibilityRole="button"
                accessibilityLabel={t('seller.products.formFieldSpecsRemoveAria', { key: row.key || t('seller.products.formFieldSpecsKeyPlaceholder') })}
                style={styles.specRemoveBtn}
              >
                <Text style={styles.specRemoveIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={addSpecRow}
            accessibilityRole="button"
            accessibilityLabel={t('seller.products.formFieldSpecsAddAria')}
            style={styles.specAddBtn}
          >
            <Text style={styles.specAddBtnText}>+ {t('seller.products.formFieldSpecsAdd')}</Text>
          </TouchableOpacity>
          {form.specRows.length === 0 && (
            <Text style={styles.fieldHint}>{t('seller.products.formFieldSpecsEmpty')}</Text>
          )}
          {specsPrefilled && form.specRows.length > 0 && (
            <Text style={styles.specPrefilledText}>{t('seller.products.formFieldSpecsPrefilled')}</Text>
          )}
        </View>
      </Field>

      {/* Shipping: weight + dimensions */}
      <Field label={t('seller.products.formFieldWeight')}>
        <TextInput
          style={styles.input}
          value={form.weight}
          onChangeText={v => updateField('weight', v)}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          inputMode="numeric"
          accessibilityLabel={`${t('seller.products.formFieldWeight')} (grams)`}
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
            accessibilityLabel={`${t('seller.products.formFieldShippingWidth')} (cm)`}
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
            accessibilityLabel={`${t('seller.products.formFieldShippingHeight')} (cm)`}
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
            accessibilityLabel={`${t('seller.products.formFieldShippingLength')} (cm)`}
          />
        </View>
      </View>

      {/* Handling time */}
      <Field label={t('seller.products.formFieldHandlingTime')} hint={t('seller.products.formFieldHandlingTimeHint')}>
        <View style={styles.selectList}>
          {handlingOptions.map(opt => {
            const selected = form.handlingTime === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => updateField('handlingTime', opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.selectChip, selected && styles.selectChipActive]}
              >
                <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Field>

      {/* Return policy */}
      <Field label={t('seller.products.formFieldReturnPolicy')} hint={t('seller.products.formFieldReturnPolicyHint')}>
        <View style={styles.selectList}>
          {returnOptions.map(opt => {
            const selected = form.returnPolicy === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => updateField('returnPolicy', opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.selectChip, selected && styles.selectChipActive]}
              >
                <Text style={[styles.selectChipText, selected && styles.selectChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Field>

      {/* Pickup location */}
      <Field label={t('seller.products.formFieldPickupLocation')} hint={t('seller.products.formFieldPickupLocationHint')}>
        <TextInput
          style={styles.input}
          value={form.pickupLocation}
          onChangeText={v => updateField('pickupLocation', v)}
          placeholder={t('seller.products.formFieldPickupLocationPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('seller.products.formFieldPickupLocation')}
        />
      </Field>
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

  mediaSectionContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[4] },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  mediaThumbWrap: { width: 96, gap: spacing[1] },
  mediaThumb: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  mediaImage: { width: '100%', height: '100%' },
  mediaUploading: {
    flex: 1,
    backgroundColor: colors.shimmer,
    justifyContent: 'flex-end',
  },
  mediaProgressTrack: { height: 3, backgroundColor: colors.border },
  mediaProgressBar: { height: 3, backgroundColor: colors.primary },
  mediaErrorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4 },
  mediaErrorIcon: { fontSize: 18, color: colors.error },
  mediaErrorText: { fontSize: 9, color: colors.error, fontWeight: '500', textAlign: 'center' },
  mediaRetryBtn: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.primary },
  mediaRetryText: { fontSize: 9, color: colors.primary, fontWeight: '600' },
  mediaCoverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
  },
  mediaCoverBadgeText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  mediaActions: { flexDirection: 'row', gap: spacing[0.5], justifyContent: 'center' },
  mediaActionBtn: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActionDisabled: { opacity: 0.3 },
  mediaActionDanger: { borderColor: colors.error },
  mediaActionIcon: { fontSize: 14, color: colors.text, fontWeight: '600' },
  mediaAddTile: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  mediaAddTileDisabled: { opacity: 0.5 },
  mediaAddIcon: { fontSize: 24, color: colors.textTertiary, fontWeight: '300' },
  mediaAddText: { fontSize: 10, fontWeight: '500', color: colors.textTertiary, textAlign: 'center' },
  mediaUrlRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  mediaUrlAddBtn: {
    height: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaUrlAddText: { fontSize: 13, fontWeight: '600', color: colors.text },
  mediaMaxCount: { fontSize: 12, color: colors.warning, marginTop: spacing[1] },
  mediaDeleteConfirmActions: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[4] },
  mediaDeleteCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDeleteCancelText: { fontSize: 14, fontWeight: '600', color: colors.text },
  mediaDeleteConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDeleteConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },

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

  skuRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  skuAutoBtn: {
    height: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuAutoBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  skuSuggestLink: { marginTop: spacing[1], paddingVertical: 2 },
  skuSuggestText: { fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },

  catPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  catPickerText: { fontSize: 15, color: colors.text, flex: 1 },
  catPickerPlaceholder: { fontSize: 15, color: colors.textTertiary, flex: 1 },
  catPickerIcon: { fontSize: 20, color: colors.textTertiary },

  tagInputWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    minHeight: 44,
    backgroundColor: colors.surface,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingLeft: spacing[2.5],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
  },
  tagChipText: { fontSize: 13, fontWeight: '500', color: colors.white },
  tagChipRemove: { fontSize: 11, color: colors.white, opacity: 0.85 },
  tagInput: { flex: 1, minWidth: 80, fontSize: 14, color: colors.text, padding: 0 },
  tagMaxWarn: { fontSize: 12, color: colors.warning, marginTop: spacing[1] },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    padding: spacing[1],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentBtnText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  segmentBtnTextActive: { color: colors.white },

  catSearchWrap: { paddingHorizontal: spacing[4], marginBottom: spacing[2] },
  catSearchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  catList: { maxHeight: 300 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingRight: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catRowActive: { backgroundColor: colors.primary50 },
  catRowText: { fontSize: 15, color: colors.text, flex: 1 },
  catRowTextActive: { color: colors.primary, fontWeight: '600' },
  catRowCheck: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  catEmpty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[6] },

  priceRow: { flexDirection: 'row', gap: spacing[3] },
  vatText: { fontSize: 11, color: colors.textMuted, marginTop: spacing[1], fontVariant: ['tabular-nums'] },
  marginHint: { fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  singleModeHint: {
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    marginTop: spacing[1],
  },
  singleModeText: { fontSize: 12, color: colors.primary },

  optionBuilderWrap: { gap: spacing[3] },
  optionBuilderTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  optionBuilderSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: -spacing[1] },
  optionCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing[3],
    gap: spacing[2],
  },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionName: { fontSize: 14, fontWeight: '600', color: colors.text },
  optionRemoveText: { fontSize: 12, color: colors.error },
  optionValuesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5], alignItems: 'center' },
  optionValueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary50,
    borderRadius: radii.full,
    paddingLeft: spacing[2.5],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
  },
  optionValueChipText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  optionValueChipRemove: { fontSize: 11, color: colors.primary, opacity: 0.7 },
  optionValueInput: { flex: 1, minWidth: 80, fontSize: 14, color: colors.text, padding: 0, borderWidth: 0, backgroundColor: 'transparent' },
  addOptionRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  addOptionBtn: {
    height: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },

  variantsWrap: { gap: spacing[3] },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  bulkLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  bulkInput: {
    width: 60,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2],
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surface,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  bulkBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  variantCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing[3],
    gap: spacing[2],
  },
  variantCardDisabled: { opacity: 0.5 },
  variantCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  variantLabel: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  toggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  variantInputs: { flexDirection: 'row', gap: spacing[2] },
  variantInput: {
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2],
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  variantError: { fontSize: 11, color: colors.error },

  noVariantsWrap: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: spacing[4],
    alignItems: 'center',
  },
  noVariantsText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  dimsLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  dimsRow: { flexDirection: 'row', gap: spacing[2] },

  langToggleWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing[2],
    alignSelf: 'flex-start',
  },
  langToggleBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  langToggleBtnActive: { backgroundColor: colors.primary },
  langToggleText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  langToggleTextActive: { color: colors.white },

  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    borderRadius: radii.md,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: colors.surface,
  },
  editorToolbarHint: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 4 },

  specRowsWrap: { gap: spacing[2] },
  specRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  specRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specRemoveIcon: { fontSize: 14, color: colors.textMuted },
  specAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  specAddBtnText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  specPrefilledText: { fontSize: 12, color: colors.success, marginTop: spacing[1] },

  selectList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  selectChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 32,
  },
  selectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  selectChipTextActive: { color: colors.white },

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
