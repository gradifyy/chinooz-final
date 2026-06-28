'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, ChevronRight } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { duration } from '@chinooz/theme'
import {
  requestWithdraw,
  getWithdrawMethods,
  rollbackWithdraw,
  formatNPRAmount,
  MIN_WITHDRAWAL,
  type WithdrawMethod,
} from '@chinooz/mock-data'

type Step = 'form' | 'confirm' | 'submitting' | 'success' | 'error'

interface Props {
  open: boolean
  onClose: () => void
  availableBalance: number
  pendingBalance: number
  onBalancesUpdate: (available: number, pending: number) => void
}

export default function WithdrawSheet({
  open,
  onClose,
  availableBalance,
  pendingBalance,
  onBalancesUpdate,
}: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [step, setStep] = useState<Step>('form')
  const [amountStr, setAmountStr] = useState('')
  const [methods, setMethods] = useState<WithdrawMethod[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<{
    payoutId?: string
    newAvailable?: number
    newPending?: number
  }>({})

  useEffect(() => {
    if (!open) return
    setStep('form')
    setAmountStr('')
    setErrorMsg('')
    setResult({})
    setMethodsLoading(true)
    let active = true
    getWithdrawMethods().then(ms => {
      if (!active) return
      setMethods(ms)
      const def = ms.find(m => m.isDefault)
      setSelectedMethodId(def?.id ?? ms[0]?.id ?? null)
      setMethodsLoading(false)
    })
    return () => {
      active = false
    }
  }, [open])

  const amount = useMemo(() => parseInt(amountStr || '0', 10) || 0, [amountStr])

  const validationError = useMemo(() => {
    if (amount === 0) return ''
    if (amount < MIN_WITHDRAWAL) return t('seller.finance.withdraw.minError', { min: formatNPRAmount(MIN_WITHDRAWAL) })
    if (amount > availableBalance) return t('seller.finance.withdraw.maxError')
    return ''
  }, [amount, availableBalance, t])

  const hasMethods = methods.length > 0
  const canProceed = amount >= MIN_WITHDRAWAL && amount <= availableBalance && !!selectedMethodId && hasMethods

  const selectedMethod = methods.find(m => m.id === selectedMethodId)

  const handleAll = useCallback(() => {
    setAmountStr(String(availableBalance))
  }, [availableBalance])

  const handleConfirm = useCallback(async () => {
    if (!selectedMethodId) return
    setStep('submitting')
    setErrorMsg('')

    // Optimistic balance update
    const prevAvailable = availableBalance
    const prevPending = pendingBalance
    onBalancesUpdate(prevAvailable - amount, prevPending + amount)

    try {
      const res = await requestWithdraw({ amount, methodId: selectedMethodId })
      if (res.success) {
        setResult({
          payoutId: res.payoutId,
          newAvailable: res.newAvailableBalance,
          newPending: res.newPendingBalance,
        })
        setStep('success')
      } else {
        // Rollback
        rollbackWithdraw(amount)
        onBalancesUpdate(prevAvailable, prevPending)
        const errKey =
          res.error === 'below_minimum'
            ? 'errorBelowMin'
            : res.error === 'exceeds_available'
              ? 'errorExceeds'
              : res.error === 'no_method'
                ? 'errorNoMethod'
                : res.error === 'service_unavailable'
                  ? 'errorService'
                  : 'errorGeneric'
        setErrorMsg(t(`seller.finance.withdraw.${errKey}`, { min: formatNPRAmount(MIN_WITHDRAWAL) }))
        setStep('error')
      }
    } catch {
      rollbackWithdraw(amount)
      onBalancesUpdate(prevAvailable, prevPending)
      setErrorMsg(t('seller.finance.withdraw.errorGeneric'))
      setStep('error')
    }
  }, [amount, selectedMethodId, availableBalance, pendingBalance, onBalancesUpdate, t])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-modal bg-overlay"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('seller.finance.withdraw.title')}
            className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.95, y: 10 }}
              transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000 }}
              className="pointer-events-auto w-full max-w-md rounded-lg bg-surface border border-border-light shadow-xl p-5 max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {t('seller.finance.withdraw.title')}
                  </h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    {t('seller.finance.withdraw.subtitle')}
                  </p>
                </div>
                {step !== 'submitting' && (
                  <button
                    onClick={handleClose}
                    aria-label={t('seller.finance.withdraw.cancel')}
                    className="p-1 text-text-muted hover:text-text"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Form step */}
              {step === 'form' && (
                <div className="space-y-4">
                  {/* Amount input */}
                  <div>
                    <label className="text-sm font-semibold text-text block mb-1.5">
                      {t('seller.finance.withdraw.amountLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">
                          NPR
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={amountStr}
                          onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={t('seller.finance.withdraw.amountPlaceholder')}
                          aria-label={t('seller.finance.withdraw.amountAria', { max: formatNPRAmount(availableBalance) })}
                          aria-invalid={!!validationError}
                          className="w-full min-touch pl-12 pr-4 rounded-lg border border-border bg-background text-lg font-bold tabular-nums text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        />
                      </div>
                      <button
                        onClick={handleAll}
                        aria-label={t('seller.finance.withdraw.allAria', { amount: formatNPRAmount(availableBalance) })}
                        className="min-touch rounded-lg bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary-50/70 transition-colors"
                      >
                        {t('seller.finance.withdraw.all')}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">
                      {t('seller.finance.withdraw.available')}: NPR {formatNPRAmount(availableBalance)}
                    </p>
                    {validationError && (
                      <p role="alert" className="text-xs text-error mt-1.5 font-medium">
                        {validationError}
                      </p>
                    )}
                  </div>

                  {/* Method picker */}
                  <div>
                    <label className="text-sm font-semibold text-text block mb-1.5">
                      {t('seller.finance.withdraw.methodLabel')}
                    </label>
                    {methodsLoading ? (
                      <div className="h-12 rounded-lg bg-background animate-pulse" />
                    ) : hasMethods ? (
                      <div
                        role="radiogroup"
                        aria-label={t('seller.finance.withdraw.methodAria')}
                        className="space-y-2"
                      >
                        {methods.map(m => (
                          <button
                            key={m.id}
                            role="radio"
                            aria-checked={selectedMethodId === m.id}
                            onClick={() => setSelectedMethodId(m.id)}
                            className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                              selectedMethodId === m.id
                                ? 'border-primary bg-primary-50'
                                : 'border-border bg-background hover:border-primary/30'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-text">{m.label}</p>
                              <p className="text-xs text-text-muted font-mono">{m.accountMasked}</p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedMethodId === m.id ? 'border-primary bg-primary' : 'border-border'
                              }`}
                            >
                              {selectedMethodId === m.id && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center">
                        <p className="text-sm text-text-muted">{t('seller.finance.withdraw.methodNone')}</p>
                        <button className="text-sm font-semibold text-primary mt-1 hover:underline">
                          {t('seller.finance.withdraw.methodAdd')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {amount > 0 && !validationError && selectedMethodId && (
                    <div className="rounded-lg bg-background border border-border-light p-4 space-y-2" role="status">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {t('seller.finance.withdraw.summary')}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">{t('seller.finance.withdraw.summaryAmount')}</span>
                        <span className="tabular-nums font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          NPR {formatNPRAmount(amount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">{t('seller.finance.withdraw.summaryFee')}</span>
                        <span className="text-success font-medium">{t('seller.finance.withdraw.summaryFeeNone')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">{t('seller.finance.withdraw.summaryArrival')}</span>
                        <span className="text-text">{t('seller.finance.withdraw.summaryArrivalValue')}</span>
                      </div>
                    </div>
                  )}

                  {/* No method error */}
                  {!methodsLoading && !hasMethods && (
                    <p role="alert" className="text-sm text-error font-medium">
                      {t('seller.finance.withdraw.noMethodError')}
                    </p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={!canProceed}
                    aria-label={t('seller.finance.withdraw.confirm')}
                    className="w-full min-touch rounded-lg bg-primary px-4 py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
                  >
                    {t('seller.finance.withdraw.confirm')}
                  </button>
                </div>
              )}

              {/* Confirm step */}
              {step === 'confirm' && selectedMethod && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-primary-50 border border-primary/20 p-4">
                    <p className="text-sm text-text">
                      {t('seller.finance.withdraw.confirmBody', {
                        amount: formatNPRAmount(amount),
                        method: `${selectedMethod.label} ${selectedMethod.accountMasked}`,
                      })}
                    </p>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-text-muted">{t('seller.finance.withdraw.confirmAmount')}</dt>
                      <dd className="tabular-nums font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        NPR {formatNPRAmount(amount)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">{t('seller.finance.withdraw.confirmDestination')}</dt>
                      <dd className="text-text font-semibold">{selectedMethod.label} · {selectedMethod.accountMasked}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">{t('seller.finance.withdraw.confirmArrival')}</dt>
                      <dd className="text-text">{t('seller.finance.withdraw.summaryArrivalValue')}</dd>
                    </div>
                  </dl>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('form')}
                      className="flex-1 min-touch rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-text-muted hover:text-text transition-colors"
                    >
                      {t('seller.finance.withdraw.back')}
                    </button>
                    <button
                      onClick={handleConfirm}
                      aria-label={t('seller.finance.withdraw.confirmCtaAria', {
                        amount: formatNPRAmount(amount),
                        destination: `${selectedMethod.label} ${selectedMethod.accountMasked}`,
                      })}
                      className="flex-1 min-touch rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                      {t('seller.finance.withdraw.confirmCta')}
                    </button>
                  </div>
                </div>
              )}

              {/* Submitting step */}
              {step === 'submitting' && (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 mb-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-text" role="status">
                    {t('seller.finance.withdraw.submitting')}
                  </p>
                </div>
              )}

              {/* Success step */}
              {step === 'success' && (
                <div className="py-6 text-center" role="status" aria-live="polite">
                  <motion.div
                    initial={reduced ? false : { scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={reduced ? { duration: 0 } : { type: 'spring', damping: 15, stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 relative"
                  >
                    <div className="absolute inset-0 rounded-full bg-success-light" />
                    <div className="absolute inset-0 rounded-full border-4 border-gold/30" />
                    <Check className="h-8 w-8 text-success relative z-10" />
                  </motion.div>

                  <h3 className="text-lg font-bold text-text mb-1">
                    {t('seller.finance.withdraw.successTitle')}
                  </h3>
                  <p className="text-sm text-text-muted mb-4">
                    {t('seller.finance.withdraw.successBody', {
                      amount: formatNPRAmount(amount),
                      method: selectedMethod?.label ?? '',
                    })}
                  </p>

                  {result.payoutId && (
                    <p className="text-xs text-text-tertiary mb-4 font-mono">
                      {t('seller.finance.withdraw.successPayoutId')}: {result.payoutId}
                    </p>
                  )}

                  <dl className="space-y-2 text-sm text-left max-w-xs mx-auto mb-5">
                    <div className="flex justify-between">
                      <dt className="text-text-muted">{t('seller.finance.withdraw.successNewAvailable')}</dt>
                      <dd className="tabular-nums font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        NPR {formatNPRAmount(result.newAvailable ?? availableBalance - amount)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-muted">{t('seller.finance.withdraw.successNewPending')}</dt>
                      <dd className="tabular-nums font-semibold text-text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        NPR {formatNPRAmount(result.newPending ?? pendingBalance + amount)}
                      </dd>
                    </div>
                  </dl>

                  <button
                    onClick={handleClose}
                    className="w-full min-touch rounded-lg bg-primary px-4 py-3 text-white font-semibold hover:bg-primary-dark transition-colors"
                  >
                    {t('seller.finance.withdraw.successClose')}
                  </button>
                </div>
              )}

              {/* Error step */}
              {step === 'error' && (
                <div className="py-6 text-center" role="alert" aria-live="assertive">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error-light mb-3">
                    <AlertCircle className="h-7 w-7 text-error" />
                  </div>
                  <h3 className="text-base font-bold text-text mb-2">
                    {t('seller.finance.withdraw.errorGeneric')}
                  </h3>
                  {errorMsg && (
                    <p className="text-sm text-error mb-4">{errorMsg}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 min-touch rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-text-muted"
                    >
                      {t('seller.finance.withdraw.cancel')}
                    </button>
                    <button
                      onClick={() => setStep('form')}
                      className="flex-1 min-touch rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                      {t('seller.finance.withdraw.retry')}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
