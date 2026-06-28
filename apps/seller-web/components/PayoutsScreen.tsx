'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPRAmount, getFinancePayouts, type FinancePayout, type FinancePayoutStatus } from '@chinooz/mock-data'

const STATUS_STYLES: Record<FinancePayoutStatus, { bg: string; text: string; labelKey: string }> = {
  scheduled: { bg: 'bg-info-light', text: 'text-info', labelKey: 'statusScheduled' },
  processing: { bg: 'bg-warning-light', text: 'text-warning', labelKey: 'statusProcessing' },
  paid: { bg: 'bg-success-light', text: 'text-success', labelKey: 'statusPaid' },
  failed: { bg: 'bg-error-light', text: 'text-error', labelKey: 'statusFailed' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PayoutsScreen() {
  const { t } = useTranslation()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [payouts, setPayouts] = useState<FinancePayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance-payouts' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    setError(false)
    let active = true
    getFinancePayouts()
      .then(data => {
        if (!active) return
        setPayouts(data)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isLoggedIn])

  return (
    <Screen>
      <Container className="py-6 md:py-8">
        <Link
          href="/finance"
          className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text min-touch mb-4"
          aria-label={t('seller.finance.payouts.back')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('seller.finance.payouts.back')}
        </Link>

        <h1 className="text-xl font-bold text-text mb-1">{t('seller.finance.payouts.title')}</h1>
        <p className="text-sm text-text-muted mb-6">{t('seller.finance.payouts.subtitle')}</p>

        {loading ? (
          <div aria-busy="true" aria-label={t('seller.finance.payouts.loading')}>
            <div className="md:hidden flex flex-col gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-lg bg-surface border border-border-light animate-pulse" />
              ))}
            </div>
            <div className="hidden md:block overflow-hidden rounded-lg border border-border-light">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 border-b border-border-light bg-surface animate-pulse" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-sm font-semibold text-text">{t('seller.finance.payouts.error')}</p>
            <button
              onClick={() => setPayouts([])}
              className="mt-3 px-4 py-2 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary-50"
            >
              {t('seller.finance.payouts.retry')}
            </button>
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-sm font-semibold text-text">{t('seller.finance.payouts.emptyTitle')}</p>
            <p className="text-sm text-text-muted mt-1">{t('seller.finance.payouts.emptySubtitle')}</p>
          </div>
        ) : (
          <>
            <span className="sr-only" aria-live="polite">
              {t('seller.finance.payouts.count', { count: payouts.length })}
            </span>

            <div className="md:hidden flex flex-col gap-3">
              {payouts.map(p => {
                const st = STATUS_STYLES[p.status]
                return (
                  <Link
                    key={p.id}
                    href={`/finance/payouts/${p.id}`}
                    aria-label={t('seller.finance.payouts.rowAria', {
                      amount: formatNPRAmount(p.amount),
                      date: formatDate(p.date),
                      method: p.methodLabel,
                      status: t(`seller.finance.payouts.${st.labelKey}`),
                    })}
                    className="block rounded-lg bg-surface border border-border-light p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text">{formatDate(p.date)}</p>
                        <p className="text-xs text-text-muted mt-0.5">{p.methodLabel} · {p.accountMasked}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{t('seller.finance.payouts.orders', { count: p.orderCount })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          NPR {formatNPRAmount(p.amount)}
                        </p>
                        <span className={`mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${st.bg} ${st.text}`}>
                          {t(`seller.finance.payouts.${st.labelKey}`)}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="hidden md:block overflow-x-auto rounded-lg border border-border-light bg-surface">
              <table className="w-full border-collapse" role="table">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    {[
                      { key: 'date', label: 'colDate', cls: 'text-left' },
                      { key: 'amount', label: 'colAmount', cls: 'text-right' },
                      { key: 'method', label: 'colMethod', cls: 'text-left' },
                      { key: 'status', label: 'colStatus', cls: 'text-left' },
                    ].map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-4 py-2.5 text-[12px] font-semibold text-text-muted ${col.cls}`}
                      >
                        {t(`seller.finance.payouts.${col.label}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => {
                    const st = STATUS_STYLES[p.status]
                    return (
                      <tr
                        key={p.id}
                        onClick={() => (window.location.href = `/finance/payouts/${p.id}`)}
                        className="border-b border-[#E5E5E5] last:border-b-0 cursor-pointer hover:bg-background transition-colors"
                        role="button"
                        tabIndex={0}
                        aria-label={t('seller.finance.payouts.rowAria', {
                          amount: formatNPRAmount(p.amount),
                          date: formatDate(p.date),
                          method: p.methodLabel,
                          status: t(`seller.finance.payouts.${st.labelKey}`),
                        })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            window.location.href = `/finance/payouts/${p.id}`
                          }
                        }}
                      >
                        <td className="px-4 py-3.5 text-sm text-text">{formatDate(p.date)}</td>
                        <td className="px-4 py-3.5 text-sm text-right tabular-nums font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          NPR {formatNPRAmount(p.amount)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-text-secondary">
                          {p.methodLabel} · <span className="text-text-muted">{p.accountMasked}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${st.bg} ${st.text}`}>
                            {t(`seller.finance.payouts.${st.labelKey}`)}
                          </span>
                          {p.status === 'failed' && p.failureReason && (
                            <p className="text-xs text-error mt-1">{p.failureReason}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Container>
    </Screen>
  )
}
