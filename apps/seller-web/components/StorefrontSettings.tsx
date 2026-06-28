'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Star,
  Image as ImageIcon,
  ZoomIn,
} from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { storefrontSchema } from '@chinooz/validation'
import { analytics } from '@chinooz/analytics'
import { SELLER_STORE_RATING, SELLER_STORE_REVIEW_COUNT } from '@chinooz/mock-data'

interface FormState {
  name: string
  tagline: string
  description: string
  category: string
  pickupAddress: string
  returnAddress: string
  contactPhone: string
  contactEmail: string
  logoUrl: string
  bannerUrl: string
}

type Errors = Partial<Record<keyof FormState, string>>

function toForm(store: ReturnType<typeof useSellerSessionStore.getState>['store']): FormState {
  return {
    name: store?.name ?? '',
    tagline: store?.tagline ?? '',
    description: store?.description ?? '',
    category: store?.category ?? '',
    pickupAddress: store?.pickupAddress ?? '',
    returnAddress: store?.returnAddress ?? '',
    contactPhone: store?.contactPhone ?? '',
    contactEmail: store?.contactEmail ?? '',
    logoUrl: store?.logoUrl ?? '',
    bannerUrl: store?.bannerUrl ?? '',
  }
}

export default function StorefrontSettings() {
  const { t } = useTranslation()
  const router = useRouter()
  const store = useSellerSessionStore(s => s.store)
  const updateStore = useSellerSessionStore(s => s.updateStore)

  const [form, setForm] = useState<FormState>(() => toForm(store))
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirtyDialog, setDirtyDialog] = useState<null | (() => void)>(null)
  const [cropTarget, setCropTarget] = useState<null | { kind: 'logo' | 'banner'; src: string }>(null)

  const initialRef = useRef<FormState>(form)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-storefront' })
  }, [])

  const dirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialRef.current)
  }, [form])

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const validate = useCallback((): Errors => {
    const result = storefrontSchema.safeParse(form)
    if (result.success) return {}
    const errs: Errors = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormState
      if (!errs[key]) errs[key] = issue.message
    }
    return errs
  }, [form])

  const handleSave = useCallback(() => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    setTimeout(() => {
      updateStore({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        category: form.category,
        pickupAddress: form.pickupAddress,
        returnAddress: form.returnAddress,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        logoUrl: form.logoUrl,
        bannerUrl: form.bannerUrl,
      })
      initialRef.current = form
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [form, validate, updateStore])

  const guardedNav = useCallback(
    (fn: () => void) => {
      if (dirty) {
        setDirtyDialog(() => fn)
      } else {
        fn()
      }
    },
    [dirty],
  )

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="xl:mx-auto xl:max-w-5xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/settings"
                onClick={(e) => {
                  e.preventDefault()
                  guardedNav(() => router.push('/settings'))
                }}
                className="inline-flex min-touch items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-background hover:text-text transition-colors"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>{t('seller.settings.storefront.backToSettings')}</span>
              </Link>
              <h1 className="text-lg font-semibold text-text md:text-xl">{t('seller.settings.storefront.editTitle')}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dirty ? 'text-warning' : 'text-text-tertiary'}`}>
                {dirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
                {dirty ? t('seller.settings.storefront.dirtyIndicator') : ''}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
              {/* Form column */}
              <div className="space-y-6">
                <FormSection title={t('seller.settings.storefront.sectionIdentity')}>
                  <Field
                    label={t('seller.settings.storefront.fieldName')}
                    hint={t('seller.settings.storefront.fieldNameHint')}
                    error={errors.name ? t('seller.settings.storefront.fieldNameError') : undefined}
                    htmlFor="sf-name"
                  >
                    <input
                      id="sf-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      aria-label={t('seller.settings.storefront.fieldName')}
                      aria-invalid={!!errors.name}
                      className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.name ? 'border-error' : 'border-border'}`}
                      placeholder=""
                    />
                  </Field>

                  <Field
                    label={t('seller.settings.storefront.fieldTagline')}
                    hint={t('seller.settings.storefront.fieldTaglineHint')}
                    error={errors.tagline ? t('seller.settings.storefront.fieldTaglineError') : undefined}
                    htmlFor="sf-tagline"
                  >
                    <input
                      id="sf-tagline"
                      type="text"
                      value={form.tagline}
                      onChange={(e) => set('tagline', e.target.value)}
                      maxLength={140}
                      aria-label={t('seller.settings.storefront.fieldTagline')}
                      aria-invalid={!!errors.tagline}
                      className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.tagline ? 'border-error' : 'border-border'}`}
                      placeholder=""
                    />
                  </Field>

                  <Field
                    label={t('seller.settings.storefront.fieldDescription')}
                    hint={t('seller.settings.storefront.fieldDescriptionHint')}
                    error={errors.description ? t('seller.settings.storefront.fieldDescriptionError') : undefined}
                    htmlFor="sf-desc"
                  >
                    <textarea
                      id="sf-desc"
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      maxLength={2000}
                      rows={4}
                      aria-label={t('seller.settings.storefront.fieldDescription')}
                      aria-invalid={!!errors.description}
                      className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-y ${errors.description ? 'border-error' : 'border-border'}`}
                      placeholder=""
                    />
                  </Field>
                </FormSection>

                <FormSection title={t('seller.settings.storefront.sectionMedia')}>
                  <ImageUpload
                    kind="logo"
                    label={t('seller.settings.storefront.logoLabel')}
                    hint={t('seller.settings.storefront.logoHint')}
                    uploadLabel={t('seller.settings.storefront.logoUpload')}
                    changeLabel={t('seller.settings.storefront.logoChange')}
                    removeLabel={t('seller.settings.storefront.logoRemove')}
                    ariaLabel={t('seller.settings.storefront.logoAria')}
                    value={form.logoUrl}
                    onChange={(url) => set('logoUrl', url)}
                    onCrop={setCropTarget}
                    t={t}
                  />
                  <ImageUpload
                    kind="banner"
                    label={t('seller.settings.storefront.bannerLabel')}
                    hint={t('seller.settings.storefront.bannerHint')}
                    uploadLabel={t('seller.settings.storefront.bannerUpload')}
                    changeLabel={t('seller.settings.storefront.bannerChange')}
                    removeLabel={t('seller.settings.storefront.bannerRemove')}
                    ariaLabel={t('seller.settings.storefront.bannerAria')}
                    value={form.bannerUrl}
                    onChange={(url) => set('bannerUrl', url)}
                    onCrop={setCropTarget}
                    t={t}
                  />
                </FormSection>

                <FormSection title={t('seller.settings.storefront.sectionLocation')}>
                  <Field
                    label={t('seller.settings.storefront.fieldCategory')}
                    hint={t('seller.settings.storefront.fieldCategoryHint')}
                    htmlFor="sf-category"
                  >
                    <input
                      id="sf-category"
                      type="text"
                      value={form.category}
                      onChange={(e) => set('category', e.target.value)}
                      aria-label={t('seller.settings.storefront.fieldCategory')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                      placeholder={t('seller.settings.storefront.fieldCategoryPlaceholder')}
                    />
                  </Field>

                  <Field
                    label={t('seller.settings.storefront.fieldPickup')}
                    hint={t('seller.settings.storefront.fieldPickupHint')}
                    htmlFor="sf-pickup"
                  >
                    <input
                      id="sf-pickup"
                      type="text"
                      value={form.pickupAddress}
                      onChange={(e) => set('pickupAddress', e.target.value)}
                      aria-label={t('seller.settings.storefront.fieldPickup')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                      placeholder={t('seller.settings.storefront.fieldPickupPlaceholder')}
                    />
                  </Field>

                  <Field
                    label={t('seller.settings.storefront.fieldReturn')}
                    hint={t('seller.settings.storefront.fieldReturnHint')}
                    htmlFor="sf-return"
                  >
                    <input
                      id="sf-return"
                      type="text"
                      value={form.returnAddress}
                      onChange={(e) => set('returnAddress', e.target.value)}
                      aria-label={t('seller.settings.storefront.fieldReturn')}
                      className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                      placeholder={t('seller.settings.storefront.fieldReturnPlaceholder')}
                    />
                  </Field>
                </FormSection>

                <FormSection title={t('seller.settings.storefront.sectionContact')}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t('seller.settings.storefront.fieldContactPhone')}
                      hint={t('seller.settings.storefront.fieldContactPhoneHint')}
                      error={errors.contactPhone ? t('seller.settings.storefront.fieldContactPhoneError') : undefined}
                      htmlFor="sf-phone"
                    >
                      <input
                        id="sf-phone"
                        type="tel"
                        value={form.contactPhone}
                        onChange={(e) => set('contactPhone', e.target.value)}
                        aria-label={t('seller.settings.storefront.fieldContactPhone')}
                        aria-invalid={!!errors.contactPhone}
                        className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.contactPhone ? 'border-error' : 'border-border'}`}
                        placeholder="9801234567"
                      />
                    </Field>

                    <Field
                      label={t('seller.settings.storefront.fieldContactEmail')}
                      hint={t('seller.settings.storefront.fieldContactEmailHint')}
                      error={errors.contactEmail ? t('seller.settings.storefront.fieldContactEmailError') : undefined}
                      htmlFor="sf-email"
                    >
                      <input
                        id="sf-email"
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => set('contactEmail', e.target.value)}
                        aria-label={t('seller.settings.storefront.fieldContactEmail')}
                        aria-invalid={!!errors.contactEmail}
                        className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.contactEmail ? 'border-error' : 'border-border'}`}
                        placeholder="hello@store.com"
                      />
                    </Field>
                  </div>
                </FormSection>
              </div>

              {/* Sticky preview column */}
              <div className="md:sticky md:top-6 md:self-start">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {t('seller.settings.storefront.sectionPreview')}
                </div>
                <StorePreview
                  name={form.name || t('seller.settings.previewNoLogo')}
                  tagline={form.tagline}
                  logoUrl={form.logoUrl}
                  bannerUrl={form.bannerUrl}
                  rating={SELLER_STORE_RATING}
                  reviewCount={SELLER_STORE_REVIEW_COUNT}
                  t={t}
                />
                <p className="mt-2 text-xs text-text-muted">{t('seller.settings.storefront.previewLabel')}</p>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Sticky save bar */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        hasErrors={Object.keys(errors).length > 0}
        onSave={handleSave}
        onDiscard={() => {
          setForm(initialRef.current)
          setErrors({})
          setSaved(false)
        }}
        t={t}
      />

      {/* Dirty guard dialog */}
      {dirtyDialog && (
        <DirtyDialog
          title={t('seller.settings.storefront.dirtyDialogTitle')}
          body={t('seller.settings.storefront.dirtyDialogBody')}
          saveLabel={t('seller.settings.storefront.dirtyDialogSave')}
          discardLabel={t('seller.settings.storefront.dirtyDialogDiscard')}
          stayLabel={t('seller.settings.storefront.dirtyDialogStay')}
          onSave={() => {
            const fn = dirtyDialog
            setDirtyDialog(null)
            handleSave()
            fn()
          }}
          onDiscard={() => {
            const fn = dirtyDialog
            setDirtyDialog(null)
            fn()
          }}
          onStay={() => setDirtyDialog(null)}
        />
      )}

      {/* Crop dialog */}
      {cropTarget && (
        <CropDialog
          kind={cropTarget.kind}
          src={cropTarget.src}
          title={t('seller.settings.storefront.cropTitle')}
          zoomLabel={t('seller.settings.storefront.cropZoom')}
          saveLabel={t('seller.settings.storefront.cropSave')}
          cancelLabel={t('seller.settings.storefront.cropCancel')}
          ariaLabel={t('seller.settings.storefront.cropAria')}
          onApply={(url) => {
            if (cropTarget.kind === 'logo') set('logoUrl', url)
            else set('bannerUrl', url)
            setCropTarget(null)
          }}
          onCancel={() => setCropTarget(null)}
        />
      )}
    </Screen>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border-light bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-error" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

