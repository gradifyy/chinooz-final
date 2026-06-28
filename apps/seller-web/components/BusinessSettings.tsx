'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Upload,
  FileText,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { SettingsEmptyState } from './SettingsStates'
import {
  SELLER_BUSINESS_DETAILS,
  SELLER_BUSINESS_TYPES,
  SELLER_KYC_DOCUMENTS,
  getOverallKycStatus,
  getGoLiveRequirements,
  type KycDocument,
  type KycDocumentStatus,
  type BusinessType,
} from '@chinooz/mock-data'

interface FormState {
  legalName: string
  businessType: BusinessType
  panNumber: string
  regNumber: string
  addressLine: string
  city: string
  district: string
  province: string
}

type Errors = Partial<Record<keyof FormState, string>>

function toForm(): FormState {
  return {
    legalName: SELLER_BUSINESS_DETAILS.legalName,
    businessType: SELLER_BUSINESS_DETAILS.businessType,
    panNumber: SELLER_BUSINESS_DETAILS.panNumber,
    regNumber: SELLER_BUSINESS_DETAILS.regNumber,
    addressLine: SELLER_BUSINESS_DETAILS.addressLine,
    city: SELLER_BUSINESS_DETAILS.city,
    district: SELLER_BUSINESS_DETAILS.district,
    province: SELLER_BUSINESS_DETAILS.province,
  }
}

const DOC_STATUS_STYLE: Record<
  KycDocumentStatus,
  { bg: string; text: string; dot: string; Icon: LucideIcon }
