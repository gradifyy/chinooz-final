'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, AlertCircle, Image as ImageIcon, Tag, DollarSign, FileText, Save, Plus, Trash2, ChevronLeft, ChevronRight, Star, Video } from 'lucide-react'
import { Container, Screen, SafeImage, useReducedMotion } from '@chinooz/ui-web'
import { useSellerCategories, useSellerProducts, useCategories } from '@chinooz/hooks'
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
import type { Product, Category } from '@chinooz/types'

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
  const { data: categoryTree } = useCategories()
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

  const updateField = useCallback((field: keyof FormState, value: string | string[] | VariantOption[] | VariantRow[] | SpecRow[]) => {
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
    images: debouncedForm.images.length > 0 ? [{ uri: debouncedForm.images[0], alt: debouncedForm.name }] : [],
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
                      <MediaSection form={form} errors={errors} updateField={updateField} t={t} reduced={reduced} />
                    )}
                    {s.key === 'details' && (
                      <DetailsSection form={form} errors={errors} updateField={updateField} t={t} categories={sellerCats} categoryTree={categoryTree} reduced={reduced} />
                    )}
                    {s.key === 'pricing' && (
                      <PricingSection form={form} errors={errors} updateField={updateField} t={t} reduced={reduced} />
                    )}
                    {s.key === 'description' && (
                      <DescriptionSection form={form} errors={errors} updateField={updateField} t={t} reduced={reduced} />
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
                <PreviewCard product={previewProduct} t={t} specRows={debouncedForm.specRows} />
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

const MAX_IMAGES = 8

interface MediaImage {
  id: string
  url: string
  uploading: boolean
  progress: number
}

function MediaSection({ form, errors, updateField, t, reduced }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | string[]) => void; t: any; reduced: boolean }) {
  const [mediaImages, setMediaImages] = useState<MediaImage[]>(
    form.images.map((url, i) => ({ id: `img-${i}-${Date.now()}`, url, uploading: false, progress: 100 }))
  )
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const dragCounter = useRef(0)

  // Sync mediaImages → form.images
  const syncToForm = useCallback((imgs: MediaImage[]) => {
    const urls = imgs.filter(i => !i.uploading).map(i => i.url)
    updateField('images', urls)
  }, [updateField])

  const addImage = (url: string) => {
    if (!url.trim()) return
    if (mediaImages.length >= MAX_IMAGES) return
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newImg: MediaImage = { id, url: url.trim(), uploading: true, progress: 0 }
    setMediaImages(prev => {
      const next = [...prev, newImg]
      return next
    })
    // Mock upload progress
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

  const handleDelete = (id: string) => {
    setMediaImages(prev => {
      const next = prev.filter(img => img.id !== id)
      syncToForm(next)
      return next
    })
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

  // Drag handlers
  const handleDragStart = (idx: number) => {
    setDragIndex(idx)
    dragCounter.current = 0
  }
  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setMediaImages(prev => {
        const next = [...prev]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(dragOverIndex, 0, moved)
        syncToForm(next)
        return next
      })
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIndex(idx)
  }

  const canAdd = mediaImages.length < MAX_IMAGES

  return (
    <div className="flex flex-col gap-4">
      <Field
        label={t('seller.products.formFieldImage')}
        hint={t('seller.products.formFieldImageHint')}
        error={errors.images}
        errorId="error-images"
      >
        {/* Thumbnail grid */}
        <div className="flex flex-wrap gap-3" role="group" aria-label={t('seller.products.formFieldImage')}>
          {mediaImages.map((img, idx) => {
            const isCover = idx === 0
            const isDragging = dragIndex === idx
            const isDragOver = dragOverIndex === idx && dragIndex !== idx
            return (
              <div
                key={img.id}
                draggable={!img.uploading}
                onDragStart={() => handleDragStart(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={handleDragEnd}
                className={`group relative w-24 h-24 rounded-lg border-2 overflow-hidden bg-background transition-all duration-200 ${
                  isDragging ? 'opacity-50 scale-105 shadow-lg z-10' : ''
                } ${
                  isDragOver && !reduced ? 'border-primary scale-105' : 'border-border'
                }`}
                aria-label={t('seller.products.mediaThumbAria', { n: idx + 1, cover: isCover ? `, ${t('seller.products.mediaCoverLabel')}` : '' })}
              >
                {/* Image */}
                {img.uploading && img.progress < 100 ? (
                  <div className="w-full h-full bg-shimmer flex items-center justify-center">
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-border">
                      <div
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${img.progress}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(img.progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={t('seller.products.mediaUploadProgress', { percent: Math.round(img.progress) })}
                      />
                    </div>
                  </div>
                ) : (
                  <SafeImage src={img.url} alt="" className="w-full h-full object-cover" />
                )}

                {/* Cover badge */}
                {isCover && !img.uploading && (
                  <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-full bg-primary text-white text-[12px] font-semibold px-1.5 py-0.5">
                    <Star size={10} fill="currentColor" aria-hidden="true" />
                    {t('seller.products.mediaCoverBadge')}
                  </span>
                )}

                {/* Hover actions */}
                {!img.uploading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-1">
                      {/* Keyboard move left */}
                      <button
                        type="button"
                        onClick={() => moveImage(img.id, -1)}
                        disabled={idx === 0}
                        aria-label={t('seller.products.mediaMoveLeftAria', { n: idx + 1 })}
                        className="w-7 h-7 rounded-md bg-white/90 text-text flex items-center justify-center hover:bg-white disabled:opacity-30 transition-opacity"
                      >
                        <ChevronLeft size={14} aria-hidden="true" />
                      </button>
                      {/* Set cover */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(img.id)}
                          aria-label={t('seller.products.mediaSetCoverAria', { n: idx + 1 })}
                          className="w-7 h-7 rounded-md bg-white/90 text-primary flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <Star size={14} aria-hidden="true" />
                        </button>
                      )}
                      {/* Keyboard move right */}
                      <button
                        type="button"
                        onClick={() => moveImage(img.id, 1)}
                        disabled={idx === mediaImages.length - 1}
                        aria-label={t('seller.products.mediaMoveRightAria', { n: idx + 1 })}
                        className="w-7 h-7 rounded-md bg-white/90 text-text flex items-center justify-center hover:bg-white disabled:opacity-30 transition-opacity"
                      >
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(img.id)}
                        aria-label={t('seller.products.mediaDeleteAria', { n: idx + 1 })}
                        className="w-7 h-7 rounded-md bg-white/90 text-error flex items-center justify-center hover:bg-white transition-colors"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Drag handle indicator */}
                {!img.uploading && (
                  <div
                    className="absolute bottom-1 right-1 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                    aria-hidden="true"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.2"/><circle cx="11" cy="3" r="1.2"/><circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/><circle cx="5" cy="13" r="1.2"/><circle cx="11" cy="13" r="1.2"/></svg>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add tile */}
          {canAdd && (
            <button
              type="button"
              onClick={handleAddFromUrl}
              disabled={!imageUrl.trim()}
              aria-label={t('seller.products.mediaAddTileAria')}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-background flex flex-col items-center justify-center gap-1 text-text-tertiary hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={24} aria-hidden="true" />
              <span className="text-[11px] font-medium">{t('seller.products.mediaAddTile')}</span>
            </button>
          )}
        </div>

        {/* URL input */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFromUrl() } }}
            placeholder={t('seller.products.formFieldImageUrl')}
            aria-label={t('seller.products.formFieldImageUrl')}
            className={inputCls(false)}
          />
          <button
            type="button"
            onClick={handleAddFromUrl}
            disabled={!imageUrl.trim()}
            className="h-10 px-3 rounded-md border border-border bg-surface text-[14px] font-semibold text-text hover:bg-background transition-colors disabled:opacity-50"
          >
            {t('seller.products.mediaAddTile')}
          </button>
        </div>

        {/* Drag hint */}
        {mediaImages.length > 1 && (
          <p className="text-[12px] text-text-muted mt-1">{t('seller.products.mediaDragHint')}</p>
        )}

        {/* Max count warning */}
        {mediaImages.length >= MAX_IMAGES && (
          <p className="text-[12px] text-warning">{t('seller.products.mediaMaxCount', { max: MAX_IMAGES })}</p>
        )}

        {/* Empty state */}
        {mediaImages.length === 0 && (
          <p className="text-[12px] text-text-muted mt-1">{t('seller.products.mediaEmpty')}</p>
        )}
      </Field>

      {/* Video URL */}
      <Field label={t('seller.products.formFieldVideoUrl')} hint={t('seller.products.formFieldVideoUrlHint')}>
        <div className="relative">
          <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input
            type="url"
            value={form.videoUrl}
            onChange={e => updateField('videoUrl', e.target.value)}
            placeholder="https://youtube.com/..."
            aria-label={t('seller.products.formFieldVideoUrl')}
            className={`${inputCls(false)} pl-10`}
          />
        </div>
      </Field>
    </div>
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
  const catRef = useRef<HTMLDivElement>(null)
  const flatCats = useMemo(() => flattenCategories(categoryTree), [categoryTree])
  const selectedPath = useMemo(() => findCategoryPath(categoryTree, form.categoryId), [categoryTree, form.categoryId])
  const pathString = selectedPath.map(c => c.name).join(' › ')

  const suggestedSku = useMemo(() => generateSkuFromName(form.name), [form.name])

  // Auto-suggest SKU when name changes (if user hasn't manually edited SKU)
  useEffect(() => {
    if (!skuEdited && form.name && !form.sku) {
      updateField('sku', suggestedSku)
    }
  }, [suggestedSku, skuEdited, form.name, form.sku, updateField])

  // Close cat picker on outside click
  useEffect(() => {
    if (!catPickerOpen) return
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [catPickerOpen])

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
    <div className="flex flex-col gap-4">
      {/* Product name */}
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

      {/* Brand */}
      <Field label={t('seller.products.formFieldBrand')} hint={t('seller.products.formFieldBrandHint')}>
        <input
          type="text"
          value={form.brand}
          onChange={e => updateField('brand', e.target.value)}
          placeholder="e.g. Samsung"
          aria-label={t('seller.products.formFieldBrand')}
          className={inputCls(false)}
        />
      </Field>

      {/* SKU + auto-suggest */}
      <Field label={t('seller.products.formFieldSku')} hint={t('seller.products.formFieldSkuHint')} error={errors.sku} errorId="error-sku">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={form.sku}
            onChange={e => { setSkuEdited(true); updateField('sku', e.target.value) }}
            placeholder="e.g. TOP-RED-STD"
            aria-label={t('seller.products.formFieldSku')}
            aria-describedby={errors.sku ? 'error-sku' : undefined}
            aria-invalid={!!errors.sku}
            className={`${inputCls(!!errors.sku)} font-mono flex-1`}
          />
          <button
            type="button"
            onClick={handleSkuAutoSuggest}
            aria-label={t('seller.products.formFieldSkuAutoSuggestBtnAria')}
            className="h-10 px-3 rounded-md border border-border bg-surface text-[13px] font-medium text-text-muted hover:bg-background hover:text-text transition-colors shrink-0"
          >
            {t('seller.products.formFieldSkuAutoSuggestBtn')}
          </button>
        </div>
        {suggestedSku && skuEdited && (
          <p className="text-[12px] text-text-muted mt-1">
            <button
              type="button"
              onClick={handleSkuAutoSuggest}
              className="text-primary hover:text-primary-dark underline"
              aria-label={t('seller.products.formFieldSkuAutoSuggestAria', { sku: suggestedSku })}
            >
              {t('seller.products.formFieldSkuAutoSuggest', { sku: suggestedSku })}
            </button>
          </p>
        )}
      </Field>

      {/* Category picker (searchable popover) */}
      <Field label={t('seller.products.formFieldCategory')} error={errors.categoryId} errorId="error-categoryId">
        <div ref={catRef} className="relative">
          <button
            type="button"
            onClick={() => { setCatPickerOpen(o => !o); setCatSearch('') }}
            aria-label={t('seller.products.formFieldCategory')}
            aria-describedby={errors.categoryId ? 'error-categoryId' : undefined}
            aria-expanded={catPickerOpen}
            aria-haspopup="listbox"
            className={`${inputCls(!!errors.categoryId)} text-left flex items-center justify-between`}
          >
            <span className={form.categoryId ? 'text-text' : 'text-text-tertiary'}>
              {pathString || t('seller.products.formFieldCategoryPlaceholder')}
            </span>
            <Tag size={15} className="text-text-muted ml-2 shrink-0" aria-hidden="true" />
          </button>
          {pathString && (
            <p
              className="text-[12px] text-text-muted mt-1"
              aria-label={t('seller.products.formFieldCategoryPathAria', { path: pathString })}
            >
              {t('seller.products.formFieldCategoryPath', { path: pathString })}
            </p>
          )}
          <AnimatePresence>
            {catPickerOpen && (
              <motion.div
                role="listbox"
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={reduced ? { duration: 0 } : { duration: 0.15 }}
                className="absolute z-dropdown mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-64 overflow-hidden flex flex-col"
              >
                <div className="p-2 border-b border-border-light">
                  <input
                    type="text"
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                    placeholder={t('seller.products.formFieldCategorySearch')}
                    aria-label={t('seller.products.formFieldCategorySearch')}
                    className="w-full h-8 px-2 rounded-md border border-border bg-background text-[13px] text-text outline-none focus:border-primary"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {filteredCats.map(c => {
                    const isSelected = form.categoryId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          updateField('categoryId', c.id)
                          setCatPickerOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-[14px] flex items-center justify-between transition-colors hover:bg-background ${
                          isSelected ? 'text-primary font-semibold' : 'text-text'
                        }`}
                        style={{ paddingLeft: `${12 + c.level * 16}px` }}
                      >
                        <span className="truncate">{c.level > 0 ? '› ' : ''}{c.name}</span>
                        {isSelected && <Check size={14} className="text-primary" aria-hidden="true" />}
                      </button>
                    )
                  })}
                  {filteredCats.length === 0 && (
                    <p className="px-3 py-4 text-[13px] text-text-muted text-center">No categories found</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Field>

      {/* Tags / keywords chip input */}
      <Field label={t('seller.products.formFieldTags')} hint={t('seller.products.formFieldTagsHint')}>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-2 min-h-[44px] focus-within:border-primary transition-colors">
          <AnimatePresence mode="popLayout">
            {form.tags.map(tag => (
              <motion.span
                key={tag}
                initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-[13px] font-medium pl-2.5 pr-1 py-0.5"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={t('seller.products.formFieldTagRemoveAria', { tag })}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/25 hover:bg-white/40 transition-colors"
                >
                  <span className="text-[10px]">✕</span>
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag() }
              if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
                handleRemoveTag(form.tags[form.tags.length - 1])
              }
            }}
            placeholder={form.tags.length === 0 ? t('seller.products.formFieldTagsPlaceholder') : ''}
            aria-label={t('seller.products.formFieldTagsAria')}
            className="flex-1 min-w-[100px] h-7 bg-transparent text-[14px] text-text outline-none placeholder:text-text-tertiary"
          />
        </div>
        {form.tags.length >= 10 && (
          <p className="text-[12px] text-warning mt-1">Maximum 10 tags</p>
        )}
      </Field>

      {/* Condition segmented control */}
      <Field label={t('seller.products.formFieldCondition')}>
        <div
          className="inline-flex bg-surface rounded-full h-10 p-1 border border-border-light"
          role="radiogroup"
          aria-label={t('seller.products.formFieldConditionAria')}
        >
          {(['new', 'used'] as const).map(c => {
            const active = form.condition === c
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => updateField('condition', c)}
                className={`relative flex items-center justify-center h-8 px-5 rounded-full text-[14px] font-semibold transition-colors ${
                  active ? 'text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="condition-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  />
                )}
                {t(`seller.products.formFieldCondition${c.charAt(0).toUpperCase() + c.slice(1)}`)}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Status / visibility segmented control */}
      <Field label={t('seller.products.formFieldStatus')}>
        <div
          className="inline-flex bg-surface rounded-full h-10 p-1 border border-border-light"
          role="radiogroup"
          aria-label={t('seller.products.formFieldStatusAria')}
        >
          {(['draft', 'active'] as const).map(s => {
            const active = form.status === s
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => updateField('status', s)}
                className={`relative flex items-center justify-center h-8 px-5 rounded-full text-[14px] font-semibold transition-colors ${
                  active ? 'text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="status-vis-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  />
                )}
                {t(`seller.products.formFieldStatus${s.charAt(0).toUpperCase() + s.slice(1)}`)}
              </button>
            )
          })}
        </div>
      </Field>
    </div>
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

function validateVariantRow(row: VariantRow): { compareAt?: string; negative?: string; empty?: string } {
  const errs: { compareAt?: string; negative?: string; empty?: string } = {}
  if (row.compareAtPrice && row.price) {
    if (Number(row.compareAtPrice) <= Number(row.price)) errs.compareAt = 'compareAt'
  }
  if (row.stock && Number(row.stock) < 0) errs.negative = 'negative'
  if (row.enabled && !row.price) errs.empty = 'empty'
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

  // Regenerate matrix when options change
  const regenerateMatrix = useCallback((opts: VariantOption[]) => {
    const matrix = generateVariantMatrix(opts)
    updateField('variants', matrix)
  }, [updateField])

  const addOption = () => {
    if (!newOptionName.trim()) return
    const opt: VariantOption = {
      id: `opt-${Date.now()}`,
      name: newOptionName.trim(),
      values: [],
    }
    const next = [...form.options, opt]
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
    const next = form.options.map(o => {
      if (o.id === optId) return { ...o, values: [...o.values, val] }
      return o
    })
    updateField('options', next)
    setOptionValueInput(prev => ({ ...prev, [optId]: '' }))
    regenerateMatrix(next)
  }

  const removeOptionValue = (optId: string, val: string) => {
    const next = form.options.map(o => {
      if (o.id === optId) return { ...o, values: o.values.filter(v => v !== val) }
      return o
    })
    updateField('options', next)
    regenerateMatrix(next)
  }

  const updateVariant = (id: string, field: keyof VariantRow, value: string | boolean) => {
    const next = form.variants.map(v => v.id === id ? { ...v, [field]: value } : v)
    updateField('variants', next)
  }

  const applyBulkPrice = () => {
    if (!bulkPrice) return
    const next = form.variants.map(v => ({ ...v, price: bulkPrice }))
    updateField('variants', next)
    setBulkPrice('')
  }

  const applyBulkStock = () => {
    if (!bulkStock) return
    const next = form.variants.map(v => ({ ...v, stock: bulkStock }))
    updateField('variants', next)
    setBulkStock('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Single-variant pricing (when no options) */}
      {!hasOptions && (
        <>
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
              {priceNum > 0 && (
                <p className="text-[12px] text-text-muted mt-1 tabular-nums">{t('seller.products.vatInclusive')} · NPR {vatAmt.toLocaleString('en-IN')}</p>
              )}
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
          <div className="grid sm:grid-cols-2 gap-4">
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
            <Field label={t('seller.products.formFieldCostPrice')} hint={t('seller.products.formFieldCostPriceHint')}>
              <input
                type="number"
                inputMode="numeric"
                value={form.costPrice}
                onChange={e => updateField('costPrice', e.target.value)}
                placeholder="0"
                aria-label={t('seller.products.formFieldCostPrice')}
                className={`${inputCls()} tabular-nums`}
              />
            </Field>
          </div>
          {/* Margin hint */}
          {margin !== null && (
            <p className={`text-[12px] font-medium ${margin < 0 ? 'text-error' : margin < 20 ? 'text-warning' : 'text-success'}`}>
              {margin < 0
                ? t('seller.products.marginNegative', { percent: Math.abs(margin) })
                : margin < 20
                ? t('seller.products.marginThin', { percent: margin })
                : t('seller.products.marginHealthy', { percent: margin })}
            </p>
          )}
          <p className="text-[12px] text-text-muted bg-primary-50/50 rounded-md px-3 py-2">
            {t('seller.products.variantsSingleMode')}
          </p>
        </>
      )}

      {/* Option builder */}
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-[14px] font-semibold text-text">{t('seller.products.variantsTitle')}</h4>
          <p className="text-[12px] text-text-muted mt-0.5">{t('seller.products.variantsSubtitle')}</p>
        </div>

        {/* Existing options */}
        {form.options.map(opt => (
          <div key={opt.id} className="rounded-md border border-border-light bg-surface p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-semibold text-text">{opt.name}</span>
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                aria-label={t('seller.products.variantsRemoveOptionAria', { name: opt.name })}
                className="text-[12px] text-error hover:underline"
              >
                {t('seller.products.variantsRemoveOption')}
              </button>
            </div>
            {/* Value chips */}
            <div className="flex flex-wrap items-center gap-2">
              <AnimatePresence mode="popLayout">
                {opt.values.map(val => (
                  <motion.span
                    key={val}
                    initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary text-[13px] font-medium pl-2.5 pr-1 py-0.5"
                  >
                    {val}
                    <button
                      type="button"
                      onClick={() => removeOptionValue(opt.id, val)}
                      aria-label={t('seller.products.variantsRemoveOptionAria', { name: val })}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <span className="text-[10px]">✕</span>
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <input
                type="text"
                value={optionValueInput[opt.id] || ''}
                onChange={e => setOptionValueInput(prev => ({ ...prev, [opt.id]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addOptionValue(opt.id) }
                }}
                placeholder={t('seller.products.variantsOptionValuesPlaceholder')}
                aria-label={`${opt.name} ${t('seller.products.variantsOptionValues')}`}
                className="h-7 min-w-[80px] flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-tertiary"
              />
            </div>
          </div>
        ))}

        {/* Add option */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newOptionName}
            onChange={e => setNewOptionName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
            placeholder={t('seller.products.variantsOptionNamePlaceholder')}
            aria-label={t('seller.products.variantsOptionName')}
            className={`${inputCls(false)} flex-1`}
          />
          <button
            type="button"
            onClick={addOption}
            disabled={!newOptionName.trim()}
            aria-label={t('seller.products.variantsAddOptionAria')}
            className="h-10 px-3 rounded-md border border-border bg-surface text-[13px] font-medium text-text-muted hover:bg-background hover:text-text transition-colors disabled:opacity-50"
          >
            + {t('seller.products.variantsAddOption')}
          </button>
        </div>
      </div>

      {/* Variant matrix (table) */}
      {hasOptions && variants.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-[14px] font-semibold text-text">{t('seller.products.variantsMatrixTitle')}</h4>

          {/* Bulk-edit row */}
          <div className="flex items-center gap-2 rounded-md border border-border-light bg-background px-3 py-2">
            <span className="text-[12px] font-semibold text-text-muted shrink-0">{t('seller.products.variantsBulkApply')}:</span>
            <input
              type="number"
              inputMode="numeric"
              value={bulkPrice}
              onChange={e => setBulkPrice(e.target.value)}
              placeholder={t('seller.products.variantsColPrice')}
              aria-label={t('seller.products.variantsBulkPriceAria')}
              className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-[13px] text-text tabular-nums outline-none focus:border-primary"
            />
            <button type="button" onClick={applyBulkPrice} disabled={!bulkPrice} className="h-8 px-2 rounded-md bg-primary text-white text-[12px] font-semibold disabled:opacity-50">
              {t('seller.products.variantsBulkApplyBtn')}
            </button>
            <span className="w-px h-6 bg-border" />
            <input
              type="number"
              inputMode="numeric"
              value={bulkStock}
              onChange={e => setBulkStock(e.target.value)}
              placeholder={t('seller.products.variantsColStock')}
              aria-label={t('seller.products.variantsBulkStockAria')}
              className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-[13px] text-text tabular-nums outline-none focus:border-primary"
            />
            <button type="button" onClick={applyBulkStock} disabled={!bulkStock} className="h-8 px-2 rounded-md bg-primary text-white text-[12px] font-semibold disabled:opacity-50">
              {t('seller.products.variantsBulkApplyBtn')}
            </button>
          </div>

          {/* Table */}
          <div className="border border-border-light rounded-md overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-background sticky top-0">
                  <th scope="col" className="px-3 py-2 text-left text-[12px] font-semibold text-text-muted uppercase">{t('seller.products.variantsColVariant')}</th>
                  <th scope="col" className="px-3 py-2 text-left text-[12px] font-semibold text-text-muted uppercase">{t('seller.products.variantsColSku')}</th>
                  <th scope="col" className="px-3 py-2 text-right text-[12px] font-semibold text-text-muted uppercase">{t('seller.products.variantsColPrice')}</th>
                  <th scope="col" className="px-3 py-2 text-right text-[12px] font-semibold text-text-muted uppercase">{t('seller.products.variantsColCompareAt')}</th>
                  <th scope="col" className="px-3 py-2 text-right text-[12px] font-semibold text-text-muted uppercase">{t('seller.products.variantsColStock')}</th>
                  <th scope="col" className="px-3 py-2 text-center text-[12px] font-semibold text-text-muted uppercase">{t('seller.products.variantsColEnabled')}</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {variants.map(v => {
                    const vErrs = validateVariantRow(v)
                    return (
                      <motion.tr
                        key={v.id}
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-3 py-2.5">
                          <span className="text-[14px] font-medium text-text">{v.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={e => updateVariant(v.id, 'sku', e.target.value)}
                            placeholder="—"
                            aria-label={t('seller.products.variantsSkuAria', { label: v.label })}
                            className="w-full h-8 px-2 rounded-md border border-border bg-surface text-[13px] font-mono text-text outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={v.price}
                            onChange={e => updateVariant(v.id, 'price', e.target.value)}
                            placeholder="0"
                            aria-label={t('seller.products.variantsPriceAria', { label: v.label })}
                            aria-invalid={!!vErrs.empty}
                            className="w-24 h-8 px-2 rounded-md border border-border bg-surface text-[13px] text-text tabular-nums outline-none focus:border-primary text-right"
                          />
                          {v.price && Number(v.price) > 0 && (
                            <p className="text-[10px] text-text-muted mt-0.5 tabular-nums">{t('seller.products.vatInclusive')}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={v.compareAtPrice}
                            onChange={e => updateVariant(v.id, 'compareAtPrice', e.target.value)}
                            placeholder="0"
                            aria-label={t('seller.products.variantsCompareAtAria', { label: v.label })}
                            aria-invalid={!!vErrs.compareAt}
                            className="w-24 h-8 px-2 rounded-md border border-border bg-surface text-[13px] text-text tabular-nums outline-none focus:border-primary text-right"
                          />
                          {vErrs.compareAt && (
                            <p className="text-[10px] text-error mt-0.5">{t('seller.products.variantsErrorCompareAt')}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={v.stock}
                            onChange={e => updateVariant(v.id, 'stock', e.target.value)}
                            placeholder="0"
                            aria-label={t('seller.products.variantsStockAria', { label: v.label })}
                            aria-invalid={!!vErrs.negative}
                            className="w-20 h-8 px-2 rounded-md border border-border bg-surface text-[13px] text-text tabular-nums outline-none focus:border-primary text-right"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={v.enabled}
                            aria-label={t('seller.products.variantsEnableAria', { label: v.label })}
                            onClick={() => updateVariant(v.id, 'enabled', !v.enabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.enabled ? 'bg-primary' : 'bg-border'}`}
                          >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${v.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No variants state */}
      {hasOptions && variants.length === 0 && (
        <p className="text-[12px] text-text-muted bg-background rounded-md px-3 py-3 text-center">
          {t('seller.products.variantsNoOptions')}
        </p>
      )}
    </div>
  )
}

// Category-suggested specs
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
  // Check direct match then parent
  if (CATEGORY_SPECS[categoryId]) return CATEGORY_SPECS[categoryId]
  // Check if it's a child of a known parent
  for (const key of Object.keys(CATEGORY_SPECS)) {
    if (categoryId.startsWith(key.replace('cat-', 'cat-').slice(0, 8))) return CATEGORY_SPECS[key]
  }
  return []
}

function DescriptionSection({ form, errors, updateField, t, reduced }: { form: FormState; errors: Record<string, string>; updateField: (f: keyof FormState, v: string | string[] | VariantOption[] | VariantRow[] | SpecRow[]) => void; t: any; reduced: boolean }) {
  const [descLang, setDescLang] = useState<'en' | 'ne'>('en')
  const [specsPrefilled, setSpecsPrefilled] = useState(false)

  // Prefill specs from category
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
    const row: SpecRow = { id: `spec-${Date.now()}`, key: '', value: '' }
    updateField('specRows', [...form.specRows, row])
  }

  const updateSpecRow = (id: string, field: 'key' | 'value', value: string) => {
    updateField('specRows', form.specRows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const removeSpecRow = (id: string) => {
    updateField('specRows', form.specRows.filter(r => r.id !== id))
  }

  // Rich-text toolbar helpers (simple markdown insertion)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const insertMarkdown = (before: string, after: string = '') => {
    const el = descRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = descLang === 'en' ? form.description : form.descriptionNe
    const selected = text.slice(start, end)
    const newText = text.slice(0, start) + before + selected + after + text.slice(end)
    if (descLang === 'en') {
      updateField('description', newText)
    } else {
      updateField('descriptionNe', newText)
    }
    // Restore cursor
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const descValue = descLang === 'en' ? form.description : form.descriptionNe
  const setDescValue = (v: string) => {
    if (descLang === 'en') updateField('description', v)
    else updateField('descriptionNe', v)
  }

  const toolbarBtns = [
    { key: 'bold', label: t('seller.products.editorBold'), aria: t('seller.products.editorBoldAria'), icon: 'B', action: () => insertMarkdown('**', '**') },
    { key: 'italic', label: t('seller.products.editorItalic'), aria: t('seller.products.editorItalicAria'), icon: 'I', action: () => insertMarkdown('*', '*') },
    { key: 'heading', label: t('seller.products.editorHeading'), aria: t('seller.products.editorHeadingAria'), icon: 'H', action: () => insertMarkdown('## ') },
    { key: 'bullet', label: t('seller.products.editorBulletList'), aria: t('seller.products.editorBulletListAria'), icon: '•', action: () => insertMarkdown('- ') },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Description with bilingual toggle + toolbar */}
      <Field
        label={descLang === 'en' ? t('seller.products.formFieldDescription') : t('seller.products.formFieldDescriptionNe')}
        hint={descLang === 'en' ? t('seller.products.formFieldDescriptionHint') : t('seller.products.formFieldDescriptionNeHint')}
        error={errors.description}
        errorId="error-description"
      >
        {/* Language toggle */}
        <div
          className="inline-flex bg-surface rounded-full h-8 p-0.5 border border-border-light mb-2"
          role="tablist"
          aria-label={t('seller.products.formFieldLangToggleAria')}
        >
          {(['en', 'ne'] as const).map(lang => {
            const active = descLang === lang
            return (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDescLang(lang)}
                className={`relative flex items-center justify-center h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${
                  active ? 'text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="desc-lang-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  />
                )}
                {lang === 'en' ? t('seller.products.formFieldLangEn') : t('seller.products.formFieldLangNe')}
              </button>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 rounded-t-md border border-border border-b-0 bg-surface px-2 py-1.5">
          {toolbarBtns.map(btn => (
            <button
              key={btn.key}
              type="button"
              onClick={btn.action}
              aria-label={btn.aria}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[14px] font-bold text-text-muted hover:bg-primary-50 hover:text-primary transition-colors"
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Editor */}
        <textarea
          ref={descRef}
          value={descValue}
          onChange={e => setDescValue(e.target.value)}
          placeholder={descLang === 'en' ? 'Describe your product in detail...' : 'उत्पादन विस्तृत वर्णन गर्नुहोस्...'}
          rows={6}
          aria-label={descLang === 'en' ? t('seller.products.formFieldDescription') : t('seller.products.formFieldDescriptionNe')}
          aria-describedby={errors.description ? 'error-description' : undefined}
          aria-invalid={!!errors.description}
          className="w-full min-h-[140px] px-3 py-3 rounded-b-md border border-border bg-surface text-[14px] text-text outline-none focus:border-primary transition-colors resize-y placeholder:text-text-tertiary"
        />
      </Field>

      {/* Specs as key-value rows */}
      <Field label={t('seller.products.formFieldSpecs')} hint={t('seller.products.formFieldSpecsHint')}>
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {form.specRows.map(row => (
              <motion.div
                key={row.id}
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={row.key}
                  onChange={e => updateSpecRow(row.id, 'key', e.target.value)}
                  placeholder={t('seller.products.formFieldSpecsKeyPlaceholder')}
                  aria-label={`${t('seller.products.formFieldSpecsKey')} — ${row.key || t('seller.products.formFieldSpecsKeyPlaceholder')}`}
                  className={`${inputCls(false)} flex-1`}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={e => updateSpecRow(row.id, 'value', e.target.value)}
                  placeholder={t('seller.products.formFieldSpecsValuePlaceholder')}
                  aria-label={`${t('seller.products.formFieldSpecsValue')} — ${row.key || t('seller.products.formFieldSpecsKeyPlaceholder')}`}
                  className={`${inputCls(false)} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(row.id)}
                  aria-label={t('seller.products.formFieldSpecsRemoveAria', { key: row.key || t('seller.products.formFieldSpecsKeyPlaceholder') })}
                  className="w-9 h-9 rounded-md border border-border bg-surface text-text-muted hover:text-error hover:border-error/30 transition-colors shrink-0"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add spec row */}
          <button
            type="button"
            onClick={addSpecRow}
            aria-label={t('seller.products.formFieldSpecsAddAria')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-border bg-background text-[13px] font-medium text-text-muted hover:border-primary hover:text-primary transition-colors self-start"
          >
            + {t('seller.products.formFieldSpecsAdd')}
          </button>

          {form.specRows.length === 0 && (
            <p className="text-[12px] text-text-muted">{t('seller.products.formFieldSpecsEmpty')}</p>
          )}
          {specsPrefilled && form.specRows.length > 0 && (
            <p className="text-[12px] text-success">{t('seller.products.formFieldSpecsPrefilled')}</p>
          )}
        </div>
      </Field>

      {/* Shipping: weight + dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label={t('seller.products.formFieldWeight')}>
          <input
            type="number"
            inputMode="numeric"
            value={form.weight}
            onChange={e => updateField('weight', e.target.value)}
            placeholder="0"
            aria-label={`${t('seller.products.formFieldWeight')} (grams)`}
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
            aria-label={`${t('seller.products.formFieldShippingWidth')} (cm)`}
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
            aria-label={`${t('seller.products.formFieldShippingHeight')} (cm)`}
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
            aria-label={`${t('seller.products.formFieldShippingLength')} (cm)`}
            className={`${inputCls()} tabular-nums`}
          />
        </Field>
      </div>

      {/* Handling time + return policy */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('seller.products.formFieldHandlingTime')} hint={t('seller.products.formFieldHandlingTimeHint')}>
          <select
            value={form.handlingTime}
            onChange={e => updateField('handlingTime', e.target.value)}
            aria-label={t('seller.products.formFieldHandlingTime')}
            className={inputCls()}
          >
            <option value="1">{t('seller.products.formFieldHandlingTime1d')}</option>
            <option value="1-2">{t('seller.products.formFieldHandlingTime2d')}</option>
            <option value="2-3">{t('seller.products.formFieldHandlingTime3d')}</option>
            <option value="7">{t('seller.products.formFieldHandlingTime7d')}</option>
          </select>
        </Field>
        <Field label={t('seller.products.formFieldReturnPolicy')} hint={t('seller.products.formFieldReturnPolicyHint')}>
          <select
            value={form.returnPolicy}
            onChange={e => updateField('returnPolicy', e.target.value)}
            aria-label={t('seller.products.formFieldReturnPolicy')}
            className={inputCls()}
          >
            <option value="accept">{t('seller.products.formFieldReturnPolicyAccept')}</option>
            <option value="accept14">{t('seller.products.formFieldReturnPolicyAccept14')}</option>
            <option value="no_return">{t('seller.products.formFieldReturnPolicyNoReturn')}</option>
          </select>
        </Field>
      </div>

      {/* Pickup location */}
      <Field label={t('seller.products.formFieldPickupLocation')} hint={t('seller.products.formFieldPickupLocationHint')}>
        <input
          type="text"
          value={form.pickupLocation}
          onChange={e => updateField('pickupLocation', e.target.value)}
          placeholder={t('seller.products.formFieldPickupLocationPlaceholder')}
          aria-label={t('seller.products.formFieldPickupLocation')}
          className={inputCls()}
        />
      </Field>
    </div>
  )
}

// ---- Live preview ----

function PreviewCard({ product, t, specRows }: { product: Product; t: any; specRows?: SpecRow[] }) {
  const hasData = product.name !== 'Product name' || product.price > 0 || product.images.length > 0
  if (!hasData) {
    return (
      <div className="bg-surface rounded-xl border border-border-light p-8 text-center">
        <p className="text-[13px] text-text-muted">{t('seller.products.formPreviewEmpty')}</p>
      </div>
    )
  }
  const hasSpecs = specRows && specRows.some(r => r.key && r.value)
  return (
    <div className="bg-surface rounded-xl border border-border-light overflow-hidden shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* PD3: Gallery / cover image */}
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
      {/* PD3: Product info */}
      <div className="p-4 space-y-2">
        <p className="text-[16px] font-semibold text-text">{product.name}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[18px] font-bold text-text tabular-nums">{formatNPR(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-[13px] text-text-tertiary line-through tabular-nums">{formatNPR(product.compareAtPrice)}</span>
          )}
        </div>
        {product.price > 0 && (
          <p className="text-[11px] text-text-muted tabular-nums">{t('seller.products.vatInclusive')}</p>
        )}
        <p className="text-[12px] text-text-muted truncate">{product.sellerName}</p>
        {/* Description preview */}
        {product.description && (
          <div className="pt-2 border-t border-border-light">
            <p className="text-[12px] text-text-muted line-clamp-3">{product.description.replace(/[#*-]/g, '')}</p>
          </div>
        )}
      </div>
      {/* PD6: Specs table */}
      {hasSpecs && (
        <div className="px-4 pb-4 border-t border-border-light pt-3">
          <p className="text-[12px] font-semibold text-text-muted uppercase mb-2">{t('seller.products.formFieldSpecs')}</p>
          <dl className="space-y-1.5">
            {specRows!.filter(r => r.key && r.value).map(r => (
              <div key={r.id} className="flex items-baseline gap-2">
                <dt className="text-[13px] font-medium text-text-secondary shrink-0">{r.key}</dt>
                <dd className="text-[13px] text-text-muted flex-1">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
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
