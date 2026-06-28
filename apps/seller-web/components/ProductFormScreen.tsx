'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, AlertCircle, Image as ImageIcon, Tag, DollarSign, FileText, Save } from 'lucide-react'
import { Container, Screen, SafeImage, useReducedMotion } from '@chinooz/ui-web'
import { useSellerCategories, useSellerProducts } from '@chinooz/hooks'
import { analytics } from '@chinooz/analytics'
import { useSellerSessionStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'
import {
  productFormSchema,
  productMediaSectionSchema,
  productDetailsSectionSchema,
  productPricingSectionSchema,
  productDescriptionSectionSchema,
} from '@chinooz/validation'
import type { Product } from '@chinooz/types'

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

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const SECTION_ICONS: Record<SectionKey, React.ReactNode> = {
  media: <ImageIcon size={18} aria-hidden="true" />,
  details: <Tag size={18} aria-hidden="true" />,
  pricing: <DollarSign size={18} aria-hidden="true" />,
  description: <FileText size={18} aria-hidden="true" />,
}

export default function ProductFormScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const editId = params?.id as string | undefined
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

  const formRef = useRef<FormState>(form)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    media: null,
    details: null,
    pricing: null,
    description: null,
  })
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  formRef.current = form

  useEffect(() => {
    analytics.screen({ name: isEdit ? 'seller-product-edit' : 'seller-product-new' })
  }, [isEdit])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

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

  // Dirty check
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm)
  }, [form, initialForm])

  // Dirty guard on navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Autosave draft (debounced ~2s)
  useEffect(() => {
    if (!isDirty || form.status !== 'draft') return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSaveState('saving')
    autosaveTimer.current = setTimeout(() => {
      setSaveState('saved')
      setInitialForm(formRef.current)
      analytics.track({ event: 'seller_product_autosave', screen: 'seller-product-form' })
      setTimeout(() => setSaveState('idle'), 2000)
    }, 2000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [form, isDirty])

  useEffect(() => {
    return () => { if (snackbarTimer.current) clearTimeout(snackbarTimer.current) }
  }, [])

  const showSnackbar = (msg: string) => {
    setSnackbar(msg)
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => setSnackbar(null), 3000)
  }

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  // Section validation
  const sectionErrors = useMemo(() => {
    const parseData = {
      ...form,
      price: form.price ? Number(form.price) : undefined,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      stockCount: form.stockCount ? Number(form.stockCount) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      shippingWidth: form.shippingWidth ? Number(form.shippingWidth) : undefined,
      shippingHeight: form.shippingHeight ? Number(form.shippingHeight) : undefined,
      shippingLength: form.shippingLength ? Number(form.shippingLength) : undefined,
    } as any

    const sections: Record<SectionKey, number> = {
      media: 0,
      details: 0,
      pricing: 0,
      description: 0,
    }

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
    analytics.track({ event: 'seller_product_save_draft', screen: 'seller-product-form' })
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
      showSnackbar(t('seller.products.formErrorSummary'))
      return
    }
    setPublishing(true)
    analytics.track({ event: 'seller_product_publish', screen: 'seller-product-form' })
    setTimeout(() => {
      setPublishing(false)
      setInitialForm(form)
      showSnackbar(t('seller.products.formPublished'))
      setTimeout(() => router.push('/products'), 1200)
    }, 600)
  }

  const handleBack = () => {
    if (isDirty) {
      setShowUnsaved(true)
    } else {
      router.push('/products')
    }
  }

  const scrollToSection = (key: SectionKey) => {
    const el = sectionRefs.current[key]
    if (el) {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }
  }

  // Live preview (debounced)
  const debouncedForm = useDebounced(form, 250)
  const previewProduct: Product = useMemo(() => ({
    id: 'preview',
    name: debouncedForm.name || 'Product name',
    slug: 'preview',
    description: debouncedForm.description || '',
    images: debouncedForm.image ? [{ uri: debouncedForm.image, alt: debouncedForm.name }] : [],
    price: Number(debouncedForm.price) || 0,
    compareAtPrice: debouncedForm.compareAtPrice ? Number(debouncedForm.compareAtPrice) : undefined,
    currency: 'NPR',
    rating: 0,
    reviewCount: 0,
    categoryId: debouncedForm.categoryId,
    sellerId: 'current',
    sellerName: 'Your store',
    stock: Number(debouncedForm.stockCount) <= 0 ? 'out_of_stock' : 'in_stock',
    variants: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }), [debouncedForm])

  return (
    <Screen>
      {/* Header bar */}
      <div className="sticky top-0 z-sticky bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border-light">
        <Container>
          <div className="py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('seller.products.formBackAria')}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.products.formBack')}</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-semibold text-text truncate">
                {isEdit ? t('seller.products.formTitleEdit') : t('seller.products.formTitleNew')}
              </h1>
            </div>
            {/* Save indicator */}
            {saveState === 'saving' && (
              <span className="text-[12px] text-text-muted inline-flex items-center gap-1">
                <Save size={13} className="animate-pulse" aria-hidden="true" />
                {t('seller.products.formSaving')}
              </span>
            )}
            {saveState === 'saved' && (
              <span className="text-[12px] text-success inline-flex items-center gap-1">
                <Check size={13} aria-hidden="true" />
                {t('seller.products.formSaved')}
              </span>
            )}
            {/* Error count badge */}
            {totalErrors > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-error bg-error/10 rounded-full px-2 py-0.5">
                <AlertCircle size={12} aria-hidden="true" />
                {t('seller.products.formErrors', { count: totalErrors })}
              </span>
            )}
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={publishing}
                className="h-9 px-4 rounded-md border border-border bg-surface text-[14px] font-semibold text-text hover:bg-background transition-colors disabled:opacity-50"
              >
                {t('seller.products.formSaveDraft')}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="h-9 px-4 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {publishing ? '…' : t('seller.products.formPublish')}
              </button>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Left: Form + section nav */}
            <div className="min-w-0">
              {/* Section nav (web) */}
              <div className="hidden lg:flex items-center gap-1 mb-4 p-1 bg-surface rounded-lg border border-border-light">
                {sections.map(s => {
                  const complete = sectionComplete[s.key]
                  const errCount = sectionErrors[s.key]
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => scrollToSection(s.key)}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium text-text-muted hover:text-text hover:bg-background transition-colors"
                    >
                      <span className="text-text-muted" aria-hidden="true">{SECTION_ICONS[s.key]}</span>
                      {s.label}
                      {complete ? (
                        <Check size={14} className="text-success" aria-hidden="true" />
                      ) : errCount > 0 ? (
                        <span className="inline-flex items-center justify-center text-[10px] font-bold text-error bg-error/10 rounded-full w-4 h-4">
                          {errCount}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {/* Sections */}
              <div className="flex flex-col gap-4">
                {sections.map(s => (
                  <SectionCard
                    key={s.key}
                    sectionKey={s.key}
                    label={s.label}
                    hint={s.hint}
                    complete={sectionComplete[s.key]}
                    errorCount={sectionErrors[s.key]}
                    reduced={reduced}
                    refCallback={(el) => { sectionRefs.current[s.key] = el }}
                  >
                    {s.key === 'media' && (
                      <MediaSection form={form} errors={errors} updateField={updateField} t={t} />
                    )}
                    {s.key === 'details' && (
                      <DetailsSection form={form} errors={errors} updateField={updateField} t={t} categories={sellerCats} />
                    )}
                    {s.key === 'pricing' && (
                      <PricingSection form={form} errors={errors} updateField={updateField} t={t} />
                    )}
                    {s.key === 'description' && (
                      <DescriptionSection form={form} errors={errors} updateField={updateField} t={t} />
                    )}
                  </SectionCard>
                ))}
              </div>

              {/* Error summary */}
              {totalErrors > 0 && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mt-4 p-3 rounded-lg border border-error/30 bg-error/5"
                >
                  <p className="text-[13px] font-semibold text-error flex items-center gap-1.5 mb-1">
                    <AlertCircle size={15} aria-hidden="true" />
                    {t('seller.products.formErrorSummary')}
                  </p>
                  <ul className="text-[12px] text-error space-y-0.5 pl-5 list-disc">
                    {Object.entries(errors).map(([field, msg]) => (
                      <li key={field}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Live preview (sticky) */}
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <p className="text-[13px] font-semibold text-text-muted mb-2">{t('seller.products.formPreview')}</p>
                <PreviewCard product={previewProduct} t={t} />
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Mobile save bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-sticky bg-surface border-t border-border shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={publishing}
            aria-label={t('seller.products.formSaveDraftAria')}
            className="flex-1 h-11 rounded-md border border-border bg-surface text-[14px] font-semibold text-text active:bg-background transition-colors disabled:opacity-50"
          >
            {t('seller.products.formSaveDraft')}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            aria-label={t('seller.products.formPublishAria')}
            className="flex-1 h-11 rounded-md bg-primary text-white text-[14px] font-semibold active:opacity-90 transition-opacity disabled:opacity-50"
          >
            {publishing ? '…' : t('seller.products.formPublish')}
          </button>
        </div>
      </div>

      {/* Unsaved changes dialog */}
      <AnimatePresence>
        {showUnsaved && (
          <UnsavedDialog
            title={t('seller.products.formUnsavedTitle')}
            body={t('seller.products.formUnsavedBody')}
            leaveLabel={t('seller.products.formUnsavedLeave')}
            stayLabel={t('seller.products.formUnsavedStay')}
            ariaLabel={t('seller.products.formUnsavedAria')}
            reduced={reduced}
            onLeave={() => { setShowUnsaved(false); router.push('/products') }}
            onStay={() => setShowUnsaved(false)}
          />
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-toast"
            role="status"
            aria-live="polite"
          >
            <div className="inline-flex items-center gap-2 rounded-lg shadow-xl px-4 py-3 text-[14px] font-semibold bg-surface text-text border border-border">
              <Check size={18} className="text-success" aria-hidden="true" />
              {snackbar}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  )
}

// ---- Section card (web) ----

const SectionCard = React.forwardRef<
  HTMLDivElement,
  {
    sectionKey: SectionKey
    label: string
    hint: string
    complete: boolean
    errorCount: number
    reduced: boolean
    refCallback: (el: HTMLDivElement | null) => void
    children: React.ReactNode
  }
>(function SectionCard({ sectionKey, label, hint, complete, errorCount, reduced, refCallback, children }, _ref) {
  const icon = SECTION_ICONS[sectionKey]
  return (
    <div
      ref={refCallback}
      className="bg-surface rounded-lg border border-border-light shadow-sm overflow-hidden scroll-mt-20"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
        <span className="text-text-muted" aria-hidden="true">{icon}</span>
        <div className="flex-1">
          <h3 className="text-[18px] font-semibold text-text leading-tight">{label}</h3>
          <p className="text-[12px] text-text-muted mt-0.5">{hint}</p>
        </div>
        {complete ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success">
            <Check size={14} aria-hidden="true" />
          </span>
        ) : errorCount > 0 ? (
          <span className="inline-flex items-center justify-center text-[11px] font-bold text-error bg-error/10 rounded-full w-5 h-5">
            {errorCount}
          </span>
        ) : null}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
})

// ---- Form sections ----

function Field({
  label,
  hint,
  error,
  errorId,
  children,
}: {
  label: string
  hint?: string
  error?: string
  errorId?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] font-semibold text-text">{label}</label>
      {children}
      {error ? (
        <p id={errorId} className="text-[12px] font-normal text-error" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[12px] font-normal text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

function inputCls(hasError?: boolean) {
  return `w-full h-10 px-3 rounded-md border bg-surface text-[14px] text-text outline-none transition-colors placeholder:text-text-tertiary ${
    hasError ? 'border-error focus:border-error' : 'border-border focus:border-primary'
  }`
}

function MediaSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any }) {
  return (
    <div className="flex flex-col gap-4">
      <Field
        label={t('seller.products.formFieldImage')}
        hint={t('seller.products.formFieldImageHint')}
        error={errors.image}
        errorId="error-image"
      >
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-md border border-border bg-background overflow-hidden shrink-0 flex items-center justify-center">
            {form.image ? (
              <SafeImage src={form.image} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={28} className="text-text-tertiary" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="url"
              value={form.image}
              onChange={e => updateField('image', e.target.value)}
              placeholder={t('seller.products.formFieldImageUrl')}
              aria-label={t('seller.products.formFieldImageUrl')}
              aria-describedby={errors.image ? 'error-image' : undefined}
              aria-invalid={!!errors.image}
              className={inputCls(!!errors.image)}
            />
            <p className="text-[12px] text-text-muted mt-1.5">{t('seller.products.formFieldImageUrlHint')}</p>
          </div>
        </div>
      </Field>
    </div>
  )
}

function DetailsSection({ form, errors, updateField, t, categories }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any; categories?: { id: string; name: string }[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('seller.products.formFieldName')} hint={t('seller.products.formFieldNameHint')} error={errors.name} errorId="error-name">
        <input
          type="text"
          value={form.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="e.g. Handmade Dhaka Topi"
          aria-label={t('seller.products.formFieldName')}
          aria-describedby={errors.name ? 'error-name' : undefined}
          aria-invalid={!!errors.name}
          className={inputCls(!!errors.name)}
        />
      </Field>
      <Field label={t('seller.products.formFieldSku')} hint={t('seller.products.formFieldSkuHint')} error={errors.sku} errorId="error-sku">
        <input
          type="text"
          value={form.sku}
          onChange={e => updateField('sku', e.target.value)}
          placeholder="e.g. TOP-RED-STD"
          aria-label={t('seller.products.formFieldSku')}
          aria-describedby={errors.sku ? 'error-sku' : undefined}
          aria-invalid={!!errors.sku}
          className={`${inputCls(!!errors.sku)} font-mono`}
        />
      </Field>
      <Field label={t('seller.products.formFieldCategory')} error={errors.categoryId} errorId="error-categoryId">
        <select
          value={form.categoryId}
          onChange={e => updateField('categoryId', e.target.value)}
          aria-label={t('seller.products.formFieldCategory')}
          aria-describedby={errors.categoryId ? 'error-categoryId' : undefined}
          aria-invalid={!!errors.categoryId}
          className={inputCls(!!errors.categoryId)}
        >
          <option value="">{t('seller.products.formFieldCategoryPlaceholder')}</option>
          {categories?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
    </div>
  )
}

function PricingSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('seller.products.formFieldPrice')} hint={t('seller.products.formFieldPriceHint')} error={errors.price} errorId="error-price">
          <input
            type="number"
            inputMode="numeric"
            value={form.price}
            onChange={e => updateField('price', e.target.value)}
            placeholder="0"
            aria-label={t('seller.products.formFieldPrice')}
            aria-describedby={errors.price ? 'error-price' : undefined}
            aria-invalid={!!errors.price}
            className={`${inputCls(!!errors.price)} tabular-nums`}
          />
        </Field>
        <Field label={t('seller.products.formFieldCompareAtPrice')} hint={t('seller.products.formFieldCompareAtPriceHint')} error={errors.compareAtPrice} errorId="error-compareAtPrice">
          <input
            type="number"
            inputMode="numeric"
            value={form.compareAtPrice}
            onChange={e => updateField('compareAtPrice', e.target.value)}
            placeholder="0"
            aria-label={t('seller.products.formFieldCompareAtPrice')}
            className={`${inputCls(!!errors.compareAtPrice)} tabular-nums`}
          />
        </Field>
      </div>
      <Field label={t('seller.products.formFieldStock')} hint={t('seller.products.formFieldStockHint')} error={errors.stockCount} errorId="error-stockCount">
        <input
          type="number"
          inputMode="numeric"
          value={form.stockCount}
          onChange={e => updateField('stockCount', e.target.value)}
          placeholder="0"
          aria-label={t('seller.products.formFieldStock')}
          aria-describedby={errors.stockCount ? 'error-stockCount' : undefined}
          aria-invalid={!!errors.stockCount}
          className={`${inputCls(!!errors.stockCount)} tabular-nums`}
        />
      </Field>
    </div>
  )
}

function DescriptionSection({ form, errors, updateField, t }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string) => void; t: any }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('seller.products.formFieldDescription')} hint={t('seller.products.formFieldDescriptionHint')} error={errors.description} errorId="error-description">
        <textarea
          value={form.description}
          onChange={e => updateField('description', e.target.value)}
          placeholder="Describe your product in detail..."
          rows={5}
          aria-label={t('seller.products.formFieldDescription')}
          aria-describedby={errors.description ? 'error-description' : undefined}
          aria-invalid={!!errors.description}
          className={`${inputCls(!!errors.description)} min-h-[120px] py-3 resize-y`}
        />
      </Field>
      <Field label={t('seller.products.formFieldSpecs')} hint={t('seller.products.formFieldSpecsHint')} error={errors.specs} errorId="error-specs">
        <textarea
          value={form.specs}
          onChange={e => updateField('specs', e.target.value)}
          placeholder="Material: Cotton, Dimensions: 30cm x 20cm..."
          rows={3}
          aria-label={t('seller.products.formFieldSpecs')}
          className={`${inputCls(!!errors.specs)} min-h-[80px] py-3 resize-y`}
        />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label={t('seller.products.formFieldWeight')}>
          <input
            type="number"
            inputMode="numeric"
            value={form.weight}
            onChange={e => updateField('weight', e.target.value)}
            placeholder="0"
            aria-label={t('seller.products.formFieldWeight')}
            className={`${inputCls()} tabular-nums`}
          />
        </Field>
        <Field label={t('seller.products.formFieldShippingWidth')}>
          <input
            type="number"
            inputMode="numeric"
            value={form.shippingWidth}
            onChange={e => updateField('shippingWidth', e.target.value)}
            placeholder="0"
            aria-label={t('seller.products.formFieldShippingWidth')}
            className={`${inputCls()} tabular-nums`}
          />
        </Field>
        <Field label={t('seller.products.formFieldShippingHeight')}>
          <input
            type="number"
            inputMode="numeric"
            value={form.shippingHeight}
            onChange={e => updateField('shippingHeight', e.target.value)}
            placeholder="0"
            aria-label={t('seller.products.formFieldShippingHeight')}
            className={`${inputCls()} tabular-nums`}
          />
        </Field>
        <Field label={t('seller.products.formFieldShippingLength')}>
          <input
            type="number"
            inputMode="numeric"
            value={form.shippingLength}
            onChange={e => updateField('shippingLength', e.target.value)}
            placeholder="0"
            aria-label={t('seller.products.formFieldShippingLength')}
            className={`${inputCls()} tabular-nums`}
          />
        </Field>
      </div>
    </div>
  )
}

// ---- Live preview ----

function PreviewCard({ product, t }: { product: Product; t: any }) {
  const hasData = product.name !== 'Product name' || product.price > 0 || product.images.length > 0
  if (!hasData) {
    return (
      <div className="bg-surface rounded-xl border border-border-light p-8 text-center">
        <p className="text-[13px] text-text-muted">{t('seller.products.formPreviewEmpty')}</p>
      </div>
    )
  }
  return (
    <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-sm">
      {/* Image */}
      <div className="relative aspect-square bg-border-light">
        {product.images.length > 0 ? (
          <SafeImage src={product.images[0].uri} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon size={40} className="text-text-tertiary" aria-hidden="true" />
          </div>
        )}
        {product.stock === 'out_of_stock' && (
          <div className="absolute inset-0 bg-text-muted/50 flex items-center justify-center">
            <span className="bg-text-muted text-white text-xs font-semibold px-3 py-1 rounded-full">
              {t('seller.products.stockOutOfStock')}
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-[14px] font-semibold text-text line-clamp-2">{product.name}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-bold text-text tabular-nums">{formatNPR(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-[12px] text-text-tertiary line-through tabular-nums">{formatNPR(product.compareAtPrice)}</span>
          )}
        </div>
        <p className="text-[12px] text-text-muted truncate">{product.sellerName}</p>
        {product.description && (
          <p className="text-[12px] text-text-muted line-clamp-2">{product.description}</p>
        )}
      </div>
    </div>
  )
}

// ---- Unsaved dialog ----

function UnsavedDialog({
  title,
  body,
  leaveLabel,
  stayLabel,
  ariaLabel,
  reduced,
  onLeave,
  onStay,
}: {
  title: string
  body: string
  leaveLabel: string
  stayLabel: string
  ariaLabel: string
  reduced: boolean
  onLeave: () => void
  onStay: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>('button')
    focusable[1]?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onStay(); return }
      if (e.key === 'Tab' && focusable.length > 0) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onStay])

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onStay}
      />
      <motion.div
        ref={ref}
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}
        className="relative bg-surface rounded-xl p-5 w-full max-w-[400px] shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-text mb-2">{title}</h2>
        <p className="text-[14px] text-text-muted leading-5 mb-5">{body}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="px-4 h-10 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            {stayLabel}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-4 h-10 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors"
          >
            {leaveLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
