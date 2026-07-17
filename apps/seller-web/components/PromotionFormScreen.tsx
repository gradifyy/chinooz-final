'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Tag,
  Target,
  Calendar,
  Save,
  Percent,
  DollarSign,
  Zap,
  Gift,
  Truck,
  RefreshCw,
  ShoppingCart,
  X,
} from 'lucide-react'
import { Container, Screen, useReducedMotion } from '@chinooz/ui-web'
import { useLocale } from '@chinooz/hooks'
import { formatAmount as formatNPR } from '@chinooz/utils'
import { analytics } from '@chinooz/analytics'
import {
  promotionFormSchema,
  promotionTypeValueSectionSchema,
  promotionTargetsSectionSchema,
  promotionScheduleSectionSchema,
} from '@chinooz/validation'
import {
  getPromotionById,
  createPromotion,
  updatePromotion,
  PROMOTION_TYPES,
  type Promotion,
  type PromotionType,
  type PromotionScope,
} from '@chinooz/mock-data'

type SectionKey = 'typeValue' | 'targets' | 'schedule'

interface FormState {
  name: string
  type: PromotionType
  discountValue: string
  code: string
  isCoupon: boolean
  scope: PromotionScope
  scopeLabel: string
  startsAt: string
  endsAt: string
  budget: string
  status: 'active' | 'scheduled' | 'expired' | 'draft'
  bogoBuyQty: string
  bogoGetQty: string
  minOrderValue: string
  minQty: string
  firstOrderOnly: boolean
  perCustomerLimit: string
  combinable: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'percentage',
  discountValue: '',
  code: '',
  isCoupon: false,
  scope: 'all',
  scopeLabel: '',
  startsAt: '',
  endsAt: '',
  budget: '',
  status: 'draft',
  bogoBuyQty: '2',
  bogoGetQty: '1',
  minOrderValue: '',
  minQty: '',
  firstOrderOnly: false,
  perCustomerLimit: '',
  combinable: false,
}

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const TYPE_ICONS: Record<PromotionType, React.ReactNode> = {
  percentage: <Percent size={16} aria-hidden="true" />,
  fixed: <DollarSign size={16} aria-hidden="true" />,
  flash_sale: <Zap size={16} aria-hidden="true" />,
  bogo: <Gift size={16} aria-hidden="true" />,
  free_shipping: <Truck size={16} aria-hidden="true" />,
}