> = {
  verified: { bg: 'bg-success-light', text: 'text-success', dot: 'bg-success', Icon: CheckCircle2 },
  pending: { bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-warning', Icon: AlertTriangle },
  rejected: { bg: 'bg-error-light', text: 'text-error', dot: 'bg-error', Icon: XCircle },
  missing: { bg: 'bg-border-light', text: 'text-text-muted', dot: 'bg-text-tertiary', Icon: Info },
}

const BANNER_STYLE = {
  verified: { bg: 'bg-success-light', text: 'text-success', Icon: CheckCircle2 },
  actionNeeded: { bg: 'bg-warning-light', text: 'text-warning', Icon: AlertTriangle },
  underReview: { bg: 'bg-info-light', text: 'text-info', Icon: Info },
} as const

export default function BusinessSettings() {
  const { t } = useTranslation()
  const router = useRouter()
  const kycStatus = useSellerSessionStore(s => s.kycStatus)

  const [form, setForm] = useState<FormState>(toForm)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [docs, setDocs] = useState<KycDocument[]>(SELLER_KYC_DOCUMENTS)
  const [editingLocked, setEditingLocked] = useState<string | null>(null)
  const [resubmitDoc, setResubmitDoc] = useState<KycDocument | null>(null)
  const [dirtyDialog, setDirtyDialog] = useState<null | (() => void)>(null)

  const initialRef = useRef<FormState>(form)

  useEffect(() => {
    analytics.screen({ name: 'seller-settings-business' })
  }, [])

  const isVerified = kycStatus === 'verified'

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialRef.current), [form])

  const overall = getOverallKycStatus(docs)
  const goLiveReqs = getGoLiveRequirements(docs)
  const banner = BANNER_STYLE[overall.kind]

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  const validate = useCallback((): Errors => {
    const errs: Errors = {}
    if (form.legalName.trim().length < 2) errs.legalName = t('seller.settings.business.fieldLegalNameError')
    if (!/^\d{9}$/.test(form.panNumber)) errs.panNumber = t('seller.settings.business.fieldPanError')
    if (form.businessType === 'registered' && form.regNumber.trim().length < 3) errs.regNumber = t('seller.settings.business.fieldRegNumberError')
    if (form.addressLine.trim().length < 5) errs.addressLine = t('seller.settings.business.fieldAddressError')
    if (form.city.trim().length < 2) errs.city = t('seller.settings.business.fieldCityError')
    if (form.district.trim().length < 2) errs.district = t('seller.settings.business.fieldDistrictError')
    if (form.province.trim().length < 2) errs.province = t('seller.settings.business.fieldProvinceError')
    return errs
  }, [form, t])

  const handleSave = useCallback(() => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    setTimeout(() => {
      initialRef.current = form
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }, 600)
  }, [form, validate])

  const guardedNav = useCallback(
    (fn: () => void) => {
      if (dirty) setDirtyDialog(() => fn)
      else fn()
    },
    [dirty],
  )

  const resubmitDocument = (docId: string) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'pending' as KycDocumentStatus, rejectionReasonKey: undefined } : d))
    setResubmitDoc(null)
  }

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="xl:mx-auto xl:max-w-4xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/settings"
                onClick={(e) => { e.preventDefault(); guardedNav(() => router.push('/settings')) }}
                className="inline-flex min-touch items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-background hover:text-text transition-colors"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>{t('seller.settings.business.backToSettings')}</span>
              </Link>
              <h1 className="text-lg font-semibold text-text md:text-xl">{t('seller.settings.business.editTitle')}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dirty ? 'text-warning' : 'text-text-tertiary'}`}>
                {dirty && <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
                {dirty ? t('seller.settings.business.dirtyIndicator') : ''}
              </span>
            </div>

            <div
              role="status"
              aria-live="polite"
              className={`mb-6 flex items-start gap-3 rounded-lg p-4 ${banner.bg}`}
            >
              <banner.Icon size={20} className={`shrink-0 ${banner.text}`} aria-hidden="true" />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${banner.text}`}>
                  {overall.kind === 'verified'
                    ? t('seller.settings.business.bannerVerified')
                    : overall.kind === 'actionNeeded'
                      ? t('seller.settings.business.bannerActionNeeded')
                      : t('seller.settings.business.bannerUnderReview')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <FormSection title={t('seller.settings.business.sectionBusiness')}>
                {isVerified && !editingLocked && (
                  <div className="mb-4 flex items-center gap-2 rounded-md bg-background px-3 py-2.5">
                    <Lock size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="text-xs text-text-muted">{t('seller.settings.business.lockedNote')}</span>
                  </div>
                )}

                <Field
                  label={t('seller.settings.business.fieldLegalName')}
                  hint={t('seller.settings.business.fieldLegalNameHint')}
                  error={errors.legalName}
                  locked={isVerified && !editingLocked?.includes('legalName')}
                  onUnlock={() => setEditingLocked('legalName')}
                  t={t}
                  fieldLabel={t('seller.settings.business.fieldLegalName')}
                >
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => set('legalName', e.target.value)}
                    aria-label={t('seller.settings.business.fieldLegalName')}
                    aria-invalid={!!errors.legalName}
                    readOnly={isVerified && !editingLocked?.includes('legalName')}
                    className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                      errors.legalName ? 'border-error' : 'border-border'
                    } ${isVerified && !editingLocked?.includes('legalName') ? 'bg-background text-text-muted' : ''}`}
                  />
                </Field>

                <Field
                  label={t('seller.settings.business.fieldBusinessType')}
                  hint={t('seller.settings.business.fieldBusinessTypeHint')}
                  locked={isVerified && !editingLocked?.includes('businessType')}
                  onUnlock={() => setEditingLocked('businessType')}
                  t={t}
                  fieldLabel={t('seller.settings.business.fieldBusinessType')}
                >
                  <select
                    value={form.businessType}
                    onChange={(e) => set('businessType', e.target.value as BusinessType)}
                    aria-label={t('seller.settings.business.fieldBusinessType')}
                    disabled={isVerified && !editingLocked?.includes('businessType')}
                    className={`w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                      isVerified && !editingLocked?.includes('businessType') ? 'bg-background text-text-muted' : ''
                    }`}
                  >
                    {SELLER_BUSINESS_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{t(bt.labelKey)}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t('seller.settings.business.fieldPan')}
                    hint={t('seller.settings.business.fieldPanHint')}
                    error={errors.panNumber}
                    locked={isVerified && !editingLocked?.includes('panNumber')}
                    onUnlock={() => setEditingLocked('panNumber')}
                    t={t}
                    fieldLabel={t('seller.settings.business.fieldPan')}
                  >
                    <input
                      type="text"
                      value={form.panNumber}
                      onChange={(e) => set('panNumber', e.target.value)}
                      aria-label={t('seller.settings.business.fieldPan')}
                      aria-invalid={!!errors.panNumber}
                      readOnly={isVerified && !editingLocked?.includes('panNumber')}
                      className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                        errors.panNumber ? 'border-error' : 'border-border'
                      } ${isVerified && !editingLocked?.includes('panNumber') ? 'bg-background text-text-muted' : ''}`}
                    />
                  </Field>

                  <Field
                    label={t('seller.settings.business.fieldRegNumber')}
                    hint={t('seller.settings.business.fieldRegNumberHint')}
                    error={errors.regNumber}
                    locked={isVerified && !editingLocked?.includes('regNumber')}
                    onUnlock={() => setEditingLocked('regNumber')}
                    t={t}
                    fieldLabel={t('seller.settings.business.fieldRegNumber')}
                  >
                    <input
                      type="text"
                      value={form.regNumber}
                      onChange={(e) => set('regNumber', e.target.value)}
                      aria-label={t('seller.settings.business.fieldRegNumber')}
                      aria-invalid={!!errors.regNumber}
                      readOnly={isVerified && !editingLocked?.includes('regNumber')}
                      className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                        errors.regNumber ? 'border-error' : 'border-border'
                      } ${isVerified && !editingLocked?.includes('regNumber') ? 'bg-background text-text-muted' : ''}`}
                    />
                  </Field>
                </div>

                <Field
                  label={t('seller.settings.business.fieldAddress')}
                  hint={t('seller.settings.business.fieldAddressHint')}
                  error={errors.addressLine}
                  locked={isVerified && !editingLocked?.includes('addressLine')}
                  onUnlock={() => setEditingLocked('addressLine')}
                  t={t}
                  fieldLabel={t('seller.settings.business.fieldAddress')}
                >
                  <input
                    type="text"
                    value={form.addressLine}
                    onChange={(e) => set('addressLine', e.target.value)}
                    aria-label={t('seller.settings.business.fieldAddress')}
                    aria-invalid={!!errors.addressLine}
                    readOnly={isVerified && !editingLocked?.includes('addressLine')}
                    className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                      errors.addressLine ? 'border-error' : 'border-border'
                    } ${isVerified && !editingLocked?.includes('addressLine') ? 'bg-background text-text-muted' : ''}`}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t('seller.settings.business.fieldCity')} error={errors.city} locked={isVerified && !editingLocked?.includes('city')} onUnlock={() => setEditingLocked('city')} t={t} fieldLabel={t('seller.settings.business.fieldCity')}>
                    <input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} aria-label={t('seller.settings.business.fieldCity')} readOnly={isVerified && !editingLocked?.includes('city')} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors border-border ${isVerified && !editingLocked?.includes('city') ? 'bg-background text-text-muted' : ''}`} />
                  </Field>
                  <Field label={t('seller.settings.business.fieldDistrict')} error={errors.district} locked={isVerified && !editingLocked?.includes('district')} onUnlock={() => setEditingLocked('district')} t={t} fieldLabel={t('seller.settings.business.fieldDistrict')}>
                    <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} aria-label={t('seller.settings.business.fieldDistrict')} readOnly={isVerified && !editingLocked?.includes('district')} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors border-border ${isVerified && !editingLocked?.includes('district') ? 'bg-background text-text-muted' : ''}`} />
                  </Field>
                  <Field label={t('seller.settings.business.fieldProvince')} error={errors.province} locked={isVerified && !editingLocked?.includes('province')} onUnlock={() => setEditingLocked('province')} t={t} fieldLabel={t('seller.settings.business.fieldProvince')}>
                    <input type="text" value={form.province} onChange={(e) => set('province', e.target.value)} aria-label={t('seller.settings.business.fieldProvince')} readOnly={isVerified && !editingLocked?.includes('province')} className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors border-border ${isVerified && !editingLocked?.includes('province') ? 'bg-background text-text-muted' : ''}`} />
                  </Field>
                </div>
              </FormSection>

              <FormSection title={t('seller.settings.business.sectionDocuments')}>
                {docs.length === 0 ? (
                  <SettingsEmptyState
                    title={t('seller.settings.states.emptyDocsTitle')}
                    subtitle={t('seller.settings.states.emptyDocsSubtitle')}
                    ctaLabel={t('seller.settings.states.emptyDocsCta')}
                    onCta={() => setResubmitDoc({ id: 'doc-new', kind: 'citizenship', labelKey: 'seller.settings.business.docs.citizenship', status: 'missing' })}
                  />
                ) : (
                <div className="space-y-3">
                  {docs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      t={t}
                      onResubmit={() => setResubmitDoc(doc)}
                    />
                  ))}
                </div>
                )}
              </FormSection>

              <FormSection title={t('seller.settings.business.goLiveTitle')}>
                <p className="mb-3 text-sm text-text-muted">{t('seller.settings.business.goLiveHint')}</p>
                <ul className="space-y-2">
                  {goLiveReqs.map(req => (
                    <li key={req.id} className="flex items-center gap-2.5 text-sm">
                      {req.done ? (
                        <CheckCircle2 size={18} className="shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <div className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-border" aria-hidden="true" />
                      )}
                      <span className={req.done ? 'text-text-muted line-through' : 'text-text font-medium'}>
                        {t(req.labelKey)}
                      </span>
                    </li>
                  ))}
                </ul>
              </FormSection>
            </div>
          </div>
        </div>
      </Container>

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        hasErrors={Object.keys(errors).length > 0}
        onSave={handleSave}
        onDiscard={() => { setForm(initialRef.current); setErrors({}); setSaved(false) }}
        t={t}
      />

      {dirtyDialog && (
        <DirtyDialog
          title={t('seller.settings.storefront.dirtyDialogTitle')}
          body={t('seller.settings.storefront.dirtyDialogBody')}
          saveLabel={t('seller.settings.storefront.dirtyDialogSave')}
          discardLabel={t('seller.settings.storefront.dirtyDialogDiscard')}
          stayLabel={t('seller.settings.storefront.dirtyDialogStay')}
          onSave={() => { const fn = dirtyDialog; setDirtyDialog(null); handleSave(); fn?.() }}
          onDiscard={() => { const fn = dirtyDialog; setDirtyDialog(null); fn?.() }}
          onStay={() => setDirtyDialog(null)}
        />
      )}

      {resubmitDoc && (
        <ResubmitDialog
          doc={resubmitDoc}
          t={t}
          onApply={() => resubmitDocument(resubmitDoc.id)}
          onCancel={() => setResubmitDoc(null)}
        />
      )}

      {editingLocked && (
        <ConfirmDialog
          title={t('seller.settings.business.editLockedConfirmTitle')}
          body={t('seller.settings.business.editLockedConfirmBody')}
          confirmLabel={t('seller.settings.business.editLockedConfirmBtn')}
          cancelLabel={t('seller.settings.business.editLockedCancel')}
          onConfirm={() => {}}
          onCancel={() => setEditingLocked(null)}
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
  locked,
  onUnlock,
  t,
  fieldLabel,
  children,
}: {
  label: string
  hint?: string
  error?: string
  locked?: boolean
  onUnlock?: () => void
  t: (k: string, o?: Record<string, unknown>) => string
  fieldLabel: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-semibold text-text">{label}</label>
        {locked && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-text-muted" aria-hidden="true">
              <Lock size={12} />
            </span>
            <button
              type="button"
              onClick={onUnlock}
              aria-label={t('seller.settings.business.lockedAria', { field: fieldLabel })}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('seller.settings.business.editLocked')}
            </button>
          </div>
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-error" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

function DocumentCard({
  doc,
  t,
  onResubmit,
}: {
  doc: KycDocument
  t: (k: string, o?: Record<string, unknown>) => string
  onResubmit: () => void
}) {
  const s = DOC_STATUS_STYLE[doc.status]
  const statusLabel =
    doc.status === 'verified' ? t('seller.settings.business.docVerified')
    : doc.status === 'pending' ? t('seller.settings.business.docPending')
    : doc.status === 'rejected' ? t('seller.settings.business.docRejected')
    : t('seller.settings.business.docMissing')

  const reason = doc.rejectionReasonKey ? t(doc.rejectionReasonKey) : ''
  const ariaLabel = t('seller.settings.business.docAria', { doc: t(doc.labelKey), status: statusLabel, reason: reason ? `. ${reason}` : '' })

  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-border-light p-4"
      aria-label={ariaLabel}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-background">
        {doc.thumbnailUrl ? (
          <img src={doc.thumbnailUrl} alt="" className="h-full w-full rounded-md object-cover" />
        ) : (
          <FileText size={20} className="text-text-tertiary" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">{t(doc.labelKey)}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
            <s.Icon size={12} aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        {doc.uploadedAt && (
          <p className="mt-0.5 text-xs text-text-muted">{t('seller.settings.business.docUploaded', { date: doc.uploadedAt })}</p>
        )}
        {doc.status === 'rejected' && doc.rejectionReasonKey && (
          <div className="mt-2 rounded-md bg-error-light/50 px-3 py-2">
            <p className="text-xs text-error">{reason}</p>
            <button
              type="button"
              onClick={onResubmit}
              className="mt-1.5 text-xs font-bold text-primary hover:underline"
              aria-label={`${t('seller.settings.business.docResubmit')} — ${t(doc.labelKey)}`}
            >
              {t('seller.settings.business.docResubmit')} →
            </button>
          </div>
        )}
        {doc.status === 'missing' && (
          <button
            type="button"
            onClick={onResubmit}
            className="mt-1.5 text-xs font-bold text-primary hover:underline"
            aria-label={`${t('seller.settings.business.docUpload')} — ${t(doc.labelKey)}`}
          >
            {t('seller.settings.business.docUpload')} →
          </button>
        )}
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
                {t('seller.settings.business.saved')}
              </span>
            ) : dirty ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
                <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                {t('seller.settings.business.dirtyIndicator')}
              </span>
            ) : (
              <span className="text-sm text-text-tertiary">{t('seller.settings.business.editSubtitle')}</span>
            )}
            {hasErrors && <span className="text-sm font-semibold text-error" role="alert">{t('seller.settings.business.validationError')}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onDiscard} disabled={!dirty || saving} aria-label={t('seller.settings.business.discard')} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors disabled:opacity-40">
              {t('seller.settings.business.discard')}
            </button>
            <button type="button" onClick={onSave} disabled={!dirty || saving} aria-label={t('seller.settings.business.save')} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-40">
              {saving ? t('seller.settings.business.saving') : t('seller.settings.business.save')}
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}

function DirtyDialog({ title, body, saveLabel, discardLabel, stayLabel, onSave, onDiscard, onStay }: { title: string; body: string; saveLabel: string; discardLabel: string; stayLabel: string; onSave: () => void; onDiscard: () => void; onStay: () => void }) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-overlay" onClick={onStay} aria-label={stayLabel} />
      <div className="relative mx-4 max-w-sm rounded-lg bg-surface p-5 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-text">{title}</h2>
        <p className="mb-4 text-sm text-text-secondary">{body}</p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onSave} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">{saveLabel}</button>
          <button type="button" onClick={onDiscard} className="inline-flex min-touch items-center justify-center rounded-md border border-error px-4 py-2.5 text-sm font-semibold text-error hover:bg-error-light transition-colors">{discardLabel}</button>
          <button type="button" onClick={onStay} className="inline-flex min-touch items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-text-muted hover:text-text transition-colors">{stayLabel}</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={cancelLabel} />
      <div className="relative mx-4 max-w-sm rounded-lg bg-surface p-5 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-text">{title}</h2>
        <p className="mb-4 text-sm text-text-secondary">{body}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text hover:bg-background transition-colors">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="inline-flex min-touch items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function ResubmitDialog({ doc, t, onApply, onCancel }: { doc: KycDocument; t: (k: string, o?: Record<string, unknown>) => string; onApply: () => void; onCancel: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setProgress(0)
    const reader = new FileReader()
    reader.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
    reader.onload = () => { setProgress(100); setTimeout(() => { setProgress(null); onApply() }, 400) }
    reader.onerror = () => setProgress(null)
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('seller.settings.business.resubmitTitle')}>
      <button className="absolute inset-0 bg-overlay" onClick={onCancel} aria-label={t('seller.settings.business.resubmitCancel')} />
      <div className="relative mx-4 max-w-md rounded-lg bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{t('seller.settings.business.resubmitTitle')}</h2>
          <button type="button" onClick={onCancel} aria-label={t('seller.settings.business.resubmitCancel')} className="rounded-md p-1 text-text-muted hover:bg-background">
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-sm text-text-secondary">{t('seller.settings.business.resubmitHint')}</p>
        {doc.rejectionReasonKey && (
          <div className="mb-4 rounded-md bg-error-light/50 px-3 py-2">
            <p className="text-xs text-error">{t(doc.rejectionReasonKey)}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} aria-label={t('seller.settings.business.docUpload')} />
        {progress !== null ? (
          <div className="rounded-md border border-border bg-background p-4">
            <div className="h-2 overflow-hidden rounded-full bg-border-light" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-center text-xs text-text-muted">{t('seller.settings.business.uploadProgress', { pct: progress })}</p>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-touch w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background px-4 py-6 text-sm font-semibold text-text-muted hover:border-primary hover:text-primary transition-colors">
            <Upload size={20} aria-hidden="true" />
            {t('seller.settings.business.docUpload')}
          </button>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-touch items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-background transition-colors">{t('seller.settings.business.resubmitCancel')}</button>
        </div>
      </div>
    </div>
  )
}
