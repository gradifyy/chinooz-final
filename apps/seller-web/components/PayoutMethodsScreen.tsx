'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, X, Building2, Wallet, Trash2, Pencil, ChevronDown, Star } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { duration } from '@chinooz/theme'
import { payoutSchema } from '@chinooz/validation'
import {
  getPayoutMethodEntries,
  addPayoutMethod,
  updatePayoutMethod,
  deletePayoutMethod,
  setDefaultPayoutMethod,
  NEPAL_BANKS,
  type PayoutMethodEntry,
  type FinancePayoutMethod,
} from '@chinooz/mock-data'

const TYPE_ICONS: Record<FinancePayoutMethod, typeof Building2> = {
  bank: Building2, esewa: Wallet, khalti: Wallet,
}

interface FormData {
  type: FinancePayoutMethod; bankName: string; accountName: string; accountNumber: string; accountConfirm: string; branch: string; walletNumber: string; isDefault: boolean
}
const EMPTY_FORM: FormData = { type: 'bank', bankName: '', accountName: '', accountNumber: '', accountConfirm: '', branch: '', walletNumber: '', isDefault: false }

export default function PayoutMethodsScreen() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [methods, setMethods] = useState<PayoutMethodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PayoutMethodEntry | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { analytics.screen({ name: 'seller-finance-payout-methods' }) }, [])

  const loadMethods = useCallback(async () => {
    setLoading(true)
    setMethods(await getPayoutMethodEntries())
    setLoading(false)
  }, [])

  useEffect(() => { if (isLoggedIn) loadMethods() }, [isLoggedIn, loadMethods])

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }, [])

  const handleAdd = useCallback(() => { setForm(EMPTY_FORM); setErrors({}); setEditingId(null); setShowForm(true) }, [])
  const handleEdit = useCallback((m: PayoutMethodEntry) => {
    setForm({ type: m.type, bankName: m.bankName ?? '', accountName: m.accountName ?? '', accountNumber: '', accountConfirm: '', branch: m.branch ?? '', walletNumber: m.walletNumber ?? '', isDefault: m.isDefault })
    setErrors({}); setEditingId(m.id); setShowForm(true)
  }, [])

  const handleSave = useCallback(async () => {
    const result = payoutSchema.safeParse({ payoutMethod: form.type, bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber, accountConfirm: form.accountConfirm, branch: form.branch, walletNumber: form.walletNumber, isDefault: form.isDefault })
    if (!result.success) {
      const ne: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const f = issue.path[0] as string
        const key = f === 'payoutMethod' ? 'type' : f
        if (!ne[key]) {
          const ek = key === 'bankName' ? 'errBankName' : key === 'accountName' ? 'errAccountName' : key === 'accountNumber' ? 'errAccountNumber' : key === 'accountConfirm' ? 'errAccountConfirm' : key === 'branch' ? 'errBranch' : key === 'walletNumber' ? 'errWallet' : null
          ne[key] = ek ? t(`seller.finance.methods.${ek}`) : issue.message
        }
      }
      setErrors(ne); return
    }
    setSaving(true)
    try {
      if (editingId) await updatePayoutMethod(editingId, { type: form.type, bankName: form.bankName || undefined, accountName: form.accountName || undefined, accountNumber: form.accountNumber || undefined, branch: form.branch || undefined, walletNumber: form.walletNumber || undefined, isDefault: form.isDefault })
      else await addPayoutMethod({ type: form.type, bankName: form.bankName || undefined, accountName: form.accountName || undefined, accountNumber: form.accountNumber || undefined, branch: form.branch || undefined, walletNumber: form.walletNumber || undefined, isDefault: form.isDefault })
      await loadMethods(); setShowForm(false); showToast(t('seller.finance.methods.saved'))
    } catch { setErrors({ form: t('seller.finance.methods.error') }) }
    setSaving(false)
  }, [form, editingId, t, loadMethods, showToast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deletePayoutMethod(deleteTarget.id); await loadMethods(); setDeleteTarget(null); showToast(t('seller.finance.methods.deleted'))
  }, [deleteTarget, loadMethods, showToast])

  const handleSetDefault = useCallback(async (id: string) => { await setDefaultPayoutMethod(id); await loadMethods() }, [loadMethods])
  const updateField = useCallback((field: keyof FormData, value: string | boolean) => { setForm(p => ({ ...p, [field]: value })); setErrors(p => ({ ...p, [field]: '' })) }, [])
  const isBank = form.type === 'bank'

  return (
    <Screen>
      <Container className="py-6 md:py-8">
        <Link href="/finance" className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text min-touch mb-4" aria-label={t('seller.finance.methods.back')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('seller.finance.methods.back')}
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-xl font-bold text-text">{t('seller.finance.methods.title')}</h1><p className="text-sm text-text-muted mt-0.5">{t('seller.finance.methods.subtitle')}</p></div>
          <button onClick={handleAdd} aria-label={t('seller.finance.methods.addAria')} className="min-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
            <Plus className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{t('seller.finance.methods.add')}</span>
          </button>
        </div>
        {loading ? (
          <div aria-busy="true" aria-label={t('seller.finance.methods.loading')} className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-surface border border-border-light animate-pulse" />)}
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-sm font-semibold text-text">{t('seller.finance.methods.emptyTitle')}</p>
            <p className="text-sm text-text-muted mt-1">{t('seller.finance.methods.emptySubtitle')}</p>
            <button onClick={handleAdd} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
              <Plus className="h-4 w-4" aria-hidden="true" />{t('seller.finance.methods.add')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map(m => {
              const Icon = TYPE_ICONS[m.type]
              return (
                <div key={m.id} className="rounded-lg bg-surface border border-border-light shadow-sm p-4 flex items-center gap-4" aria-label={t('seller.finance.methods.cardAria', { type: m.label, last4: m.accountMasked.slice(-4), default: m.isDefault ? `, ${t('seller.finance.methods.default')}` : '' })}>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary shrink-0"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-semibold text-text">{m.label}</p>{m.isDefault && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary text-white">{t('seller.finance.methods.default')}</span>}</div>
                    <p className="text-sm text-text-muted font-mono mt-0.5">{m.accountMasked}</p>
                    {m.bankName && <p className="text-xs text-text-tertiary mt-0.5">{m.bankName} · {m.branch}</p>}
                    {m.accountName && <p className="text-xs text-text-tertiary">{m.accountName}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!m.isDefault && <button onClick={() => handleSetDefault(m.id)} aria-label={t('seller.finance.methods.setDefaultAria', { method: m.label })} className="p-2 text-text-muted hover:text-primary rounded-md hover:bg-primary-50 transition-colors" title={t('seller.finance.methods.setDefault')}><Star className="h-4 w-4" /></button>}
                    <button onClick={() => handleEdit(m)} aria-label={t('seller.finance.methods.editAria', { method: m.label })} className="p-2 text-text-muted hover:text-text rounded-md hover:bg-background transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(m)} aria-label={t('seller.finance.methods.deleteAria', { method: m.label })} className="p-2 text-text-muted hover:text-error rounded-md hover:bg-error-light transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} onClick={() => !saving && setShowForm(false)} className="fixed inset-0 z-modal bg-overlay" aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-label={editingId ? t('seller.finance.methods.formTitleEdit') : t('seller.finance.methods.formTitleAdd')} className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={reduced ? false : { opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, scale: 0.95, y: 10 }} transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000 }} className="pointer-events-auto w-full max-w-md rounded-lg bg-surface border border-border-light shadow-xl p-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-bold text-text">{editingId ? t('seller.finance.methods.formTitleEdit') : t('seller.finance.methods.formTitleAdd')}</h2>
                  {!saving && <button onClick={() => setShowForm(false)} aria-label={t('seller.finance.methods.formCancel')} className="p-1 text-text-muted hover:text-text"><X className="h-5 w-5" /></button>}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-text block mb-1.5">{t('seller.finance.methods.formType')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['bank', 'esewa', 'khalti'] as FinancePayoutMethod[]).map(typ => (
                        <button key={typ} onClick={() => updateField('type', typ)} aria-pressed={form.type === typ} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${form.type === typ ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-background text-text-muted hover:text-text'}`}>
                          {typ === 'bank' ? t('seller.finance.methods.formTypeBank') : typ === 'esewa' ? t('seller.finance.methods.formTypeEsewa') : t('seller.finance.methods.formTypeKhalti')}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isBank ? (
                    <>
                      <div>
                        <label className="text-sm font-semibold text-text block mb-1.5">{t('seller.finance.methods.formBankName')}</label>
                        <div className="relative">
                          <button onClick={() => setBankOpen(o => !o)} aria-label={t('seller.finance.methods.formBankNameAria')} className="w-full min-touch flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text">
                            <span className={form.bankName ? 'text-text' : 'text-text-tertiary'}>{form.bankName || t('seller.finance.methods.formBankName')}</span><ChevronDown className="h-4 w-4 text-text-muted" />
                          </button>
                          {bankOpen && <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-lg border border-border bg-surface shadow-lg max-h-48 overflow-y-auto">{NEPAL_BANKS.map(b => <button key={b} onClick={() => { updateField('bankName', b); setBankOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-background text-text">{b}</button>)}</div>}
                        </div>
                        {errors.bankName && <p role="alert" className="text-xs text-error mt-1">{errors.bankName}</p>}
                      </div>
                      <FormField label={t('seller.finance.methods.formAccountName')} ariaLabel={t('seller.finance.methods.formAccountNameAria')} value={form.accountName} onChange={v => updateField('accountName', v)} error={errors.accountName} />
                      <FormField label={t('seller.finance.methods.formAccountNumber')} ariaLabel={t('seller.finance.methods.formAccountNumberAria')} value={form.accountNumber} onChange={v => updateField('accountNumber', v)} error={errors.accountNumber} />
                      <FormField label={t('seller.finance.methods.formAccountConfirm')} ariaLabel={t('seller.finance.methods.formAccountConfirmAria')} value={form.accountConfirm} onChange={v => updateField('accountConfirm', v)} error={errors.accountConfirm} />
                      <FormField label={t('seller.finance.methods.formBranch')} ariaLabel={t('seller.finance.methods.formBranchAria')} value={form.branch} onChange={v => updateField('branch', v)} error={errors.branch} />
                    </>
                  ) : <FormField label={t('seller.finance.methods.formWalletNumber')} ariaLabel={t('seller.finance.methods.formWalletNumberAria')} value={form.walletNumber} onChange={v => updateField('walletNumber', v.replace(/[^0-9]/g, ''))} error={errors.walletNumber} keyboardType="numeric" />}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isDefault} onChange={e => updateField('isDefault', e.target.checked)} aria-label={t('seller.finance.methods.formDefaultAria')} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
                    <span className="text-sm text-text">{t('seller.finance.methods.formDefault')}</span>
                  </label>
                  {errors.form && <p role="alert" className="text-sm text-error">{errors.form}</p>}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 min-touch rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text-muted hover:text-text">{t('seller.finance.methods.formCancel')}</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 min-touch rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">{saving ? t('seller.finance.methods.formSaving') : t('seller.finance.methods.formSave')}</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} onClick={() => setDeleteTarget(null)} className="fixed inset-0 z-modal bg-overlay" aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-label={t('seller.finance.methods.deleteConfirmTitle')} className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={reduced ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? undefined : { opacity: 0, scale: 0.95 }} transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000 }} className="pointer-events-auto w-full max-w-sm rounded-lg bg-surface border border-border-light shadow-xl p-5">
                <h2 className="text-base font-bold text-text mb-2">{t('seller.finance.methods.deleteConfirmTitle')}</h2>
                <p className="text-sm text-text-muted mb-4">{t('seller.finance.methods.deleteConfirmBody', { method: deleteTarget.label, account: deleteTarget.accountMasked })}</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 min-touch rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-text-muted">{t('seller.finance.methods.deleteConfirmCancel')}</button>
                  <button onClick={handleDelete} className="flex-1 min-touch rounded-lg bg-error px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">{t('seller.finance.methods.deleteConfirmCta')}</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <motion.div initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: 20 }} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-toast rounded-lg bg-text text-white px-4 py-2 text-sm font-semibold shadow-lg" role="status" aria-live="polite">{toast}</motion.div>}
      </AnimatePresence>
    </Screen>
  )
}

function FormField({ label, ariaLabel, value, onChange, error, keyboardType }: { label: string; ariaLabel: string; value: string; onChange: (v: string) => void; error?: string; keyboardType?: 'text' | 'numeric' }) {
  return (
    <div>
      <label className="text-sm font-semibold text-text block mb-1.5">{label}</label>
      <input type="text" inputMode={keyboardType === 'numeric' ? 'numeric' : undefined} value={value} onChange={e => onChange(e.target.value)} aria-label={ariaLabel} aria-invalid={!!error} className={`w-full min-touch rounded-lg border bg-background px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 ${error ? 'border-error' : 'border-border focus:border-primary'}`} />
      {error && <p role="alert" className="text-xs text-error mt-1">{error}</p>}
    </div>
  )
}
