'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ArrowLeft, Wallet, Banknote, CreditCard, Download } from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useA11y } from '@/components/A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  getFinanceSummary,
  FINANCE_DATE_RANGES,
  formatNPRAmount,
  type FinanceRange,
  type FinanceRangeKey,
  type FinanceSummary,
} from '@chinooz/mock-data'
import EarningsChart from '@/components/EarningsChart'
import WithdrawSheet from '@/components/WithdrawSheet'

function useCountUp(target: number, enabled: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, enabled, durationMs])
  return value
}

const RANGE_LABEL_KEY: Record<FinanceRangeKey, string> = {
  today: 'rangeToday',
  '7d': 'range7d',
  '30d': 'range30d',
  month: 'rangeMonth',
  custom: 'rangeCustom',
}

export default function FinanceScreen() {
  const { t } = useTranslation()
  const { reducedMotion } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [rangeKey, setRangeKey] = useState<FinanceRangeKey>('30d')
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [availBalance, setAvailBalance] = useState(0)
  const [pendingBalanceState, setPendingBalanceState] = useState(0)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    const meta = FINANCE_DATE_RANGES.find(r => r.key === rangeKey)
    const range: FinanceRange = {
      key: rangeKey,
      label: meta?.label ?? '30d',
      days: meta?.days ?? 30,
    }
    let active = true
    getFinanceSummary(range).then(data => {
      if (!active) return
      setSummary(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [rangeKey, isLoggedIn])

  const available = summary?.availableBalance ?? 0
  const animatedAvailable = useCountUp(available, !loading && !reducedMotion)
  const heroAvailable = loading ? available : animatedAvailable
  const heroPending = summary?.pendingBalance ?? 0

  const cards = useMemo(() => {
    if (!summary) return [] as { label: string; value: string }[]
    return [
      { label: t('seller.finance.cardLifetime'), value: `NPR ${formatNPRAmount(summary.lifetimeEarnings)}` },
      { label: t('seller.finance.cardPeriodNet'), value: `NPR ${formatNPRAmount(summary.thisPeriodNet)}` },
      { label: t('seller.finance.cardPendingPayout'), value: `NPR ${formatNPRAmount(summary.pendingPayout)}` },
      { label: t('seller.finance.cardNextPayout'), value: summary.nextScheduledPayoutDate },
    ]
  }, [summary, t])

  const entries = [
    {
      icon: Banknote,
      title: t('seller.finance.entryTransactions'),
      sub: t('seller.finance.entryTransactionsSub'),
      aria: t('seller.finance.entryTransactionsAria'),
      href: '/finance/transactions',
    },
    {
      icon: Wallet,
      title: t('seller.finance.entryPayouts'),
      sub: t('seller.finance.entryPayoutsSub'),
      aria: t('seller.finance.entryPayoutsAria'),
      href: '/finance/payouts',
    },
    {
      icon: CreditCard,
      title: t('seller.finance.entryPayoutMethods'),
      sub: t('seller.finance.entryPayoutMethodsSub'),
      aria: t('seller.finance.entryPayoutMethodsAria'),
      href: '/finance/payout-methods',
    },
  ]

  const heroAria = summary
    ? t('seller.finance.heroAria', {
        available: formatNPRAmount(summary.availableBalance),
        pending: formatNPRAmount(summary.pendingBalance),
      })
    : t('seller.finance.loading')

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="flex items-center gap-3 mb-5">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text min-touch"
              aria-label={t('seller.finance.moreBack')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('seller.finance.moreBack')}
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-text">{t('seller.finance.title')}</h1>
          <p className="text-text-muted mb-6">{t('seller.finance.subtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <section
              aria-label={heroAria}
              className="md:col-span-4 relative overflow-hidden rounded-lg bg-surface border border-border-light shadow-md p-5 flex flex-col"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gold" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-medium text-text-muted tracking-wide uppercase">
                  {t('seller.finance.heroAvailable')}
                </p>
                <p
                  className="mt-2 text-[32px] leading-none font-bold tabular-nums text-primary"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  NPR {formatNPRAmount(heroAvailable)}
                </p>
                <div className="mt-4 pt-4 border-t border-border-light">
                  <p className="text-xs font-medium text-text-muted">
                    {t('seller.finance.heroPending')}
                  </p>
                  <p
                    className="mt-1 text-sm font-medium tabular-nums text-text-muted"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    NPR {formatNPRAmount(heroPending)}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {t('seller.finance.heroPendingHint')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWithdrawOpen(true)}
                aria-label={t('seller.finance.withdrawAria', {
                  amount: formatNPRAmount(summary?.availableBalance ?? 0),
                })}
                className="mt-5 min-touch w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-white font-semibold hover:bg-primary-dark transition-colors"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('seller.finance.withdraw')}
              </button>
            </section>

            <div className="md:col-span-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-surface border border-border-light shadow-sm p-4 animate-pulse"
                    >
                      <div className="h-3 w-20 bg-shimmer rounded" />
                      <div className="mt-3 h-6 w-24 bg-shimmer rounded" />
                    </div>
                  ))
                : cards.map(card => (
                    <div
                      key={card.label}
                      className="rounded-lg bg-surface border border-border-light shadow-sm p-4 flex flex-col"
                    >
                      <p className="text-xs font-medium text-text-muted">{card.label}</p>
                      <p
                        className="mt-2 text-[22px] leading-tight font-bold tabular-nums text-text"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {card.value}
                      </p>
                    </div>
                  ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-surface border border-border-light shadow-sm p-4 md:p-5">
            <div
              role="tablist"
              aria-label={t('seller.finance.rangeAriaLabel')}
              className="flex flex-wrap gap-2"
            >
              {FINANCE_DATE_RANGES.map(r => {
                const active = r.key === rangeKey
                const label = t(`seller.finance.${RANGE_LABEL_KEY[r.key]}`)
                return (
                  <button
                    key={r.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setRangeKey(r.key)}
                    className={`min-touch rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-muted border border-border hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="mt-5">
              <p className="text-xs font-medium text-text-muted mb-3">
                {t('seller.finance.chartNetEarnings')}
              </p>
              <EarningsChart series={summary?.earnings ?? null} loading={loading} />
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text-muted mb-2">
              {t('seller.finance.sectionManage')}
            </h2>
            <div className="rounded-lg bg-surface border border-border-light shadow-sm overflow-hidden">
              {entries.map((e, i) => {
                const Icon = e.icon
                return (
                  <Link
                    key={e.title}
                    href={e.href}
                    aria-label={e.aria}
                    className={`flex items-center gap-3 min-h-[56px] px-4 py-3 hover:bg-background transition-colors ${
                      i > 0 ? 'border-t border-border-light' : ''
                    }`}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-text">{e.title}</span>
                      <span className="block text-xs text-text-muted truncate">{e.sub}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </Container>
      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={summary?.availableBalance ?? 0}
        pendingBalance={summary?.pendingBalance ?? 0}
        onBalancesUpdate={(avail, pend) => {
          setSummary(prev =>
            prev ? { ...prev, availableBalance: avail, pendingBalance: pend } : prev,
          )
        }}
      />
    </Screen>
  )
}
