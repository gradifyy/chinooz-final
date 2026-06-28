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

  const updateField = useCallback((field: keyof FormState, value: string | string[]) => {
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