function ImageUpload({
  kind,
  label,
  hint,
  uploadLabel,
  changeLabel,
  removeLabel,
  ariaLabel,
  value,
  onChange,
  onCrop,
  t,
}: {
  kind: 'logo' | 'banner'
  label: string
  hint: string
  uploadLabel: string
  changeLabel: string
  removeLabel: string
  ariaLabel: string
  value: string
  onChange: (url: string) => void
  onCrop: (target: { kind: 'logo' | 'banner'; src: string }) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setProgress(0)
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    reader.onload = () => {
      setProgress(100)
      const src = reader.result as string
      setTimeout(() => {
        setProgress(null)
        onCrop({ kind, src })
      }, 300)
    }
    reader.onerror = () => setProgress(null)
    reader.readAsDataURL(file)
  }

  const isLogo = kind === 'logo'

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-text">{label}</label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={`relative shrink-0 overflow-hidden rounded-md border border-border bg-background ${isLogo ? 'h-16 w-16' : 'h-20 w-32'}`}
          aria-hidden="true"
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-tertiary">
              <ImageIcon size={20} />
            </div>
          )}
          {progress !== null && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-primary" style={{ width: `${progress}%` }} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
            aria-label={ariaLabel}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-background transition-colors"
            >
              {value ? changeLabel : uploadLabel}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex min-touch items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-error hover:bg-error-light transition-colors"
              >
                {removeLabel}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {progress !== null ? t('seller.settings.storefront.uploadProgress', { pct: progress }) : hint}
          </p>
        </div>
      </div>
    </div>
  )
}

