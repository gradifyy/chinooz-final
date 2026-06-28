'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, X, Loader, ChevronDown, ImageIcon } from 'lucide-react'
import { storeSetupSchema } from '@chinooz/validation'
import { checkHandleAvailability, getCategories } from '@chinooz/mock-data'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import WizardStepper from './WizardStepper'
import StorefrontPreview from './StorefrontPreview'
import LanguageToggle from './LanguageToggle'
import type { Category } from '@chinooz/types'

export default function StoreStepClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const updateDraft = useSellerSessionStore(s => s.updateDraft)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [categories, setCategories] = useState<Pick<Category, 'id' | 'name' | 'slug'>[]>([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      return
    }

    if (handleStatus === 'taken') {
      setErrors({ handle: t('seller.setup.handleTaken') })
      return
    }

    updateDraft({ setupStep: 1 })
    router.push('/setup-business')
  }, [draft, handleStatus, updateDraft, router, t])

  const selectedCategory = categories.find(c => c.id === draft.categoryId)

  const steps = [
    { key: 'store', label: t('seller.setup.stepStore') },
    { key: 'business', label: t('seller.setup.stepBusiness') },
    { key: 'bank', label: t('seller.setup.stepBank') },
    { key: 'review', label: t('seller.setup.stepReview') },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10">
        <LanguageToggle />
      </div>

      <div className="flex-1 max-w-[600px] mx-auto w-full px-6">
        <WizardStepper steps={steps} current={0} />

        <div className="pt-4 pb-3">
          <h1 className="text-[22px] font-bold text-text tracking-tight mb-1">
            {t('seller.setup.storeTitle')}
          </h1>
          <p className="text-sm text-text-muted">{t('seller.setup.storeSubtitle')}</p>
        </div>

        <motion.div
          animate={Object.keys(errors).length > 0 && !reduced ? { x: [0, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <Field label={t('seller.setup.storeNameLabel')} error={errors.storeName}>
            <input
              className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
              value={draft.storeName}
              onChange={e => updateField('storeName', e.target.value)}
              placeholder={t('seller.setup.storeNamePlaceholder')}
              aria-label={t('seller.setup.storeNameLabel')}
            />
            <p className="text-xs text-text-muted">{t('seller.setup.storeNameHelper')}</p>
          </Field>

          <Field label={t('seller.setup.handleLabel')} error={errors.handle}>
            <div className="flex items-center h-12 px-3 rounded-md border-[1.5px] border-border bg-surface">
              <span className="text-[13px] font-medium text-text-muted mr-2">chinooz.com/store/</span>
              <input
                className="flex-1 h-full bg-transparent outline-none text-[15px] text-text placeholder:text-text-tertiary"
                value={draft.handle}
                onChange={e => updateField('handle', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={t('seller.setup.handlePlaceholder')}
                aria-label={t('seller.setup.handleLabel')}
              />
              {handleStatus === 'checking' && <Loader size={16} className="text-text-muted animate-spin" />}
              {handleStatus === 'available' && <Check size={16} className="text-success" />}
              {handleStatus === 'taken' && <X size={16} className="text-error" />}
            </div>
            <p className="text-xs text-text-muted">{t('seller.setup.handleHelper')}</p>
            <AnimatePresence>
              {handleStatus === 'available' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold text-success"
                  aria-label={t('seller.setup.handleAvailableAria')}
                >
                  {t('seller.setup.handleAvailable')}
                </motion.p>
              )}
              {handleStatus === 'taken' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold text-error"
                  aria-label={t('seller.setup.handleTakenAria')}
                >
                  {t('seller.setup.handleTaken')}
                </motion.p>
              )}
              {handleStatus === 'checking' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-medium text-text-muted"
                >
                  {t('seller.setup.handleChecking')}
                </motion.p>
              )}
            </AnimatePresence>
          </Field>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text">{t('seller.setup.logoLabel')}</label>
              <button
                className="w-24 h-24 rounded-lg border-[1.5px] border-border bg-surface flex items-center justify-center overflow-hidden"
                aria-label={t('seller.setup.logoUploadAria')}
              >
                {draft.logoUrl ? (
                  <img src={draft.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-text-tertiary" />
                )}
              </button>
              <p className="text-xs text-text-muted">{t('seller.setup.logoHelper')}</p>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text">{t('seller.setup.bannerLabel')}</label>
              <button
                className="w-full h-[72px] rounded-lg border-[1.5px] border-border bg-surface flex items-center justify-center overflow-hidden"
                aria-label={t('seller.setup.bannerUploadAria')}
              >
                {draft.bannerUrl ? (
                  <img src={draft.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-text-tertiary" />
                )}
              </button>
              <p className="text-xs text-text-muted">{t('seller.setup.bannerHelper')}</p>
            </div>
          </div>

          <Field label={t('seller.setup.descLabel')}>
            <textarea
              className="w-full h-20 px-3 py-2.5 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary resize-none"
              value={draft.description}
              onChange={e => updateField('description', e.target.value.slice(0, 200))}
              placeholder={t('seller.setup.descPlaceholder')}
              aria-label={t('seller.setup.descLabel')}
            />
            <p className="text-xs text-text-muted">
              {t('seller.setup.descHelper', { count: draft.description.length })}
            </p>
          </Field>

          <Field label={t('seller.setup.categoryLabel')} error={errors.categoryId}>
            <button
              className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface flex items-center justify-between text-[15px] text-text"
              onClick={() => setCategoryOpen(!categoryOpen)}
              aria-label={t('seller.setup.categoryLabel')}
            >
              <span className={!selectedCategory ? 'text-text-tertiary' : ''}>
                {selectedCategory ? selectedCategory.name : t('seller.setup.categoryPlaceholder')}
              </span>
              <ChevronDown size={18} className="text-text-muted" />
            </button>
            <AnimatePresence>
              {categoryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1 bg-surface rounded-md border border-border overflow-hidden"
                >
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-text border-b border-border-light last:border-0 hover:bg-background transition-colors"
                      onClick={() => {
                        updateField('categoryId', cat.id)
                        setCategoryOpen(false)
                      }}
                    >
                      {cat.name}
                      {cat.id === draft.categoryId && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-xs text-text-muted">{t('seller.setup.categoryHelper')}</p>
          </Field>

          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold text-text">{t('seller.setup.addressLabel')}</span>
            <Field label={t('seller.setup.addressStreet')} error={errors.pickupStreet}>
              <input
                className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
                value={draft.pickupStreet}
                onChange={e => updateField('pickupStreet', e.target.value)}
                placeholder={t('seller.setup.addressStreet')}
                aria-label={t('seller.setup.addressStreet')}
              />
            </Field>
            <Field label={t('seller.setup.addressArea')} error={errors.pickupArea}>
              <input
                className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
                value={draft.pickupArea}
                onChange={e => updateField('pickupArea', e.target.value)}
                placeholder={t('seller.setup.addressArea')}
                aria-label={t('seller.setup.addressArea')}
              />
            </Field>
            <div className="flex gap-3">
              <Field label={t('seller.setup.addressCity')} error={errors.pickupCity}>
                <input
                  className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
                  value={draft.pickupCity}
                  onChange={e => updateField('pickupCity', e.target.value)}
                  placeholder={t('seller.setup.addressCity')}
                  aria-label={t('seller.setup.addressCity')}
                />
              </Field>
              <Field label={t('seller.setup.addressPhone')} error={errors.pickupPhone}>
                <input
                  className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary"
                  value={draft.pickupPhone}
                  onChange={e => updateField('pickupPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98XXXXXXXX"
                  aria-label={t('seller.setup.addressPhone')}
                />
              </Field>
            </div>
          </div>

          <div className="mt-2">
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
          </div>
        </motion.div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border-light px-6 py-3">
        <div className="max-w-[600px] mx-auto flex gap-2">
          <button
            onClick={() => router.back()}
            className="h-11 px-6 rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors"
          >
            {t('seller.setup.back')}
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 h-[52px] rounded-md bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors"
          >
            {t('seller.setup.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-error" role="alert">{error}</p>
      )}
    </div>
  )
}
