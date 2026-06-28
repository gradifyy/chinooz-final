'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Clock, Pencil } from 'lucide-react'
import { useSellerSessionStore } from '@chinooz/state'
import { getCategories } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui-web'
import WizardStepper from './WizardStepper'
import LanguageToggle from './LanguageToggle'
import type { Category } from '@chinooz/types'

type SubmitState = 'idle' | 'submitting' | 'review' | 'approved'

export default function ReviewStepClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const setKycStatus = useSellerSessionStore(s => s.setKycStatus)
  const setGoLiveStatus = useSellerSessionStore(s => s.setGoLiveStatus)
  const seller = useSellerSessionStore(s => s.seller)

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    getCategories().then(cats => {
      const cat = cats.find(c => c.id === draft.categoryId)
      if (cat) setCategoryName(cat.name)
    })
  }, [draft.categoryId])

  const handleSubmit = useCallback(() => {
    if (submitState !== 'idle') return
    setSubmitState('submitting')
    setTimeout(() => {
      setSubmitState('review')
      setKycStatus('pending')
    }, 1200)
    setTimeout(() => {
      setSubmitState('approved')
      setKycStatus('verified')
      setGoLiveStatus('review')
    }, 3000)
  }, [submitState, setKycStatus, setGoLiveStatus])

  const handleGoToDashboard = useCallback(() => {
    setGoLiveStatus('live')
    router.push('/dashboard')
  }, [setGoLiveStatus, router])

  const steps = [
    { key: 'store', label: t('seller.setup.stepStore') },
    { key: 'business', label: t('seller.setup.stepBusiness') },
    { key: 'bank', label: t('seller.setup.stepBank') },
    { key: 'review', label: t('seller.setup.stepReview') },
  ]

  if (submitState === 'review' || submitState === 'approved') {
    return <StatusScreen state={submitState} reduced={reduced} onContinue={handleGoToDashboard} t={t} />
  }

  const docCount = [draft.docId, draft.docReg, draft.docPan].filter(Boolean).length
  const bizTypeLabel = draft.businessType === 'individual' ? t('seller.setup.rowIndividual') : t('seller.setup.rowRegistered')
  const payoutMethodLabel = draft.payoutMethod === 'bank' ? t('seller.setup.methodBank') : draft.payoutMethod === 'esewa' ? t('seller.setup.methodEsewa') : t('seller.setup.methodKhalti')
  const fullAddress = [draft.pickupStreet, draft.pickupArea, draft.pickupCity].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10"><LanguageToggle /></div>
      <div className="flex-1 max-w-[600px] mx-auto w-full px-6">
        <WizardStepper steps={steps} current={3} />
        <div className="pt-4 pb-3">
          <h1 className="text-[22px] font-bold text-text tracking-tight mb-1">{t('seller.setup.reviewTitle')}</h1>
          <p className="text-sm text-text-muted">{t('seller.setup.reviewSubtitle')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <ReviewSection title={t('seller.setup.sectionStore')} editAria={t('seller.setup.editStoreAria')} onEdit={() => router.push('/setup-store')} t={t}>
            <Row label={t('seller.setup.rowStoreName')} value={draft.storeName} />
            <Row label={t('seller.setup.rowHandle')} value={`chinooz.com/store/${draft.handle}`} />
            <Row label={t('seller.setup.rowCategory')} value={categoryName} />
            {draft.description && <Row label={t('seller.setup.rowDescription')} value={draft.description} />}
            <Row label={t('seller.setup.rowAddress')} value={fullAddress} />
          </ReviewSection>
          <ReviewSection title={t('seller.setup.sectionBusiness')} editAria={t('seller.setup.editBusinessAria')} onEdit={() => router.push('/setup-business')} t={t}>
            <Row label={t('seller.setup.rowBusinessType')} value={bizTypeLabel} />
            <Row label={t('seller.setup.rowLegalName')} value={draft.legalName} />
            <Row label={t('seller.setup.rowPan')} value={draft.panNumber} />
            {draft.businessType === 'registered' && draft.regNumber && <Row label={t('seller.setup.rowRegNumber')} value={draft.regNumber} />}
            <Row label={t('seller.setup.rowKycDocs')} value={t('seller.setup.rowKycDocsValue', { count: docCount })} />
          </ReviewSection>
          <ReviewSection title={t('seller.setup.sectionBank')} editAria={t('seller.setup.editBankAria')} onEdit={() => router.push('/setup-bank')} t={t}>
            <Row label={t('seller.setup.rowPayoutMethod')} value={payoutMethodLabel} />
            {draft.payoutMethod === 'bank' ? (
              <>
                <Row label={t('seller.setup.rowBankName')} value={draft.bankName} />
                <Row label={t('seller.setup.rowAccountName')} value={draft.accountName} />
                <Row label={t('seller.setup.rowAccountNumber')} value={`••••${draft.accountNumber.slice(-4)}`} />
                <Row label={t('seller.setup.rowBranch')} value={draft.branch} />
              </>
            ) : (
              <Row label={t('seller.setup.rowWalletNumber')} value={draft.walletNumber} />
            )}
            <Row label={t('seller.setup.rowDefault')} value={draft.payoutIsDefault ? t('seller.setup.rowYes') : t('seller.setup.rowNo')} />
          </ReviewSection>
        </div>
      </div>
      <div className="sticky bottom-0 bg-background border-t border-border-light px-6 py-3">
        <div className="max-w-[600px] mx-auto flex gap-2">
          <button onClick={() => router.back()} className="h-11 px-6 rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors">{t('seller.setup.back')}</button>
          <button onClick={handleSubmit} disabled={submitState === 'submitting'} className="flex-1 h-[52px] rounded-md bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors disabled:opacity-70 flex items-center justify-center gap-2" aria-label={submitState === 'submitting' ? t('seller.setup.submitted') : t('seller.setup.submit')}>
            {submitState === 'submitting' ? (
              <div className="flex items-center gap-2"><div className="w-[18px] h-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>{t('seller.setup.submitting')}</span></div>
            ) : (
              <div className="flex items-center gap-2"><span>{t('seller.setup.submit')}</span><Check size={18} /></div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusScreen({ state, reduced, onContinue, t }: { state: 'review' | 'approved'; reduced: boolean; onContinue: () => void; t: any }) {
  const isApproved = state === 'approved'
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300 }}
        className="flex flex-col items-center gap-3 max-w-md text-center"
      >
        <motion.div
          initial={reduced ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 12, stiffness: 300, delay: 0.2 }}
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center ${isApproved ? 'bg-success-light' : 'bg-warning-light'}`}
        >
          {isApproved ? <Check size={36} className="text-success" strokeWidth={3} /> : <Clock size={36} className="text-warning" />}
        </motion.div>
        <div className={`px-3 py-1 rounded-full ${isApproved ? 'bg-success-light' : 'bg-warning-light'}`}>
          <span className={`text-xs font-semibold ${isApproved ? 'text-success' : 'text-warning'}`}>{isApproved ? t('seller.setup.statusApproved') : t('seller.setup.statusReview')}</span>
        </div>
        <h1 className="text-2xl font-bold text-text">{isApproved ? t('seller.setup.approvedTitle') : t('seller.setup.underReviewTitle')}</h1>
        <p className="text-[15px] text-text-muted leading-relaxed">{isApproved ? t('seller.setup.approvedSubtitle') : t('seller.setup.underReviewSubtitle')}</p>
        {!isApproved && (
          <div className="flex items-center gap-1.5 bg-surface rounded-full px-3 py-1.5 border border-border-light">
            <Clock size={14} className="text-warning" /><span className="text-[13px] font-semibold text-warning">{t('seller.setup.underReviewTimeframe')}</span>
          </div>
        )}
        <p className="text-sm text-text-muted leading-relaxed">{isApproved ? t('seller.setup.approvedDesc') : t('seller.setup.underReviewDesc')}</p>
      </motion.div>
      {isApproved && (
        <div className="mt-8">
          <button onClick={onContinue} className="h-[52px] px-8 rounded-md bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors">{t('seller.setup.goToDashboard')}</button>
        </div>
      )}
    </div>
  )
}

function ReviewSection({ title, editAria, onEdit, t, children }: { title: string; editAria: string; onEdit: () => void; t: any; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-lg border border-border-light p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[18px] font-semibold text-text">{title}</h3>
        <button onClick={onEdit} aria-label={editAria} className="flex items-center gap-1 text-primary">
          <Pencil size={13} /><span className="text-[13px] font-semibold">{t('seller.setup.editSection')}</span>
        </button>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-sm font-normal text-text-muted shrink-0">{label}</span>
      <span className="text-base font-normal text-text text-right flex-1">{value || '—'}</span>
    </div>
  )
}