function StorePreview({
  name,
  tagline,
  logoUrl,
  bannerUrl,
  rating,
  reviewCount,
  t,
}: {
  name: string
  tagline: string
  logoUrl: string
  bannerUrl: string
  rating: number
  reviewCount: number
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-border-light bg-surface shadow-sm"
    >
      {/* Banner */}
      <div className="relative h-28 w-full bg-gradient-to-r from-primary-50 to-primary/20">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">
            {t('seller.settings.storefront.previewNoBanner')}
          </div>
        )}
      </div>
      {/* Logo + name */}
      <div className="px-4 pb-4">
        <div className="-mt-8 flex items-end gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-primary-50">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                {t('seller.settings.storefront.previewNoLogo')}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h3 className="truncate text-lg font-semibold text-text">{name}</h3>
            {tagline ? <p className="truncate text-xs text-text-muted">{tagline}</p> : null}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Star size={14} className="fill-gold text-gold" aria-hidden="true" />
          <span className="text-sm font-semibold text-text">{rating.toFixed(1)}</span>
          <span className="text-xs text-text-muted">{t('seller.settings.storefront.ratingReviews', { count: reviewCount })}</span>
        </div>
      </div>
    </div>
  )
}

function SaveBar({
  dirty,
  saving,
  saved,
  hasErrors,
  onSave,
  onDiscard,
  t,
}: {
  dirty: boolean
  saving: boolean
  saved: boolean
  hasErrors: boolean
  onSave: () => void
  onDiscard: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-light bg-surface/95 backdrop-blur">
      <Container>
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                {t('seller.settings.storefront.saved')}
              </span>
            ) : dirty ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
                <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                {t('seller.settings.storefront.dirtyIndicator')}
              </span>
            ) : (
              <span className="text-sm text-text-tertiary">{t('seller.settings.storefront.editSubtitle')}</span>
            )}
            {hasErrors && (
              <span className="text-sm font-semibold text-error" role="alert">
                {t('seller.settings.storefront.validationError')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDiscard}
              disabled={!dirty || saving}
              aria-label={t('seller.settings.storefront.discard')}
              className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors disabled:opacity-40"
            >
              {t('seller.settings.storefront.discard')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              aria-label={t('seller.settings.storefront.save')}
              className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-40"
            >
              {saving ? t('seller.settings.storefront.saving') : t('seller.settings.storefront.save')}
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}

function DirtyDialog({
  title,
  body,
  saveLabel,
  discardLabel,
  stayLabel,
  onSave,
  onDiscard,
  onStay,
}: {
  title: string
  body: string
  saveLabel: string
  discardLabel: string
  stayLabel: string
  onSave: () => void
  onDiscard: () => void
  onStay: () => void
}) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-overlay" onClick={onStay} aria-label={stayLabel} />
      <div className="relative mx-4 max-w-sm rounded-lg bg-surface p-5 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-text">{title}</h2>
        <p className="mb-4 text-sm text-text-secondary">{body}</p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onSave} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
            {saveLabel}
          </button>
          <button type="button" onClick={onDiscard} className="inline-flex min-touch items-center justify-center rounded-md border border-error px-4 py-2.5 text-sm font-semibold text-error hover:bg-error-light transition-colors">
            {discardLabel}
          </button>
          <button type="button" onClick={onStay} className="inline-flex min-touch items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-text-muted hover:text-text transition-colors">
            {stayLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function CropDialog({
  kind,
  src,
  title,
  zoomLabel,
  saveLabel,
  cancelLabel,
  ariaLabel,
  onApply,
  onCancel,
}: {
  kind: 'logo' | 'banner'
  src: string
  title: string
  zoomLabel: string
  saveLabel: string
  cancelLabel: string
  ariaLabel: string
  onApply: (url: string) => void
  onCancel: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const isLogo = kind === 'logo'
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={cancelLabel} />
      <div className="relative mx-4 max-w-md rounded-lg bg-surface p-5 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-text">{title}</h2>
        <div className={`relative mx-auto overflow-hidden rounded-md border border-border bg-background ${isLogo ? 'h-48 w-48' : 'h-32 w-full max-w-xs'}`}>
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
        <div className="mt-4">
          <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
            <ZoomIn size={16} aria-hidden="true" />
            {zoomLabel}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            aria-label={zoomLabel}
            className="w-full accent-primary"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors">
            {cancelLabel}
          </button>
          <button type="button" onClick={() => onApply(src)} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors">
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
