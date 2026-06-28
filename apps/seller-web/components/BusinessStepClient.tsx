'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Upload, Check, X, FileText, ShieldCheck } from 'lucide-react'
import { businessKycSchema } from '@chinooz/validation'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import WizardStepper from './WizardStepper'
import LanguageToggle from './LanguageToggle'

type DocState = 'empty' | 'uploading' | 'uploaded' | 'failed'

export default function BusinessStepClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const updateDraft = useSellerSessionStore(s => s.updateDraft)
  const setKycStatus = useSellerSessionStore(s => s.setKycStatus)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [docStates, setDocStates] = useState<Record<string, DocState>>({
    docId: draft.docId ? 'uploaded' : 'empty',
    docReg: draft.docReg ? 'uploaded' : 'empty',
    docPan: draft.docPan ? 'uploaded' : 'empty',
  })

  const updateField = useCallback((field: string, value: string) => {
    updateDraft({ [field]: value } as any)
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [updateDraft])

  const handleMockUpload = useCallback((docKey: string) => {
    setDocStates(prev => ({ ...prev, [docKey]: 'uploading' }))
    setTimeout(() => {
      const filename = `${docKey}-${Date.now()}.pdf`
      updateDraft({ [docKey]: filename } as any)
      setDocStates(prev => ({ ...prev, [docKey]: 'uploaded' }))
      setErrors(prev => ({ ...prev, [docKey]: '' }))
    }, 1200)
  }, [updateDraft])

  const handleRemoveDoc = useCallback((docKey: string) => {
    updateDraft({ [docKey]: '' } as any)
    setDocStates(prev => ({ ...prev, [docKey]: 'empty' }))
  }, [updateDraft])

  const handleSubmit = useCallback(() => {
    const result = businessKycSchema.safeParse({
      businessType: draft.businessType,
      legalName: draft.legalName,
      panNumber: draft.panNumber,
      regNumber: draft.regNumber,
      docId: draft.docId,
      docReg: draft.docReg,
      docPan: draft.docPan,
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
    setSubmitting(true)
    setTimeout(() => {
      setKycStatus('pending')
      updateDraft({ setupStep: 2 })
      setSubmitting(false)
      router.push('/setup-bank')
    }, 800)
  }, [draft, setKycStatus, updateDraft, router])

  const steps = [
    { key: 'store', label: t('seller.setup.stepStore') },
    { key: 'business', label: t('seller.setup.stepBusiness') },
    { key: 'bank', label: t('seller.setup.stepBank') },
    { key: 'review', label: t('seller.setup.stepReview') },
  ]
  const isRegistered = draft.businessType === 'registered'

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10"><LanguageToggle /></div>
      <div className="flex-1 max-w-[600px] mx-auto w-full px-6">
        <WizardStepper steps={steps} current={1} />
        <div className="pt-4 pb-3">
          <h1 className="text-[22px] font-bold text-text tracking-tight mb-1">{t('seller.setup.businessTitle')}</h1>
          <p className="text-sm text-text-muted">{t('seller.setup.businessSubtitle')}</p>
        </div>
        <motion.div animate={Object.keys(errors).length > 0 && !reduced ? { x: [0, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text">{t('seller.setup.businessTypeLabel')}</label>
            <div className="flex gap-3">
              <button onClick={() => updateField('businessType', 'individual')} role="tab" aria-selected={!isRegistered} className={`flex-1 py-3 px-3 rounded-full border-[1.5px] flex flex-col items-center gap-0.5 transition-colors ${!isRegistered ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
                <span className="text-sm font-semibold">{t('seller.setup.businessTypeIndividual')}</span>
                <span className={`text-[11px] text-center ${!isRegistered ? 'text-primary-50' : 'text-text-muted'}`}>{t('seller.setup.businessTypeIndividualDesc')}</span>
              </button>
              <button onClick={() => updateField('businessType', 'registered')} role="tab" aria-selected={isRegistered} className={`flex-1 py-3 px-3 rounded-full border-[1.5px] flex flex-col items-center gap-0.5 transition-colors ${isRegistered ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
                <span className="text-sm font-semibold">{t('seller.setup.businessTypeRegistered')}</span>
                <span className={`text-[11px] text-center ${isRegistered ? 'text-primary-50' : 'text-text-muted'}`}>{t('seller.setup.businessTypeRegisteredDesc')}</span>
              </button>
            </div>
          </div>
          <Field label={t('seller.setup.legalNameLabel')} error={errors.legalName} helper={t('seller.setup.legalNameHelper')}>
            <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.legalName} onChange={e => updateField('legalName', e.target.value)} placeholder={t('seller.setup.legalNamePlaceholder')} aria-label={t('seller.setup.legalNameLabel')} />
          </Field>
          <Field label={t('seller.setup.panLabel')} error={errors.panNumber} helper={t('seller.setup.panHelper')}>
            <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.panNumber} onChange={e => updateField('panNumber', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder={t('seller.setup.panPlaceholder')} aria-label={t('seller.setup.panLabel')} />
          </Field>
          <AnimatePresence initial={false}>
            {isRegistered && (
              <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }} exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, duration: 0.25 }} className="overflow-hidden">
                <Field label={t('seller.setup.regNumberLabel')} error={errors.regNumber} helper={t('seller.setup.regNumberHelper')}>
                  <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.regNumber} onChange={e => updateField('regNumber', e.target.value)} placeholder={t('seller.setup.regNumberPlaceholder')} aria-label={t('seller.setup.regNumberLabel')} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-start gap-2.5 bg-primary-50 rounded-lg px-3.5 py-3">
            <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[13px] text-primary leading-[19px] font-medium">{t('seller.setup.dataCallout')}</p>
          </div>
          <span className="text-sm font-semibold text-text mt-1">{t('seller.setup.docIdLabel')}</span>
          <DocUploadCard docKey="docId" draft={draft} docStates={docStates} errors={errors} onUpload={handleMockUpload} onRemove={handleRemoveDoc} t={t} reduced={reduced} />
          <AnimatePresence initial={false}>
            {isRegistered && (
              <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }} exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, duration: 0.25 }} className="overflow-hidden">
                <DocUploadCard docKey="docReg" draft={draft} docStates={docStates} errors={errors} onUpload={handleMockUpload} onRemove={handleRemoveDoc} t={t} reduced={reduced} />
              </motion.div>
            )}
          </AnimatePresence>
          <DocUploadCard docKey="docPan" draft={draft} docStates={docStates} errors={errors} onUpload={handleMockUpload} onRemove={handleRemoveDoc} t={t} reduced={reduced} />
        </motion.div>
      </div>
      <div className="sticky bottom-0 bg-background border-t border-border-light px-6 py-3">
        <div className="max-w-[600px] mx-auto flex gap-2">
          <button onClick={() => router.back()} className="h-11 px-6 rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors">{t('seller.setup.back')}</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 h-[52px] rounded-md bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors disabled:opacity-70">{submitting ? t('seller.setup.submitting') : t('seller.setup.submitReview')}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, helper, children }: { label: string; error?: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text">{label}</label>
      {children}
      {error ? <p className="text-xs text-error" role="alert">{error}</p> : helper ? <p className="text-xs text-text-muted">{helper}</p> : null}
    </div>
  )
}

