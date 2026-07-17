'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, Info, X, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { duration } from '@chinooz/theme'
import {
  getFinancePayoutById,
  exportFinancePayoutStatementCSV,
  formatNPRAmount,
  type FinancePayoutDetail,
  type FinancePayoutStatus,
} from '@chinooz/mock-data'

const STATUS_STYLES: Record<FinancePayoutStatus, { bg: string; text: string; labelKey: string }> = {
  scheduled: { bg: 'bg-info-light', text: 'text-info', labelKey: 'statusScheduled' },
  processing: { bg: 'bg-warning-light', text: 'text-warning', labelKey: 'statusProcessing' },
  paid: { bg: 'bg-success-light', text: 'text-success', labelKey: 'statusPaid' },
  failed: { bg: 'bg-error-light', text: 'text-error', labelKey: 'statusFailed' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return (
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

function signedAmount(amount: number, direction: 'credit' | 'debit'): string {
  const sign = direction === 'credit' ? '+' : '−'
  return `${sign}${formatNPRAmount(Math.abs(amount))}`
}

export default function PayoutDetailScreen() {
  const { t } = useTranslation()
  const params = useParams()
  const reduced = useReducedMotion()
  const id = params.id as string
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [detail, setDetail] = useState<FinancePayoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [explainerOpen, setExplainerOpen] = useState<string | null>(null)
  const [downloadToast, setDownloadToast] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance-payout-detail' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn || !id) return
    setLoading(true)
    let active = true
    getFinancePayoutById(id)
      .then((d: FinancePayoutDetail | null) => {
        if (!active) return
        setDetail(d)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setDetail(null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, isLoggedIn])

  const handleDownload = useCallback(() => {
    if (!detail) return
    const csv = exportFinancePayoutStatementCSV(detail)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payout-${detail.id}-${detail.date.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadToast(true)
    setTimeout(() => setDownloadToast(false), 2500)
  }, [detail])

  if (loading) {
    return (
      <Screen>
        <Container className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-32 bg-shimmer rounded" />
            <div className="h-8 w-64 bg-shimmer rounded" />
            <div className="h-32 bg-surface border border-border-light rounded-lg" />
            <div className="h-48 bg-surface border border-border-light rounded-lg" />
          </div>
        </Container>
      </Screen>
    )
  }

  if (!detail) {
    return (
      <Screen>
        <Container className="py-8">
          <Link
            href="/finance/payouts"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t('seller.finance.payouts.detail.back')}
          </Link>
          <p className="mt-8 text-center text-text-muted">{t('seller.finance.payouts.error')}</p>
        </Container>
      </Screen>
    )
  }

  const st = STATUS_STYLES[detail.status]

  return (
    <Screen>
      <Container className="py-6 md:py-8">
        <Link
          href="/finance/payouts"
          className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text min-touch mb-4"
          aria-label={t('seller.finance.payouts.detail.back')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('seller.finance.payouts.detail.back')}
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">
              {t('seller.finance.payouts.detail.title')}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {formatDate(detail.date)} · {detail.methodLabel} · {detail.accountMasked}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${st.bg} ${st.text}`}
          >
            {t(`seller.finance.payouts.${st.labelKey}`)}
          </span>
        </div>

        <div className="grid md:grid-cols-12 gap-4">
          <section className="md:col-span-7 rounded-lg bg-surface border border-border-light shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text">
                {t('seller.finance.payouts.detail.breakdown')}
              </h2>
              <button
                onClick={handleDownload}
                aria-label={t('seller.finance.payouts.detail.downloadAria')}
                className="min-touch inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark transition-colors"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t('seller.finance.payouts.detail.download')}
              </button>
            </div>

            <dl className="space-y-3">
              {detail.breakdown.map((row, i) => {
                const isTotal = row.label === 'Net payout'
                return (
                  <div key={i}>
                    <div
                      className={`flex items-center justify-between ${isTotal ? 'pt-3 border-t border-border-light' : ''}`}
                    >
                      <dt className="flex items-center gap-1.5">
                        <span
                          className={`${isTotal ? 'text-sm font-bold text-text' : 'text-sm text-text-muted'}`}
                        >
                          {row.label}
                        </span>
                        {row.explainer && (
                          <button
                            onClick={() =>
                              setExplainerOpen(explainerOpen === row.label ? null : row.label)
                            }
                            aria-label={t('seller.finance.payouts.detail.explainer')}
                            aria-expanded={explainerOpen === row.label}
                            className="p-0.5 text-text-tertiary hover:text-primary"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </dt>
                      <dd
                        className={`tabular-nums ${isTotal ? 'text-lg font-bold text-text' : 'text-sm font-medium'} ${
                          row.direction === 'credit' ? 'text-success' : 'text-error'
                        }`}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                        aria-label={`${row.label}: ${signedAmount(row.amount, row.direction)} NPR`}
                      >
                        {signedAmount(row.amount, row.direction)}
                      </dd>
                    </div>
                    <AnimatePresence>
                      {explainerOpen === row.label && row.explainer && (
                        <motion.p
                          initial={reduced ? false : { height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={reduced ? undefined : { height: 0, opacity: 0 }}
                          transition={
                            reduced ? { duration: 0 } : { duration: duration.normal / 1000 }
                          }
                          className="text-xs text-text-muted mt-1.5 overflow-hidden"
                        >
                          {row.explainer}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </dl>

            {detail.status === 'failed' && detail.failureReason && (
              <div className="mt-4 p-3 rounded-lg bg-error-light border border-error/20">
                <p className="text-xs font-semibold text-error">
                  {t('seller.finance.payouts.detail.failureReason')}
                </p>
                <p className="text-sm text-error mt-0.5">{detail.failureReason}</p>
              </div>
            )}
          </section>

          <div className="md:col-span-5 flex flex-col gap-4">
            <section className="rounded-lg bg-surface border border-border-light shadow-sm p-5">
              <h2 className="text-sm font-semibold text-text mb-4">
                {t('seller.finance.payouts.detail.timeline')}
              </h2>
              <div
                className="space-y-0"
                role="list"
                aria-label={t('seller.finance.payouts.detail.timeline')}
              >
                {detail.timeline.map((step, i) => {
                  const isCompleted = step.status === 'completed'
                  const isCurrent = step.status === 'current'
                  const isLast = i === detail.timeline.length - 1
                  const isFailed = step.key === 'failed'
                  return (
                    <div key={step.key} className="flex gap-3" role="listitem">
                      <div className="flex flex-col items-center" style={{ width: 24 }}>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                            isFailed
                              ? 'bg-error-light border-error'
                              : isCompleted || isCurrent
                                ? 'bg-primary border-primary'
                                : 'bg-surface border-border'
                          }`}
                          aria-label={`${step.label}, ${step.status}`}
                        >
                          {(isCompleted || isCurrent) && !isFailed && (
                            <span className="text-xs text-white">✓</span>
                          )}
                          {isFailed && <span className="text-xs text-error">✕</span>}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[32px] mt-1 ${isFailed ? 'bg-error' : isCompleted || isCurrent ? 'bg-primary' : 'bg-border'}`}
                          />
                        )}
                      </div>
                      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-3'}`}>
                        <p
                          className={`text-sm ${isFailed ? 'text-error font-semibold' : isCompleted || isCurrent ? 'text-text font-semibold' : 'text-text-muted'}`}
                        >
                          {step.label}
                        </p>
                        {step.timestamp && (
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatDateTime(step.timestamp)}
                          </p>
                        )}
                        {step.note && (
                          <p
                            className={`text-xs mt-0.5 ${isFailed ? 'text-error' : 'text-text-tertiary'}`}
                          >
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-lg bg-surface border border-border-light shadow-sm p-5">
              <h2 className="text-sm font-semibold text-text mb-3">
                {t('seller.finance.payouts.detail.amount')}
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">{t('seller.finance.payouts.detail.date')}</dt>
                  <dd className="text-text">{formatDate(detail.date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">{t('seller.finance.payouts.detail.method')}</dt>
                  <dd className="text-text">{detail.methodLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">{t('seller.finance.payouts.detail.account')}</dt>
                  <dd className="font-mono text-text">{detail.accountMasked}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">
                    {t('seller.finance.payouts.detail.orderCount')}
                  </dt>
                  <dd className="text-text">{detail.orderCount}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-border-light">
                  <dt className="font-bold text-text">
                    {t('seller.finance.payouts.detail.netPayout')}
                  </dt>
                  <dd
                    className="font-bold tabular-nums text-primary"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    NPR {formatNPRAmount(detail.netPayout)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <section className="mt-6 rounded-lg bg-surface border border-border-light shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-text p-4 border-b border-border-light">
            {t('seller.finance.payouts.detail.lineItems')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" role="table">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'order', label: 'colOrder', cls: 'text-left' },
                    { key: 'date', label: 'colDate', cls: 'text-left' },
                    { key: 'gross', label: 'colGross', cls: 'text-right' },
                    {
                      key: 'commission',
                      label: 'colCommission',
                      cls: 'text-right hidden lg:table-cell',
                    },
                    {
                      key: 'paymentFee',
                      label: 'colPaymentFee',
                      cls: 'text-right hidden lg:table-cell',
                    },
                    { key: 'refund', label: 'colRefund', cls: 'text-right hidden md:table-cell' },
                    { key: 'net', label: 'colNet', cls: 'text-right' },
                  ].map(col => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-4 py-2 text-[12px] font-semibold text-text-muted ${col.cls}`}
                    >
                      {t(`seller.finance.payouts.detail.${col.label}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.lineItems.map(li => (
                  <tr key={li.orderId} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${li.orderId}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {li.orderId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatDate(li.date)}</td>
                    <td
                      className="px-4 py-3 text-sm text-right tabular-nums text-text"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      NPR {formatNPRAmount(li.gross)}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right tabular-nums text-error hidden lg:table-cell"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      −{formatNPRAmount(li.commission)}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right tabular-nums text-error hidden lg:table-cell"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      −{formatNPRAmount(li.paymentFee)}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right tabular-nums text-error hidden md:table-cell"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {li.refund > 0 ? `−${formatNPRAmount(li.refund)}` : '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right tabular-nums font-semibold text-text"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      NPR {formatNPRAmount(li.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>

      <AnimatePresence>
        {downloadToast && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-toast rounded-lg bg-text text-white px-4 py-2 text-sm font-semibold shadow-lg"
            role="status"
            aria-live="polite"
          >
            {t('seller.finance.payouts.detail.downloadDone')}
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  )
}
