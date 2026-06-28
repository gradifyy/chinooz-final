'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Lock, Info, ChevronDown, Building2, Wallet } from 'lucide-react'
import { payoutSchema } from '@chinooz/validation'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import WizardStepper from './WizardStepper'
import LanguageToggle from './LanguageToggle'

const NEPAL_BANKS = [
  'Nepal Bank Limited', 'Rastriya Banijya Bank', 'Nabil Bank',
  'Nepal Investment Bank', 'Standard Chartered Bank Nepal',
  'Himalayan Bank Limited', 'Nepal SBI Bank', 'Everest Bank Limited',
  'Bank of Kathmandu', 'Global IME Bank', 'Prime Commercial Bank',
  'Laxmi Sunrise Bank', 'Mega Bank Nepal', 'Citizens Bank International',
  'Nepal Bangladesh Bank',
]

export default function BankStepClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const draft = useSellerSessionStore(s => s.storeDraft)
  const updateDraft = useSellerSessionStore(s => s.updateDraft)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  const updateField = useCallback((field: string, value: any) => {
    updateDraft({ [field]: value } as any)
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [updateDraft])

  const accountsMatch = draft.accountNumber.length > 0 && draft.accountNumber === draft.accountConfirm

  const handleSave = useCallback(() => {
    const result = payoutSchema.safeParse({
      payoutMethod: draft.payoutMethod, bankName: draft.bankName,
      accountName: draft.accountName, accountNumber: draft.accountNumber,
      accountConfirm: draft.accountConfirm, branch: draft.branch,
      walletNumber: draft.walletNumber, isDefault: draft.payoutIsDefault,
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
    setSaving(true)
    setTimeout(() => {
      updateDraft({ setupStep: 3 })
      setSaving(false)
      router.push('/setup-review')
    }, 600)
  }, [draft, updateDraft, router])

  const steps = [
    { key: 'store', label: t('seller.setup.stepStore') },
    { key: 'business', label: t('seller.setup.stepBusiness') },
    { key: 'bank', label: t('seller.setup.stepBank') },
    { key: 'review', label: t('seller.setup.stepReview') },
  ]
  const isBank = draft.payoutMethod === 'bank'

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-0 right-0 p-4 z-10"><LanguageToggle /></div>
      <div className="flex-1 max-w-[600px] mx-auto w-full px-6">
        <WizardStepper steps={steps} current={2} />
        <div className="pt-4 pb-3">
          <h1 className="text-[22px] font-bold text-text tracking-tight mb-1">{t('seller.setup.bankTitle')}</h1>
          <p className="text-sm text-text-muted">{t('seller.setup.bankSubtitle')}</p>
        </div>
        <motion.div animate={Object.keys(errors).length > 0 && !reduced ? { x: [0, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <MethodCard active={draft.payoutMethod === 'bank'} onPress={() => updateField('payoutMethod', 'bank')} icon="bank" label={t('seller.setup.methodBank')} desc={t('seller.setup.methodBankDesc')} isDefault={draft.payoutIsDefault} defaultLabel={t('seller.setup.defaultBadge')} ariaLabel={t('seller.setup.methodAria', { name: t('seller.setup.methodBank') })} />
            <MethodCard active={draft.payoutMethod === 'esewa'} onPress={() => updateField('payoutMethod', 'esewa')} icon="wallet" label={t('seller.setup.methodEsewa')} desc={t('seller.setup.methodEsewaDesc')} isDefault={draft.payoutIsDefault} defaultLabel={t('seller.setup.defaultBadge')} ariaLabel={t('seller.setup.methodAria', { name: t('seller.setup.methodEsewa') })} />
            <MethodCard active={draft.payoutMethod === 'khalti'} onPress={() => updateField('payoutMethod', 'khalti')} icon="wallet" label={t('seller.setup.methodKhalti')} desc={t('seller.setup.methodKhaltiDesc')} isDefault={draft.payoutIsDefault} defaultLabel={t('seller.setup.defaultBadge')} ariaLabel={t('seller.setup.methodAria', { name: t('seller.setup.methodKhalti') })} />
          </div>

          <AnimatePresence initial={false}>
            <motion.div key={draft.payoutMethod} initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }} exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, duration: 0.25 }} className="overflow-hidden flex flex-col gap-4">
              <div className="flex items-center gap-1.5">
                <Lock size={14} className="text-text-muted" />
                <span className="text-xs font-medium text-text-muted">{isBank ? 'Bank transfer · encrypted' : draft.payoutMethod === 'esewa' ? 'eSewa · encrypted' : 'Khalti · encrypted'}</span>
              </div>
              {isBank ? (
                <>
                  <Field label={t('seller.setup.bankNameLabel')} error={errors.bankName} helper={t('seller.setup.bankNameHelper')}>
                    <button onClick={() => setBankOpen(!bankOpen)} aria-label={t('seller.setup.bankNameLabel')} className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface flex items-center justify-between text-[15px] text-text">
                      <span className={!draft.bankName ? 'text-text-tertiary' : ''}>{draft.bankName || t('seller.setup.bankNamePlaceholder')}</span>
                      <ChevronDown size={18} className="text-text-muted" />
                    </button>
                    <AnimatePresence>{bankOpen && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1 bg-surface rounded-md border border-border overflow-hidden">
                        {NEPAL_BANKS.map(bank => (
                          <button key={bank} className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-text border-b border-border-light last:border-0 hover:bg-background transition-colors" onClick={() => { updateField('bankName', bank); setBankOpen(false) }}>
                            {bank}{bank === draft.bankName && <Check size={16} className="text-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    )}</AnimatePresence>
                  </Field>
                  <Field label={t('seller.setup.accountNameLabel')} error={errors.accountName} helper={t('seller.setup.accountNameHelper')}>
                    <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.accountName} onChange={e => updateField('accountName', e.target.value)} placeholder={t('seller.setup.accountNamePlaceholder')} aria-label={t('seller.setup.accountNameLabel')} />
                  </Field>
                  <Field label={t('seller.setup.accountNumberLabel')} error={errors.accountNumber} helper={t('seller.setup.accountNumberHelper')}>
                    <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.accountNumber} onChange={e => updateField('accountNumber', e.target.value)} placeholder={t('seller.setup.accountNumberPlaceholder')} aria-label={t('seller.setup.accountNumberLabel')} />
                  </Field>
                  <Field label={t('seller.setup.accountConfirmLabel')} error={errors.accountConfirm} helper={t('seller.setup.accountConfirmHelper')}>
                    <div className="flex items-center gap-2">
                      <input className="flex-1 h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.accountConfirm} onChange={e => updateField('accountConfirm', e.target.value)} placeholder={t('seller.setup.accountConfirmPlaceholder')} aria-label={t('seller.setup.accountConfirmLabel')} />
                      {accountsMatch && <Check size={20} className="text-success" strokeWidth={2.5} />}
                    </div>
                    {accountsMatch && <p className="text-xs font-semibold text-success" role="alert">{t('seller.setup.accountMatch')}</p>}
                  </Field>
                  <Field label={t('seller.setup.branchLabel')} error={errors.branch} helper={t('seller.setup.branchHelper')}>
                    <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.branch} onChange={e => updateField('branch', e.target.value)} placeholder={t('seller.setup.branchPlaceholder')} aria-label={t('seller.setup.branchLabel')} />
                  </Field>
                </>
              ) : (
                <Field label={t('seller.setup.walletNumberLabel')} error={errors.walletNumber} helper={t('seller.setup.walletNumberHelper')}>
                  <input className="w-full h-12 px-3 rounded-md border-[1.5px] border-border bg-surface text-[15px] text-text outline-none focus:border-primary transition-colors placeholder:text-text-tertiary" value={draft.walletNumber} onChange={e => updateField('walletNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={t('seller.setup.walletNumberPlaceholder')} aria-label={t('seller.setup.walletNumberLabel')} />
                </Field>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-start gap-2.5 bg-surface rounded-lg border border-border px-3.5 py-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-text">{t('seller.setup.payoutInfoTitle')}</span>
              <span className="text-xs text-text-muted leading-[18px]">{t('seller.setup.payoutInfoBody')}</span>
            </div>
          </div>

          <button onClick={() => updateField('payoutIsDefault', !draft.payoutIsDefault)} role="checkbox" aria-checked={draft.payoutIsDefault} className="flex items-center gap-2.5 py-1">
            <div className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-colors ${draft.payoutIsDefault ? 'bg-primary border-primary' : 'border-border'}`}>
              {draft.payoutIsDefault && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm font-semibold text-text">{t('seller.setup.setDefault')}</span>
          </button>
        </motion.div>
      </div>
      <div className="sticky bottom-0 bg-background border-t border-border-light px-6 py-3">
        <div className="max-w-[600px] mx-auto flex gap-2">
          <button onClick={() => router.back()} className="h-11 px-6 rounded-md text-primary text-[15px] font-semibold hover:bg-primary-50 transition-colors">{t('seller.setup.back')}</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-[52px] rounded-md bg-primary text-white text-base font-semibold hover:bg-primary-dark transition-colors disabled:opacity-70">{saving ? t('seller.setup.saving') : t('seller.setup.save')}</button>
        </div>
      </div>
    </div>
  )
}

function MethodCard({ active, onPress, icon, label, desc, isDefault, defaultLabel, ariaLabel }: {
  active: boolean; onPress: () => void; icon: string; label: string; desc: string; isDefault: boolean; defaultLabel: string; ariaLabel: string
}) {
  const Icon = icon === 'bank' ? Building2 : Wallet
  return (
    <button onClick={onPress} role="radio" aria-checked={active} aria-label={ariaLabel} className={`flex items-center gap-3 rounded-lg border-[1.5px] px-3.5 py-3.5 transition-colors text-left ${active ? 'border-primary bg-primary-50' : 'border-border bg-surface'}`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${active ? 'bg-surface' : 'bg-border-light'}`}>
        <Icon size={22} className={active ? 'text-primary' : 'text-text-muted'} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-[15px] font-semibold ${active ? 'text-primary' : 'text-text'}`}>{label}</span>
          {active && isDefault && <span className="bg-primary text-white text-[10px] font-semibold rounded-sm px-1.5 py-0.5">{defaultLabel}</span>}
        </div>
        <span className="text-xs text-text-muted">{desc}</span>
      </div>
      <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${active ? 'border-primary' : 'border-border'}`}>
        {active && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </button>
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