function DocUploadCard({ docKey, draft, docStates, errors, onUpload, onRemove, t, reduced }: {
  docKey: string; draft: any; docStates: Record<string, DocState>; errors: Record<string, string>
  onUpload: (k: string) => void; onRemove: (k: string) => void; t: any; reduced: boolean
}) {
  const state = docStates[docKey] || 'empty'
  const filename = (draft as any)[docKey] || ''
  const labelMap: Record<string, { label: string; hint: string; helper: string }> = {
    docId: { label: t('seller.setup.docIdLabel'), hint: t('seller.setup.docIdHint'), helper: t('seller.setup.docIdHelper') },
    docReg: { label: t('seller.setup.docRegLabel'), hint: t('seller.setup.docRegHint'), helper: t('seller.setup.docRegHelper') },
    docPan: { label: t('seller.setup.docPanLabel'), hint: t('seller.setup.docPanHint'), helper: t('seller.setup.docPanHelper') },
  }
  const meta = labelMap[docKey]
  const error = errors[docKey]

  if (state === 'uploaded' && filename) {
    return (
      <div className="flex items-center justify-between rounded-lg border-[1.5px] border-primary bg-primary-50 px-3.5 py-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-md bg-surface flex items-center justify-center shrink-0"><FileText size={18} className="text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text truncate">{filename}</p>
            <div className="flex items-center gap-1"><Check size={12} className="text-success" strokeWidth={3} /><span className="text-xs font-semibold text-success">{t('seller.setup.uploaded')}</span></div>
          </div>
        </div>
        <button onClick={() => onRemove(docKey)} aria-label={t('seller.setup.uploadRemove')} className="p-1 shrink-0"><X size={18} className="text-text-muted" /></button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <button onClick={() => onUpload(docKey)} aria-label={t('seller.setup.uploadAria', { doc: meta.label })} className={`rounded-lg border-[1.5px] border-dashed bg-surface py-4 px-4 flex flex-col items-center gap-2 transition-colors hover:border-primary focus:border-primary outline-none ${state === 'uploading' ? 'border-primary border-solid' : error ? 'border-error' : 'border-border'}`}>
        {state === 'uploading' ? (
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-primary-50 border-t-primary animate-spin" /><span className="text-sm font-medium text-primary">{t('seller.setup.uploading')}</span></div>
        ) : (
          <><Upload size={20} className="text-text-muted" /><span className="text-sm font-medium text-text-muted">{t('seller.setup.uploadLabel', { doc: meta.label })}</span></>
        )}
        {state === 'uploading' && <div className="w-full h-[3px] bg-border-light rounded-full overflow-hidden mt-1"><motion.div className="h-full bg-primary rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={reduced ? { duration: 0 } : { duration: 1.2, ease: 'easeOut' }} /></div>}
      </button>
      <p className="text-xs text-text-muted">{meta.hint}</p>
      {error && <p className="text-xs text-error" role="alert">{error}</p>}
      <p className="text-xs text-text-muted">{meta.helper}</p>
    </div>
  )
}