const SECTION_ICONS: Record<SectionKey, React.ReactNode> = {
  typeValue: <Tag size={18} aria-hidden="true" />,
  targets: <Target size={18} aria-hidden="true" />,
  schedule: <Calendar size={18} aria-hidden="true" />,
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function getTimeRemaining(target: string): {
  total: number
  days: number
  hours: number
  minutes: number
  seconds: number
} {
  const total = Math.max(0, new Date(target).getTime() - Date.now())
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  return { total, days, hours, minutes, seconds }
}

function countdownStr(r: ReturnType<typeof getTimeRemaining>): string {
  if (r.days > 0) return `${r.days}d ${pad(r.hours)}h ${pad(r.minutes)}m`
  return `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
}

export default function PromotionFormScreen() {
  const { t } = useTranslation()
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const reduced = useReducedMotion()

  const editId = params?.id as string | undefined
  const isEdit = !!editId

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showUnsaved, setShowUnsaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    typeValue: null,
    targets: null,
    schedule: null,
  })
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: existingPromo, isLoading: isLoadingPromo } = useQuery({
    queryKey: ['promotion', editId],
    queryFn: () => (editId ? getPromotionById(editId) : Promise.resolve(null)),
    enabled: !!editId,
    retry: false,
  })

  useEffect(() => {
    if (isEdit && !isLoadingPromo && !existingPromo) {
      setNotFound(true)
    }
  }, [isEdit, isLoadingPromo, existingPromo])

  useEffect(() => {
    analytics.screen({ name: isEdit ? 'seller-promotion-edit' : 'seller-promotion-new' })
  }, [isEdit])

  useEffect(() => {
    if (!isEdit || !existingPromo) return
    const loaded: FormState = {
      name: existingPromo.name,
      type: existingPromo.type,
      discountValue: String(existingPromo.discountValue),
      code: existingPromo.code,
      isCoupon: existingPromo.isCoupon,
      scope: existingPromo.scope,
      scopeLabel: existingPromo.scopeLabel ?? '',
      startsAt: existingPromo.startsAt.slice(0, 10),
      endsAt: existingPromo.endsAt.slice(0, 10),
      budget: existingPromo.budget ? String(existingPromo.budget) : '',
      status: existingPromo.status,
      bogoBuyQty: '2',
      bogoGetQty: '1',
      minOrderValue: '',
      minQty: '',
      firstOrderOnly: false,
      perCustomerLimit: '',
      combinable: false,
    }
    setForm(loaded)
    setInitialForm(loaded)
  }, [isEdit, existingPromo])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  )

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

  useEffect(() => {
    return () => {
      if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    }
  }, [])

  const showSnackbar = useCallback((msg: string) => {
    setSnackbar(msg)
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => setSnackbar(null), 3000)
  }, [])

  const updateField = useCallback((field: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const parseData = useMemo(
    () => ({
      ...form,
      discountValue: form.discountValue ? Number(form.discountValue) : 0,
      budget: form.budget ? Number(form.budget) : undefined,
      productsCount: 0,
      bogoBuyQty: form.bogoBuyQty ? Number(form.bogoBuyQty) : undefined,
      bogoGetQty: form.bogoGetQty ? Number(form.bogoGetQty) : undefined,
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
      minQty: form.minQty ? Number(form.minQty) : undefined,
      perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : undefined,
      firstOrderOnly: form.firstOrderOnly,
      combinable: form.combinable,
    }),
    [form],
  )

  const sectionErrors = useMemo(() => {
    const sections: Record<SectionKey, number> = { typeValue: 0, targets: 0, schedule: 0 }
    const r1 = promotionTypeValueSectionSchema.safeParse(parseData)
    if (!r1.success) sections.typeValue = r1.error.issues.length
    const r2 = promotionTargetsSectionSchema.safeParse(parseData)
    if (!r2.success) sections.targets = r2.error.issues.length
    const r3 = promotionScheduleSectionSchema.safeParse(parseData)
    if (!r3.success) sections.schedule = r3.error.issues.length
    return sections
  }, [parseData])

  const totalErrors = Object.values(sectionErrors).reduce((a, b) => a + b, 0)

  const sectionComplete = useMemo(
    () => ({
      typeValue: sectionErrors.typeValue === 0,
      targets: sectionErrors.targets === 0,
      schedule: sectionErrors.schedule === 0,
    }),
    [sectionErrors],
  )

  const sections: { key: SectionKey; label: string; hint: string }[] = [
    {
      key: 'typeValue',
      label: t('seller.promotions.builder.sectionTypeValue'),
      hint: t('seller.promotions.builder.fieldTypeHint'),
    },
    {
      key: 'targets',
      label: t('seller.promotions.builder.sectionTargets'),
      hint: t('seller.promotions.builder.fieldScope'),
    },
    {
      key: 'schedule',
      label: t('seller.promotions.builder.sectionSchedule'),
      hint: t('seller.promotions.builder.fieldStartsAtHint'),
    },
  ]

  const validateAll = (): boolean => {
    const result = promotionFormSchema.safeParse(parseData)
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

  const buildPromoInput = (status: 'active' | 'draft') => ({
    name: form.name,
    type: form.type,
    status,
    discountValue: Number(form.discountValue) || 0,
    code: form.code || '',
    isCoupon: form.isCoupon,
    scope: form.scope,
    scopeLabel: form.scope === 'category' ? form.scopeLabel : undefined,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
    endsAt: form.endsAt
      ? new Date(form.endsAt).toISOString()
      : new Date(Date.now() + 7 * 86400000).toISOString(),
    budget: form.budget ? Number(form.budget) : undefined,
    productsCount: 0,
  })

  const handleSaveDraft = async () => {
    setSaveState('saving')
    setSaveError(null)
    try {
      if (isEdit && editId) {
        await updatePromotion(editId, { ...buildPromoInput('draft'), id: editId })
      } else {
        await createPromotion(buildPromoInput('draft'))
      }
      setSaveState('saved')
      setInitialForm(form)
      showSnackbar(t('seller.promotions.builder.saved'))
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('idle')
      setSaveError(t('seller.promotions.saveErrorInline'))
    }
  }

  const handleActivate = async () => {
    if (!validateAll()) {
      showSnackbar(t('seller.promotions.builder.errorSummary', { count: totalErrors }))
      return
    }
    setPublishing(true)
    setSaveError(null)
    try {
      if (isEdit && editId) {
        await updatePromotion(editId, { ...buildPromoInput('active'), id: editId })
      } else {
        await createPromotion(buildPromoInput('active'))
      }
      setPublishing(false)
      setInitialForm(form)
      showSnackbar(t('seller.promotions.builder.activate'))
      setTimeout(() => router.push('/promotions'), 1200)
    } catch {
      setPublishing(false)
      setSaveError(t('seller.promotions.activateErrorInline'))
    }
  }

  const handleBack = () => {
    if (isDirty) setShowUnsaved(true)
    else router.push('/promotions')
  }

  const scrollToSection = (key: SectionKey) => {
    const el = sectionRefs.current[key]
    if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const debouncedForm = useDebounced(form, 250)
  const previewData = useMemo(() => {
    const dv = Number(debouncedForm.discountValue) || 0
    const compareAt = 2000
    let price = compareAt
    if (debouncedForm.type === 'percentage' || debouncedForm.type === 'flash_sale') {
      price = Math.round(compareAt * (1 - dv / 100))
    } else if (debouncedForm.type === 'fixed') {
      price = Math.max(0, compareAt - dv)
    }
    return {
      name: debouncedForm.name || t('seller.promotions.builder.previewName'),
      price,
      compareAt,
      type: debouncedForm.type,
      discountValue: dv,
      code: debouncedForm.code,
      isCoupon: debouncedForm.isCoupon,
      startsAt: debouncedForm.startsAt,
      endsAt: debouncedForm.endsAt,
      status: debouncedForm.status,
    }
  }, [debouncedForm, t])

  const [countdown, setCountdown] = useState(() =>
    getTimeRemaining(previewData.endsAt || new Date(Date.now() + 7 * 86400000).toISOString()),
  )
  useEffect(() => {
    if (!previewData.endsAt) return
    const target = new Date(previewData.endsAt).toISOString()
    const r = getTimeRemaining(target)
    setCountdown(r)
    if (r.total <= 0) return
    const id = setInterval(() => {
      const r2 = getTimeRemaining(target)
      setCountdown(r2)
      if (r2.total <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [previewData.endsAt])

  if (notFound) {
    return (
      <Screen>
        <Container>
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4">
              <Tag size={32} className="text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-text mb-1">
              {t('seller.promotions.notFoundTitle')}
            </h1>
            <p className="text-sm text-text-muted max-w-sm mb-5">
              {t('seller.promotions.notFoundSubtitle')}
            </p>
            <button
              type="button"
              onClick={() => router.push('/promotions')}
              aria-label={t('seller.promotions.notFoundBackAria')}
              className="h-10 px-5 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-95 transition-opacity"
            >
              {t('seller.promotions.notFoundBack')}
            </button>
          </div>
        </Container>
      </Screen>
    )
  }

  if (isEdit && isLoadingPromo) {
    return (
      <Screen>
        <div className="sticky top-0 z-sticky bg-surface/95 backdrop-blur border-b border-border-light">
          <Container>
            <div className="py-3 flex items-center gap-3">
              <div className="h-5 w-20 bg-shimmer rounded animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-40 bg-shimmer rounded animate-pulse" />
              </div>
            </div>
          </Container>
        </div>
        <Container>
          <div className="py-6 grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border-light bg-surface p-5"
                  aria-busy="true"
                >
                  <div className="h-5 w-40 bg-shimmer rounded animate-pulse mb-3" />
                  <div className="h-10 w-full bg-shimmer rounded animate-pulse mb-4" />
                  <div className="h-10 w-full bg-shimmer rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="hidden lg:block">
              <div
                className="rounded-xl border border-border-light bg-surface p-4"
                aria-busy="true"
              >
                <div className="h-32 bg-shimmer rounded animate-pulse mb-3" />
                <div className="h-4 w-32 bg-shimmer rounded animate-pulse mb-2" />
                <div className="h-6 w-20 bg-shimmer rounded animate-pulse" />
              </div>
            </div>
          </div>
        </Container>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="sticky top-0 z-sticky bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border-light">
        <Container>
          <div className="py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('seller.promotions.builder.backAria')}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.promotions.builder.back')}</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[18px] font-semibold text-text truncate">
                {isEdit
                  ? t('seller.promotions.builder.editTitle')
                  : t('seller.promotions.builder.newTitle')}
              </h1>
            </div>
            {saveState === 'saving' && (
              <span className="text-[12px] text-text-muted inline-flex items-center gap-1">
                <Save size={13} className="animate-pulse" aria-hidden="true" />
                {t('seller.promotions.builder.saving')}
              </span>
            )}
            {saveState === 'saved' && (
              <span className="text-[12px] text-success inline-flex items-center gap-1">
                <Check size={13} aria-hidden="true" />
                {t('seller.promotions.builder.saved')}
              </span>
            )}
            {totalErrors > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-error bg-error/10 rounded-full px-2 py-0.5"
                aria-label={t('seller.promotions.builder.errorSummaryAria', { count: totalErrors })}
              >
                <AlertCircle size={12} aria-hidden="true" />
                {t('seller.promotions.builder.sectionErrors', { count: totalErrors })}
              </span>
            )}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={publishing || saveState === 'saving'}
                aria-label={t('seller.promotions.builder.saveDraftAria')}
                className="h-9 px-4 rounded-md border border-border bg-surface text-[14px] font-semibold text-text hover:bg-background transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saveState === 'saving' && (
                  <span
                    className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
                {t('seller.promotions.builder.saveDraft')}
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={publishing}
                aria-label={t('seller.promotions.builder.activateAria')}
                className="h-9 px-4 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
              >
                {publishing && (
                  <span
                    className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
                {publishing
                  ? t('seller.promotions.builder.saving')
                  : t('seller.promotions.builder.activate')}
              </button>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-6">
          {/* Save/activate error banner */}
          <AnimatePresence>
            {saveError && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-lg border border-error/30 bg-error/5 p-4 flex items-start gap-3"
              >
                <AlertCircle size={20} className="text-error shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-error">{saveError}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSaveError(null)
                        handleSaveDraft()
                      }}
                      aria-label={t('seller.promotions.retrySaveAria')}
                      className="h-8 px-3 rounded-md border border-error/40 text-error text-[13px] font-semibold hover:bg-error/5 transition-colors"
                    >
                      {t('seller.promotions.retrySave')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveError(null)
                        handleActivate()
                      }}
                      aria-label={t('seller.promotions.retryActivateAria')}
                      className="h-8 px-3 rounded-md border border-primary text-primary text-[13px] font-semibold hover:bg-primary-50 transition-colors"
                    >
                      {t('seller.promotions.retryActivate')}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  aria-label="Dismiss"
                  className="text-text-muted hover:text-text p-0.5"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Left: Form + section nav */}
            <div className="min-w-0">
              <div className="hidden lg:flex items-center gap-1 mb-4 p-1 bg-surface rounded-lg border border-border-light">
                {sections.map(s => {
                  const complete = sectionComplete[s.key]
                  const errCount = sectionErrors[s.key]
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => scrollToSection(s.key)}
                      aria-label={t('seller.promotions.builder.completionAria', {
                        section: s.label,
                        status: complete
                          ? t('seller.promotions.builder.completionDone')
                          : t('seller.promotions.builder.completionIncomplete'),
                      })}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium text-text-muted hover:text-text hover:bg-background transition-colors"
                    >
                      <span className="text-text-muted" aria-hidden="true">
                        {SECTION_ICONS[s.key]}
                      </span>
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
                    refCallback={el => {
                      sectionRefs.current[s.key] = el
                    }}
                  >
                    {s.key === 'typeValue' && (
                      <TypeValueSection
                        form={form}
                        errors={errors}
                        updateField={updateField}
                        t={t}
                        reduced={reduced}
                      />
                    )}
                    {s.key === 'targets' && (
                      <TargetsSection
                        form={form}
                        errors={errors}
                        updateField={updateField}
                        t={t}
                        reduced={reduced}
                      />
                    )}
                    {s.key === 'schedule' && (
                      <ScheduleSection
                        form={form}
                        errors={errors}
                        updateField={updateField}
                        t={t}
                      />
                    )}
                  </SectionCard>
                ))}
              </div>

              {totalErrors > 0 && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mt-4 p-3 rounded-lg border border-error/30 bg-error/5"
                >
                  <p className="text-[13px] font-semibold text-error flex items-center gap-1.5 mb-1">
                    <AlertCircle size={15} aria-hidden="true" />
                    {t('seller.promotions.builder.errorSummary', { count: totalErrors })}
                  </p>
                  <ul className="text-[12px] text-error space-y-0.5 pl-5 list-disc">
                    {Object.entries(errors).map(([field, msg]) => (
                      <li key={field}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Live preview */}
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <p className="text-[13px] font-semibold text-text-muted mb-1">
                  {t('seller.promotions.builder.previewTitle')}
                </p>
                <p className="text-[12px] text-text-muted mb-3">
                  {t('seller.promotions.builder.previewSubtitle')}
                </p>
                <PreviewCard data={previewData} countdown={countdown} t={t} />
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Mobile save bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-sticky bg-surface border-t border-border shadow-xl">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={publishing || saveState === 'saving'}
            aria-label={t('seller.promotions.builder.saveDraftAria')}
            className="flex-1 h-11 rounded-md border border-border bg-surface text-[14px] font-semibold text-text active:bg-background transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saveState === 'saving' && (
              <span
                className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            {t('seller.promotions.builder.saveDraft')}
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={publishing}
            aria-label={t('seller.promotions.builder.activateAria')}
            className="flex-1 h-11 rounded-md bg-primary text-white text-[14px] font-semibold active:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {publishing && (
              <span
                className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            {publishing
              ? t('seller.promotions.builder.saving')
              : t('seller.promotions.builder.activate')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showUnsaved && (
          <UnsavedDialog
            title={t('seller.promotions.builder.dirtyDialogTitle')}
            body={t('seller.promotions.builder.dirtyDialogBody')}
            saveLabel={t('seller.promotions.builder.dirtyDialogSave')}
            discardLabel={t('seller.promotions.builder.dirtyDialogDiscard')}
            cancelLabel={t('seller.promotions.builder.dirtyDialogCancel')}
            reduced={reduced}
            onSave={async () => {
              setShowUnsaved(false)
              await handleSaveDraft()
              router.push('/promotions')
            }}
            onDiscard={() => {
              setShowUnsaved(false)
              router.push('/promotions')
            }}
            onCancel={() => setShowUnsaved(false)}
          />
        )}
      </AnimatePresence>

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

type TT = (key: string, opts?: Record<string, unknown>) => string

// ---- Section card ----

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
>(function SectionCard(
  { sectionKey, label, hint, complete, errorCount, reduced, refCallback, children },
  _ref,
) {
  const icon = SECTION_ICONS[sectionKey]
  return (
    <div
      ref={refCallback}
      className="bg-surface rounded-lg border border-border-light shadow-sm overflow-hidden scroll-mt-20"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
        <span className="text-text-muted" aria-hidden="true">
          {icon}
        </span>
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
      <div className="p-5">{children}</div>
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
        <p id={errorId} className="text-[12px] font-normal text-error" role="alert">
          {error}
        </p>
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

function TypeValueSection({
  form,
  errors,
  updateField,
  t,
  reduced,
}: {
  form: FormState
  errors: Record<string, string>
  updateField: (f: keyof FormState, v: string | boolean) => void
  t: TT
  reduced: boolean
}) {
  const [codeAnnounce, setCodeAnnounce] = useState('')

  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    updateField('code', code)
    setCodeAnnounce(t('seller.promotions.builder.codeGenerated', { code }))
    setTimeout(() => setCodeAnnounce(''), 3000)
  }, [updateField, t])

  const isPercent = form.type === 'percentage' || form.type === 'flash_sale'
  const isFixed = form.type === 'fixed'
  const isBogo = form.type === 'bogo'
  const isFreeShip = form.type === 'free_shipping'

  return (
    <div className="flex flex-col gap-4">
      <Field
        label={t('seller.promotions.builder.fieldName')}
        hint={t('seller.promotions.builder.fieldNameHint')}
        error={errors.name}
        errorId="error-name"
      >
        <input
          type="text"
          value={form.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="e.g. Dashain Dhamaka"
          aria-label={t('seller.promotions.builder.fieldName')}
          aria-describedby={errors.name ? 'error-name' : undefined}
          className={inputCls(!!errors.name)}
        />
      </Field>

      {/* Type chooser — selectable cards */}
      <div role="radiogroup" aria-label={t('seller.promotions.builder.fieldType')}>
        <label className="text-[14px] font-semibold text-text mb-1.5 block">
          {t('seller.promotions.builder.fieldType')}
        </label>
        <p className="text-[12px] font-normal text-text-muted mb-2.5">
          {t('seller.promotions.builder.fieldTypeHint')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PROMOTION_TYPES.map(tt => {
            const selected = form.type === tt.key
            const shortKey =
              tt.key === 'percentage'
                ? 'typePercentageShort'
                : tt.key === 'fixed'
                  ? 'typeFixedShort'
                  : tt.key === 'flash_sale'
                    ? 'typeFlashSaleShort'
                    : tt.key === 'bogo'
                      ? 'typeBogoShort'
                      : 'typeFreeShippingShort'
            return (
              <button
                key={tt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateField('type', tt.key)}
                className={`relative flex flex-col items-center gap-2 p-3.5 rounded-lg border transition-all duration-200 ${
                  selected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary-50'
                    : 'border-border bg-surface hover:border-primary/30 hover:bg-background'
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-background text-text-muted'}`}
                >
                  {TYPE_ICONS[tt.key]}
                </span>
                <span
                  className={`text-[13px] font-semibold text-center ${selected ? 'text-primary' : 'text-text'}`}
                >
                  {t(`seller.promotions.${shortKey}`)}
                </span>
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check size={12} className="text-white" aria-hidden="true" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Adapted value inputs */}
      <AnimatePresence initial={!reduced}>
        {!isFreeShip && !isBogo && (
          <motion.div
            key="discount-value"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <Field
              label={t('seller.promotions.builder.fieldDiscountValue')}
              hint={isPercent ? t('seller.promotions.builder.fieldDiscountValueHint') : undefined}
              error={errors.discountValue}
              errorId="error-discountValue"
            >
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={e => updateField('discountValue', e.target.value)}
                  placeholder="0"
                  aria-label={t('seller.promotions.builder.fieldDiscountValue')}
                  aria-describedby={errors.discountValue ? 'error-discountValue' : undefined}
                  className={inputCls(!!errors.discountValue)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-muted">
                  {isPercent ? '%' : 'NPR'}
                </span>
              </div>
              {isPercent && Number(form.discountValue) > 100 && (
                <p className="text-[12px] text-error mt-1" role="alert">
                  Percentage cannot exceed 100
                </p>
              )}
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOGO qty pickers */}
      <AnimatePresence initial={!reduced}>
        {isBogo && (
          <motion.div
            key="bogo-qty"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t('seller.promotions.builder.fieldBogoBuyQty')}
                hint={t('seller.promotions.builder.fieldBogoBuyQtyHint')}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.bogoBuyQty}
                  onChange={e => updateField('bogoBuyQty', e.target.value)}
                  placeholder="2"
                  aria-label={t('seller.promotions.builder.fieldBogoBuyQty')}
                  className={inputCls()}
                />
              </Field>
              <Field
                label={t('seller.promotions.builder.fieldBogoGetQty')}
                hint={t('seller.promotions.builder.fieldBogoGetQtyHint')}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.bogoGetQty}
                  onChange={e => updateField('bogoGetQty', e.target.value)}
                  placeholder="1"
                  aria-label={t('seller.promotions.builder.fieldBogoGetQty')}
                  className={inputCls()}
                />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupon toggle + code generator */}
      <div className="flex items-center gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isCoupon}
            onChange={e => updateField('isCoupon', e.target.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          <span className="text-[14px] font-semibold text-text">
            {t('seller.promotions.builder.fieldIsCoupon')}
          </span>
        </label>
      </div>
      <p className="text-[12px] font-normal text-text-muted -mt-2">
        {t('seller.promotions.builder.fieldIsCouponHint')}
      </p>

      <AnimatePresence initial={!reduced}>
        {form.isCoupon && (
          <motion.div
            key="coupon-code"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <Field
              label={t('seller.promotions.builder.fieldCode')}
              hint={t('seller.promotions.builder.fieldCodeHint')}
              error={errors.code}
              errorId="error-code"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={e => updateField('code', e.target.value.toUpperCase())}
                  placeholder="DASHAIN25"
                  aria-label={t('seller.promotions.builder.fieldCode')}
                  aria-describedby={errors.code ? 'error-code' : undefined}
                  className={`font-mono flex-1 ${inputCls(!!errors.code)}`}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  aria-label={t('seller.promotions.builder.generateCodeAria')}
                  className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border bg-background text-[13px] font-semibold text-text hover:bg-surface transition-colors"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {t('seller.promotions.builder.generateCode')}
                  </span>
                </button>
              </div>
            </Field>
            {codeAnnounce && (
              <p
                className="text-[12px] font-semibold text-success mt-1.5"
                role="status"
                aria-live="polite"
              >
                {codeAnnounce}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Effective price example */}
      <EffectivePriceCard form={form} t={t} />
    </div>
  )
}

function TargetsSection({
  form,
  errors,
  updateField,
  t,
  reduced,
}: {
  form: FormState
  errors: Record<string, string>
  updateField: (f: keyof FormState, v: string | boolean) => void
  t: TT
  reduced: boolean
}) {
  const scopeOptions: { key: PromotionScope; label: string; icon: React.ReactNode }[] = [
    {
      key: 'all',
      label: t('seller.promotions.builder.fieldScopeAll'),
      icon: <Tag size={16} aria-hidden="true" />,
    },
    {
      key: 'category',
      label: t('seller.promotions.builder.fieldScopeCategory'),
      icon: <Tag size={16} aria-hidden="true" />,
    },
    {
      key: 'products',
      label: t('seller.promotions.builder.fieldScopeProducts'),
      icon: <Tag size={16} aria-hidden="true" />,
    },
    {
      key: 'order',
      label: t('seller.promotions.builder.fieldScopeOrder'),
      icon: <ShoppingCart size={16} aria-hidden="true" />,
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      {/* Scope chooser */}
      <div role="radiogroup" aria-label={t('seller.promotions.builder.fieldScope')}>
        <label className="text-[14px] font-semibold text-text mb-1.5 block">
          {t('seller.promotions.builder.fieldScope')}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {scopeOptions.map(opt => {
            const selected = form.scope === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={opt.label}
                onClick={() => updateField('scope', opt.key)}
                className={`flex items-center gap-2 px-3 h-10 rounded-md border text-[13px] font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-border bg-surface text-text-muted hover:bg-background'
                }`}
              >
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conditional scope label */}
      <AnimatePresence initial={!reduced}>
        {form.scope === 'category' && (
          <motion.div
            key="scope-label"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <Field
              label={t('seller.promotions.builder.fieldScopeLabel')}
              hint={t('seller.promotions.builder.fieldScopeLabelHint')}
              error={errors.scopeLabel}
              errorId="error-scopeLabel"
            >
              <input
                type="text"
                value={form.scopeLabel}
                onChange={e => updateField('scopeLabel', e.target.value)}
                placeholder="e.g. Electronics"
                aria-label={t('seller.promotions.builder.fieldScopeLabel')}
                aria-describedby={errors.scopeLabel ? 'error-scopeLabel' : undefined}
                className={inputCls(!!errors.scopeLabel)}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      {form.scope === 'products' && (
        <div className="rounded-md border border-dashed border-border bg-background p-4 text-center">
          <p className="text-[13px] text-text-muted">
            Product picker — select specific products to include in this promotion.
          </p>
        </div>
      )}

      {/* Conditions group */}
      <div className="mt-2 pt-4 border-t border-border-light">
        <p className="text-[14px] font-semibold text-text mb-1">
          {t('seller.promotions.builder.conditionsTitle')}
        </p>
        <p className="text-[12px] font-normal text-text-muted mb-3">
          {t('seller.promotions.builder.conditionsHint')}
        </p>
        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label={t('seller.promotions.builder.fieldMinOrderValue')}
              hint={t('seller.promotions.builder.fieldMinOrderValueHint')}
            >
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.minOrderValue}
                  onChange={e => updateField('minOrderValue', e.target.value)}
                  placeholder="0"
                  aria-label={t('seller.promotions.builder.fieldMinOrderValue')}
                  className={inputCls()}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-muted">
                  NPR
                </span>
              </div>
            </Field>
            <Field
              label={t('seller.promotions.builder.fieldMinQty')}
              hint={t('seller.promotions.builder.fieldMinQtyHint')}
            >
              <input
                type="number"
                inputMode="numeric"
                value={form.minQty}
                onChange={e => updateField('minQty', e.target.value)}
                placeholder="0"
                aria-label={t('seller.promotions.builder.fieldMinQty')}
                className={inputCls()}
              />
            </Field>
          </div>
          <Field
            label={t('seller.promotions.builder.fieldPerCustomerLimit')}
            hint={t('seller.promotions.builder.fieldPerCustomerLimitHint')}
          >
            <input
              type="number"
              inputMode="numeric"
              value={form.perCustomerLimit}
              onChange={e => updateField('perCustomerLimit', e.target.value)}
              placeholder="0 = unlimited"
              aria-label={t('seller.promotions.builder.fieldPerCustomerLimit')}
              className={inputCls()}
            />
          </Field>
          <ToggleRow
            label={t('seller.promotions.builder.fieldFirstOrderOnly')}
            hint={t('seller.promotions.builder.fieldFirstOrderOnlyHint')}
            checked={form.firstOrderOnly}
            onChange={v => updateField('firstOrderOnly', v)}
          />
          <ToggleRow
            label={t('seller.promotions.builder.fieldCombinable')}
            hint={t('seller.promotions.builder.fieldCombinableHint')}
            checked={form.combinable}
            onChange={v => updateField('combinable', v)}
          />
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text">{label}</p>
        <p className="text-[12px] font-normal text-text-muted mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

function EffectivePriceCard({ form, t }: { form: FormState; t: TT }) {
  const locale = useLocale()
  const original = 2000
  const dv = Number(form.discountValue) || 0
  let discounted = original
  let youSave = 0
  let label = t('seller.promotions.builder.effectiveNoDiscount')

  if (form.type === 'percentage' || form.type === 'flash_sale') {
    discounted = Math.round(original * (1 - Math.min(dv, 100) / 100))
    youSave = original - discounted
    label = `${dv}% OFF`
  } else if (form.type === 'fixed') {
    discounted = Math.max(0, original - dv)
    youSave = original - discounted
    label = `${formatNPR(dv, locale)} OFF`
  } else if (form.type === 'bogo') {
    label = t('seller.promotions.builder.effectiveBogo', {
      buy: form.bogoBuyQty || '2',
      get: form.bogoGetQty || '1',
    })
  } else if (form.type === 'free_shipping') {
    label = t('seller.promotions.builder.effectiveFreeShip')
  }

  const vat = Math.round((discounted * 0.13) / 1.13)
  const showPrice = form.type !== 'bogo' && form.type !== 'free_shipping'

  return (
    <div
      className="rounded-lg border border-gold/30 bg-gold/5 p-4"
      aria-label={t('seller.promotions.builder.effectivePriceTitle')}
    >
      <p className="text-[13px] font-semibold text-text mb-1">
        {t('seller.promotions.builder.effectivePriceTitle')}
      </p>
      <p className="text-[12px] font-normal text-text-muted mb-3">
        {t('seller.promotions.builder.effectivePriceSubtitle')}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {showPrice ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-bold text-gold tabular-nums">
                  {formatNPR(discounted, locale)}
                </span>
                {original > discounted && (
                  <span className="text-[14px] text-text-muted line-through tabular-nums">
                    {formatNPR(original, locale)}
                  </span>
                )}
              </div>
              {youSave > 0 && (
                <p className="text-[12px] font-semibold text-success mt-0.5">
                  {t('seller.promotions.builder.effectiveYouSave', {
                    amount: formatNPR(youSave, locale),
                  })}
                </p>
              )}
              <p className="text-[11px] font-normal text-text-muted mt-0.5">
                {t('seller.promotions.builder.effectiveVat')} · {formatNPR(vat, locale)}
              </p>
            </>
          ) : (
            <p className="text-[14px] font-semibold text-text">{label}</p>
          )}
        </div>
        <span className="inline-flex items-center text-[10px] font-bold tracking-wide text-text bg-gold rounded-full px-2.5 py-1">
          {label}
        </span>
      </div>
    </div>
  )
}

function ScheduleSection({
  form,
  errors,
  updateField,
  t,
}: {
  form: FormState
  errors: Record<string, string>
  updateField: (f: keyof FormState, v: string | boolean) => void
  t: TT
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label={t('seller.promotions.builder.fieldStartsAt')}
          hint={t('seller.promotions.builder.fieldStartsAtHint')}
          error={errors.startsAt}
          errorId="error-startsAt"
        >
          <input
            type="date"
            value={form.startsAt}
            onChange={e => updateField('startsAt', e.target.value)}
            aria-label={t('seller.promotions.builder.fieldStartsAt')}
            aria-describedby={errors.startsAt ? 'error-startsAt' : undefined}
            className={inputCls(!!errors.startsAt)}
          />
        </Field>
        <Field
          label={t('seller.promotions.builder.fieldEndsAt')}
          hint={t('seller.promotions.builder.fieldEndsAtHint')}
          error={errors.endsAt}
          errorId="error-endsAt"
        >
          <input
            type="date"
            value={form.endsAt}
            onChange={e => updateField('endsAt', e.target.value)}
            aria-label={t('seller.promotions.builder.fieldEndsAt')}
            aria-describedby={errors.endsAt ? 'error-endsAt' : undefined}
            className={inputCls(!!errors.endsAt)}
          />
        </Field>
      </div>

      <Field
        label={t('seller.promotions.builder.fieldBudget')}
        hint={t('seller.promotions.builder.fieldBudgetHint')}
      >
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={form.budget}
            onChange={e => updateField('budget', e.target.value)}
            placeholder="0"
            aria-label={t('seller.promotions.builder.fieldBudget')}
            className={inputCls()}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-muted">
            NPR
          </span>
        </div>
      </Field>
    </div>
  )
}

// ---- Live preview ----

function PreviewCard({
  data,
  countdown,
  t,
}: {
  data: {
    name: string
    price: number
    compareAt: number
    type: PromotionType
    discountValue: number
    code: string
    isCoupon: boolean
    startsAt: string
    endsAt: string
    status: string
  }
  countdown: ReturnType<typeof getTimeRemaining>
  t: TT
}) {
  const locale = useLocale()
  const isSale = data.type === 'flash_sale' || data.type === 'percentage'
  const offLabel =
    data.type === 'percentage' || data.type === 'flash_sale'
      ? `${data.discountValue}% OFF`
      : data.type === 'fixed'
        ? `NPR ${data.discountValue} OFF`
        : data.type === 'bogo'
          ? t('seller.promotions.builder.previewBogo')
          : t('seller.promotions.builder.previewFreeShip')
  const showCountdown = countdown.total > 0 && data.endsAt
  return (
    <div className="rounded-xl border border-border-light bg-surface shadow-md overflow-hidden">
      {/* Preview image placeholder */}
      <div className="h-32 bg-gradient-to-br from-primary-50 to-background flex items-center justify-center relative">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {TYPE_ICONS[data.type]}
        </div>
        {isSale && (
          <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wide text-text bg-gold rounded-full px-2 py-0.5">
            {t('seller.promotions.saleBadge')}
          </span>
        )}
        <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wide text-white bg-primary rounded-full px-2 py-0.5">
          {offLabel}
        </span>
      </div>

      <div className="p-4">
        <p className="text-[16px] font-semibold text-text truncate">{data.name}</p>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[18px] font-bold text-gold tabular-nums">
            {formatNPR(data.price, locale)}
          </span>
          {data.compareAt > data.price && (
            <span className="text-[14px] text-text-muted line-through tabular-nums">
              {formatNPR(data.compareAt, locale)}
            </span>
          )}
        </div>

        {data.type === 'free_shipping' && (
          <p className="mt-1 text-[13px] font-semibold text-success">
            {t('seller.promotions.builder.previewFreeShip')}
          </p>
        )}
        {data.type === 'bogo' && (
          <p className="mt-1 text-[13px] font-semibold text-primary">
            {t('seller.promotions.builder.previewBogo')}
          </p>
        )}

        {data.isCoupon ? (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary bg-primary-50 px-3 py-1.5">
            <span className="text-[12px] font-bold text-primary font-mono">
              {data.code || 'CODE'}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-[12px] font-normal text-text-muted">
            {t('seller.promotions.builder.previewNoCoupon')}
          </p>
        )}

        {showCountdown && (
          <div className="mt-3 pt-3 border-t border-border-light">
            <p className="text-[12px] font-semibold text-text-muted">
              {t('seller.promotions.builder.previewCountdown')}
            </p>
            <p className="text-[18px] font-bold tabular-nums text-text mt-0.5" role="timer">
              {countdownStr(countdown)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Unsaved dialog ----

function UnsavedDialog({
  title,
  body,
  saveLabel,
  discardLabel,
  cancelLabel,
  reduced,
  onSave,
  onDiscard,
  onCancel,
}: {
  title: string
  body: string
  saveLabel: string
  discardLabel: string
  cancelLabel: string
  reduced: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    dialogRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onCancel}
      />
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="relative bg-surface rounded-xl p-5 w-full max-w-[400px] shadow-xl outline-none"
      >
        <h2 className="text-[18px] font-semibold text-text mb-2">{title}</h2>
        <p className="text-[14px] text-text-muted leading-5 mb-5">{body}</p>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-10 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 h-10 rounded-md text-[14px] font-semibold text-error hover:bg-error/5 transition-colors"
          >
            {discardLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 h-10 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            {saveLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
