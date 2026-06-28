'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { Container, Screen, useReducedMotion } from '@chinooz/ui-web'
import { useSellerCategories, useSellerProducts } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics as tracker } from '@chinooz/analytics'
import {
  getAnalytics,
  ANALYTICS_RANGES,
  type AnalyticsSection,
  type AnalyticsRange,
  type AnalyticsRangeKey,
  type AnalyticsSectionData,
  type AnalyticsFilter,
} from '@chinooz/mock-data'

type SectionKey = AnalyticsSection

const SECTIONS: { key: SectionKey; labelKey: string }[] = [
  { key: 'sales', labelKey: 'seller.analytics.sectionSales' },
  { key: 'traffic', labelKey: 'seller.analytics.sectionTraffic' },
  { key: 'products', labelKey: 'seller.analytics.sectionProducts' },
  { key: 'customers', labelKey: 'seller.analytics.sectionCustomers' },
]

const RANGE_LABEL_KEY: Record<AnalyticsRangeKey, string> = {
  today: 'rangeToday',
  '7d': 'range7d',
  '30d': 'range30d',
  '90d': 'range90d',
  this_month: 'rangeMonth',
  custom: 'rangeCustom',
}

function trendCls(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'text-success' : t === 'down' ? 'text-error' : 'text-text-muted'
}

export default function AnalyticsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const { data: sellerCats } = useSellerCategories()
  const { data: sellerProds } = useSellerProducts({})

  const [section, setSection] = useState<SectionKey>('sales')
  const [rangeKey, setRangeKey] = useState<AnalyticsRangeKey>('30d')
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [compare, setCompare] = useState(false)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [productId, setProductId] = useState<string | undefined>(undefined)

  useEffect(() => {
    tracker.screen({ name: 'seller-analytics' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  const range: AnalyticsRange = useMemo(() => {
    const meta = ANALYTICS_RANGES.find(r => r.key === rangeKey)
    return {
      key: rangeKey,
      label: meta?.label ?? '30d',
      days: meta?.days ?? 30,
      custom: rangeKey === 'custom' ? (customRange ?? undefined) : undefined,
    }
  }, [rangeKey, customRange])

  const filter: AnalyticsFilter = useMemo(
    () => ({ categoryId, productId }),
    [categoryId, productId],
  )

  const data: AnalyticsSectionData = useMemo(
    () => getAnalytics(section, range, { compare, filter }),
    [section, range, compare, filter],
  )

  const switchRange = (key: AnalyticsRangeKey) => {
    if (key === 'custom') {
      setCustomOpen(true)
      return
    }
    setRangeKey(key)
  }

  const applyCustom = () => {
    const today = new Date().toISOString().slice(0, 10)
    setCustomRange({ start: customRange?.start ?? today, end: customRange?.end ?? today })
    setCustomOpen(false)
    setRangeKey('custom')
  }

  const compareLabel = compare ? t('seller.analytics.compareOn') : t('seller.analytics.compareOff')

  const activeFilters: { key: string; label: string; onClear: () => void }[] = []
  if (categoryId) {
    const cat = sellerCats?.find(c => c.id === categoryId)
    activeFilters.push({
      key: 'cat',
      label: cat?.name ?? categoryId,
      onClear: () => setCategoryId(undefined),
    })
  }
  if (productId) {
    const prod = sellerProds?.items.find(p => p.id === productId)
    activeFilters.push({
      key: 'prod',
      label: prod?.name ?? productId,
      onClear: () => setProductId(undefined),
    })
  }

  const showCategoryFilter =
    section === 'sales' || section === 'products' || section === 'customers'
  const showProductFilter = section === 'products' || section === 'traffic'

  return (
    <Screen>
      {/* Sticky header bar: title + section tabs + range + compare */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border-light">
        <Container>
          <div className="py-3 flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text min-touch"
              aria-label={t('seller.analytics.back')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('seller.analytics.back')}</span>
            </Link>
            <h1 className="text-base font-bold text-text truncate">
              {t('seller.analytics.title')}
            </h1>
            <div className="w-8 sm:w-24" aria-hidden="true" />
          </div>

          {/* Section tabs — underline tab bar (web) */}
          <div
            role="tablist"
            aria-label={t('seller.analytics.sectionTablistAria')}
            className="flex items-center gap-5 overflow-x-auto scrollbar-none border-b border-border-light"
          >
            {SECTIONS.map(s => {
              const active = s.key === section
              return (
                <button
                  key={s.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSection(s.key)}
                  aria-label={t('seller.analytics.sectionTabAria', { section: t(s.labelKey) })}
                  className={`relative whitespace-nowrap py-2.5 text-[14px] font-semibold transition-colors ${
                    active ? 'text-primary' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {t(s.labelKey)}
                  {active && (
                    <motion.span
                      layoutId="analytics-tab-underline"
                      className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"
                      transition={
                        reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30 }
                      }
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Range + compare row */}
          <div className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div
              role="tablist"
              aria-label={t('seller.analytics.rangeAriaLabel')}
              className="inline-flex rounded-full bg-surface border border-border-light p-0.5 overflow-x-auto scrollbar-none max-w-full"
            >
              {ANALYTICS_RANGES.map(r => {
                const active = r.key === rangeKey
                const label = t(`seller.analytics.${RANGE_LABEL_KEY[r.key]}`)
                return (
                  <button
                    key={r.key}
                    role="tab"
                    aria-selected={active}
                    aria-label={t('seller.analytics.rangeTabAria', { range: label })}
                    onClick={() => switchRange(r.key)}
                    className={`px-3.5 h-8 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <button
              role="switch"
              aria-checked={compare}
              aria-label={t('seller.analytics.compareAria')}
              onClick={() => setCompare(c => !c)}
              className="inline-flex items-center gap-2 self-start md:self-auto min-touch"
            >
              <span
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  compare ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    compare ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
              <span className="text-[13px] font-semibold text-text sr-only">{compareLabel}</span>
              <span className="text-[13px] font-semibold text-text" aria-hidden="true">
                {t('seller.analytics.compareToggle')}
              </span>
            </button>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-6 md:py-8">
          {/* Filters */}
          {(showCategoryFilter || showProductFilter) && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {showCategoryFilter && (
                <select
                  aria-label={t('seller.analytics.filterCategoryAria')}
                  value={categoryId ?? ''}
                  onChange={e => setCategoryId(e.target.value || undefined)}
                  className="h-9 rounded-full border border-border bg-background px-3 text-[13px] text-text outline-none focus:border-primary transition-colors"
                >
                  <option value="">{t('seller.analytics.filterCategoryAll')}</option>
                  {sellerCats?.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {showProductFilter && (
                <select
                  aria-label={t('seller.analytics.filterProductAria')}
                  value={productId ?? ''}
                  onChange={e => setProductId(e.target.value || undefined)}
                  className="h-9 rounded-full border border-border bg-background px-3 text-[13px] text-text outline-none focus:border-primary transition-colors"
                >
                  <option value="">{t('seller.analytics.filterProductAll')}</option>
                  {sellerProds?.items.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              <AnimatePresence mode="popLayout">
                {activeFilters.map(f => (
                  <motion.span
                    key={f.key}
                    initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                    transition={
                      reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }
                    }
                    aria-pressed="true"
                    aria-label={t('seller.analytics.filterChipAria', { filter: f.label })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary text-white pl-3 pr-1.5 py-1 text-[13px] font-medium"
                  >
                    {f.label}
                    <button
                      type="button"
                      onClick={f.onClear}
                      aria-label={`${t('seller.analytics.clearAll')}: ${f.label}`}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 hover:bg-white/40 transition-colors"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>

              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(undefined)
                    setProductId(undefined)
                  }}
                  className="text-[13px] font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  {t('seller.analytics.clearAll')}
                </button>
              )}
            </div>
          )}

          {/* Section content with 250ms cross-fade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={
                section +
                rangeKey +
                (customRange?.start ?? '') +
                (customRange?.end ?? '') +
                String(compare) +
                (categoryId ?? '') +
                (productId ?? '')
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
            >
              <SectionContent section={section} data={data} compare={compare} />
            </motion.div>
          </AnimatePresence>
        </div>
      </Container>

      {customOpen && (
        <CustomRangeModal
          onClose={() => setCustomOpen(false)}
          onApply={applyCustom}
          start={customRange?.start}
          end={customRange?.end}
          onChange={setCustomRange}
        />
      )}
    </Screen>
  )
}

function SectionContent({
  section,
  data,
  compare,
}: {
  section: SectionKey
  data: AnalyticsSectionData
  compare: boolean
}) {
  const { t } = useTranslation()
  const sectionLabel =
    section === 'sales'
      ? t('seller.analytics.sectionSales')
      : section === 'traffic'
        ? t('seller.analytics.sectionTraffic')
        : section === 'products'
          ? t('seller.analytics.sectionProducts')
          : t('seller.analytics.sectionCustomers')

  return (
    <section aria-labelledby={`an-${section}-title`}>
      <h2 id={`an-${section}-title`} className="sr-only">
        {sectionLabel}
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {data.kpis.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} compare={compare} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border-light bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">{t('seller.analytics.chartTitle')}</h3>
            {compare && (
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary" aria-hidden="true" />
                  {t('seller.analytics.chartCurrent')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary/35" aria-hidden="true" />
                  {t('seller.analytics.chartPrevious')}
                </span>
              </div>
            )}
          </div>
          <TrendChart points={data.chart} compare={compare} />
        </div>

        {/* Breakdown */}
        <div className="rounded-lg border border-border-light bg-surface p-5">
          <h3 className="text-sm font-semibold text-text mb-3">
            {t('seller.analytics.breakdownTitle')}
          </h3>
          <ul className="flex flex-col">
            {data.breakdown.map((b, i) => (
              <li
                key={b.id}
                className={`flex items-center justify-between py-2.5 ${i > 0 ? 'border-t border-border-light' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{b.label}</p>
                  <p className="text-[11px] text-text-muted">
                    {b.share}% · {t('seller.analytics.colShare')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-text tabular-nums">
                    {b.value.toLocaleString()}
                  </p>
                  <p
                    className={`text-[11px] font-semibold ${trendCls(b.deltaPct > 3 ? 'up' : b.deltaPct < -3 ? 'down' : 'flat')}`}
                  >
                    {b.deltaPct > 0 ? '+' : ''}
                    {b.deltaPct}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Products table */}
      {section === 'products' && data.products && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text mb-3">
            {t('seller.analytics.topProducts')}
          </h3>
          <div className="rounded-lg border border-border-light bg-surface overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <Th className="text-left min-w-[200px]">{t('seller.analytics.colProduct')}</Th>
                  <Th className="text-left">{t('seller.analytics.colCategory')}</Th>
                  <Th className="text-right">{t('seller.analytics.colViews')}</Th>
                  <Th className="text-right">{t('seller.analytics.colUnits')}</Th>
                  <Th className="text-right">{t('seller.analytics.colRevenue')}</Th>
                  <Th className="text-right">{t('seller.analytics.colConv')}</Th>
                  <Th className="text-right">{t('seller.analytics.colDelta')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.products.map(p => (
                  <tr
                    key={p.id}
                    className="h-14 border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
                  >
                    <td className="py-2 px-4 text-[14px] font-semibold text-text truncate">
                      {p.name}
                    </td>
                    <td className="py-2 px-4 text-[13px] text-text-secondary">{p.category}</td>
                    <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                      {p.views.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                      {p.units.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right text-[14px] font-semibold text-text tabular-nums">
                      NPR {p.revenue.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                      {p.convPct}%
                    </td>
                    <td
                      className={`py-2 px-4 text-right text-[13px] font-semibold tabular-nums ${trendCls(p.deltaPct > 3 ? 'up' : p.deltaPct < -3 ? 'down' : 'flat')}`}
                    >
                      {p.deltaPct > 0 ? '+' : ''}
                      {p.deltaPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers table */}
      {section === 'customers' && data.customers && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text mb-3">
            {t('seller.analytics.topCustomers')}
          </h3>
          <div className="rounded-lg border border-border-light bg-surface overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <Th className="text-left min-w-[180px]">{t('seller.analytics.colCustomer')}</Th>
                  <Th className="text-right">{t('seller.analytics.colOrders')}</Th>
                  <Th className="text-right">{t('seller.analytics.colSpend')}</Th>
                  <Th className="text-right">{t('seller.analytics.colAov')}</Th>
                  <Th className="text-left">{t('seller.analytics.colLastOrder')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map(c => (
                  <tr
                    key={c.id}
                    className="h-14 border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
                  >
                    <td className="py-2 px-4 text-[14px] font-semibold text-text truncate">
                      {c.name}
                    </td>
                    <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                      {c.orders}
                    </td>
                    <td className="py-2 px-4 text-right text-[14px] font-semibold text-text tabular-nums">
                      NPR {c.spend.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                      NPR {c.aov.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-[13px] text-text-secondary">{c.lastOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function KpiCard({
  kpi,
  compare,
}: {
  kpi: AnalyticsSectionData['kpis'][number]
  compare: boolean
}) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  return (
    <div className="rounded-lg border border-border-light bg-surface p-4 flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-text-muted">{kpi.label}</span>
      <span className="text-xl font-bold text-text tabular-nums">{kpi.value}</span>
      <div className="flex items-center gap-1">
        <TrendIcon size={14} className={trendCls(kpi.trend)} aria-hidden="true" />
        <span className={`text-xs font-semibold ${trendCls(kpi.trend)}`}>
          {kpi.deltaPct > 0 ? '+' : ''}
          {kpi.deltaPct}%
        </span>
        {compare && kpi.previousValue && (
          <span className="text-[11px] text-text-tertiary ml-auto">vs {kpi.previousValue}</span>
        )}
        {!compare && <span className="text-[11px] text-text-tertiary ml-auto">{kpi.hint}</span>}
      </div>
    </div>
  )
}

function TrendChart({
  points,
  compare,
}: {
  points: AnalyticsSectionData['chart']
  compare: boolean
}) {
  const max = Math.max(1, ...points.map(p => Math.max(p.current, p.previous ?? 0)))
  return (
    <div className="flex items-end gap-2 h-40" role="img" aria-label="Trend chart">
      {points.map((p, i) => {
        const h = Math.max(4, Math.round((p.current / max) * 100))
        const ph = p.previous != null ? Math.max(4, Math.round((p.previous / max) * 100)) : 0
        return (
          <div
            key={p.label + i}
            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
          >
            <div className="w-full flex items-end justify-center flex-1 gap-1">
              {compare && (
                <div
                  className="w-1/2 max-w-[14px] rounded-t bg-primary/35 min-h-[4px]"
                  style={{ height: `${ph}%` }}
                  title={`Previous: ${p.previous ?? 0}`}
                />
              )}
              <div
                className={`${compare ? 'w-1/2 max-w-[14px]' : 'w-full max-w-[24px]'} rounded-t bg-primary min-h-[4px]`}
                style={{ height: `${h}%` }}
                title={`${p.label}: ${p.current}`}
              />
            </div>
            <span className="text-[11px] text-text-muted font-medium">{p.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-[12px] font-semibold text-text-muted tracking-wide uppercase ${className}`}
    >
      {children}
    </th>
  )
}

function CustomRangeModal({
  onClose,
  onApply,
  start,
  end,
  onChange,
}: {
  onClose: () => void
  onApply: () => void
  start?: string
  end?: string
  onChange: (r: { start: string; end: string }) => void
}) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const s = start ?? today
  const e = end ?? today
  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute inset-0 bg-overlay"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="relative w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text">
            {t('seller.analytics.rangeCustomTitle')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-touch rounded-full hover:bg-background flex items-center justify-center"
          >
            <X size={20} className="text-text" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">
              {t('seller.analytics.rangeStart')}
            </span>
            <input
              type="date"
              value={s}
              onChange={ev => onChange({ start: ev.target.value, end: e })}
              className="border border-border rounded-md px-3 py-2.5 text-sm text-text"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">
              {t('seller.analytics.rangeEnd')}
            </span>
            <input
              type="date"
              value={e}
              onChange={ev => onChange({ start: s, end: ev.target.value })}
              className="border border-border rounded-md px-3 py-2.5 text-sm text-text"
            />
          </label>
        </div>
        <button
          onClick={onApply}
          className="w-full bg-primary text-white text-sm font-bold py-2.5 rounded-md hover:opacity-90 transition-opacity"
        >
          {t('seller.analytics.rangeApply')}
        </button>
      </div>
    </div>
  )
}
