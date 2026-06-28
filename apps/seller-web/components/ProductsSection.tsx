'use client'

import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Package,
} from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { KpiValue } from './AnalyticsStates'
import {
  type AnalyticsSectionData,
  type AnalyticsProductRow,
  type AnalyticsProductCallout,
  type AnalyticsCategoryComparison,
  type AnalyticsRange,
  type AnalyticsFilter,
  getProductDetail,
} from '@chinooz/mock-data'

type SortKey = 'views' | 'addToCart' | 'units' | 'revenue' | 'convPct' | 'returnRate'
type SortDir = 'asc' | 'desc'

function trendCls(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'text-success' : t === 'down' ? 'text-error' : 'text-text-muted'
}

function trendWord(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'increased' : t === 'down' ? 'decreased' : 'unchanged'
}

function fmtNPR(n: number): string {
  return `NPR ${Math.round(n).toLocaleString()}`
}

function TrendIcon({ t }: { t: 'up' | 'down' | 'flat' }) {
  const Icon = t === 'up' ? TrendingUp : t === 'down' ? TrendingDown : Minus
  return <Icon size={12} className={trendCls(t)} aria-hidden="true" />
}

const COLUMNS: { key: SortKey; labelKey: string; align: string }[] = [
  { key: 'views', labelKey: 'seller.analytics.products.colViews', align: 'text-right' },
  { key: 'addToCart', labelKey: 'seller.analytics.products.colAddToCart', align: 'text-right' },
  { key: 'units', labelKey: 'seller.analytics.products.colUnits', align: 'text-right' },
  { key: 'revenue', labelKey: 'seller.analytics.products.colRevenue', align: 'text-right' },
  { key: 'convPct', labelKey: 'seller.analytics.products.colConv', align: 'text-right' },
  { key: 'returnRate', labelKey: 'seller.analytics.products.colReturn', align: 'text-right' },
]

export default function ProductsSection({
  data,
  range,
  compare,
  filter,
}: {
  data: AnalyticsSectionData
  range: AnalyticsRange
  compare: boolean
  filter: AnalyticsFilter
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const productsKpis = data.kpis.filter(k =>
    ['pViews', 'pAddToCart', 'pUnits', 'pRevenue', 'pConvRate', 'pReturnRate'].includes(k.key),
  )

  const sortedProducts = useMemo(() => {
    if (!data.products) return []
    const sorted = [...data.products]
    sorted.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortDir === 'asc' ? diff : -diff
    })
    return sorted
  }, [data.products, sortKey, sortDir])

  const detail = useMemo(
    () => (selectedId ? getProductDetail(selectedId, range, { compare, filter }) : null),
    [selectedId, range, compare, filter],
  )

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (detail) {
    return (
      <ProductDetail
        detail={detail}
        compare={compare}
        reduced={reduced}
        onBack={() => setSelectedId(null)}
        t={t}
      />
    )
  }

  return (
    <section aria-labelledby="an-products-title">
      <h2 id="an-products-title" className="sr-only">
        {t('seller.analytics.sectionProducts')}
      </h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {productsKpis.map((kpi, i) => (
          <motion.div
            key={kpi.key}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.4,
              delay: reduced ? 0 : Math.min(i * 0.04, 0.2),
              ease: 'easeOut',
            }}
            className="rounded-lg border border-border-light bg-surface shadow-sm p-4 flex flex-col gap-1.5"
            aria-label={`${kpi.label}: ${kpi.value}, ${trendWord(kpi.trend)} ${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct}%${compare && kpi.previousValue ? `, previous ${kpi.previousValue}` : ''}`}
            role="group"
          >
            <span className="text-[12px] font-medium text-text-muted leading-4">{kpi.label}</span>
            <span
              className="text-[22px] leading-7 font-bold text-text tabular-nums"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <KpiValue
                rawValue={kpi.rawValue}
                displayValue={kpi.value}
                isMoney={kpi.key === 'pRevenue'}
                isPct={kpi.key === 'pConvRate' || kpi.key === 'pReturnRate'}
              />
            </span>
            <div className="flex items-center gap-1">
              <TrendIcon t={kpi.trend} />
              <span className={`text-[12px] font-semibold tabular-nums ${trendCls(kpi.trend)}`}>
                {kpi.deltaPct > 0 ? '+' : ''}
                {kpi.deltaPct}%
              </span>
              {compare && kpi.previousValue ? (
                <span className="text-[11px] text-text-tertiary ml-auto tabular-nums">
                  vs {kpi.previousValue}
                </span>
              ) : (
                <span className="text-[11px] text-text-tertiary ml-auto truncate">{kpi.hint}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Callouts */}
      {data.productCallouts && data.productCallouts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {data.productCallouts.map(c => (
            <CalloutCard key={c.id} callout={c} t={t} />
          ))}
        </div>
      )}

      {/* Product table (md+) + cards (mobile) */}
      <div className="hidden md:block">
        <ProductTable
          products={sortedProducts}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onSelect={setSelectedId}
          t={t}
        />
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {sortedProducts.map((p, i) => (
          <ProductCardMobile
            key={p.id}
            product={p}
            rank={i + 1}
            onSelect={() => setSelectedId(p.id)}
            t={t}
          />
        ))}
      </div>

      {/* Category comparison */}
      {data.categoryComparison && data.categoryComparison.length > 0 && (
        <div className="mt-6 rounded-lg border border-border-light bg-surface p-5">
          <h3 className="text-sm font-semibold text-text mb-4">
            {t('seller.analytics.products.categoryCompare')}
          </h3>
          <CategoryComparison categories={data.categoryComparison} reduced={reduced} t={t} />
        </div>
      )}
    </section>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-text-tertiary opacity-40">↕</span>
  return dir === 'asc' ? (
    <ArrowUp size={12} className="text-primary" aria-hidden="true" />
  ) : (
    <ArrowDown size={12} className="text-primary" aria-hidden="true" />
  )
}

function ProductTable({
  products,
  sortKey,
  sortDir,
  onSort,
  onSelect,
  t,
}: {
  products: AnalyticsProductRow[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onSelect: (id: string) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const ariaSort = (key: SortKey): 'ascending' | 'descending' | 'none' => {
    if (key !== sortKey) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <div className="rounded-lg border border-border-light bg-surface overflow-hidden overflow-x-auto">
      <table
        className="w-full border-collapse"
        aria-label={t('seller.analytics.products.tableAria')}
      >
        <thead>
          <tr className="border-b border-border bg-background sticky top-0">
            <th
              scope="col"
              className="px-4 py-2.5 text-[12px] font-semibold text-text-muted tracking-wide uppercase text-left"
            >
              {t('seller.analytics.products.colProduct')}
            </th>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                scope="col"
                aria-sort={ariaSort(col.key)}
                className="px-4 py-2.5 text-[12px] font-semibold text-text-muted tracking-wide uppercase text-right cursor-pointer hover:text-text transition-colors"
                onClick={() => onSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {t(col.labelKey)}
                  <SortIcon active={col.key === sortKey} dir={sortDir} />
                </span>
              </th>
            ))}
            <th
              scope="col"
              className="px-4 py-2.5 text-[12px] font-semibold text-text-muted tracking-wide uppercase text-center"
            >
              {t('seller.analytics.products.colSpark')}
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr
              key={p.id}
              className="h-14 border-b border-border last:border-b-0 hover:bg-background/60 transition-colors cursor-pointer"
              onClick={() => onSelect(p.id)}
              aria-label={t('seller.analytics.products.rowAria', {
                name: p.name,
                category: p.category,
                views: p.views.toLocaleString(),
                addToCart: p.addToCart.toLocaleString(),
                units: p.units.toLocaleString(),
                revenue: p.revenue.toLocaleString(),
                conv: p.convPct,
                returnRate: p.returnRate,
              })}
            >
              <td className="py-2 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-text-tertiary tabular-nums w-5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-text truncate max-w-[220px]">
                      {p.name}
                      {p.outOfStock && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-error/10 px-1.5 py-0.5 text-[10px] font-semibold text-error">
                          <Package size={10} aria-hidden="true" />
                          OOS
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] text-text-muted truncate">{p.category}</p>
                  </div>
                </div>
              </td>
              <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                {p.views.toLocaleString()}
              </td>
              <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                {p.addToCart.toLocaleString()}
              </td>
              <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">
                {p.units.toLocaleString()}
              </td>
              <td className="py-2 px-4 text-right text-[14px] font-semibold text-text tabular-nums">
                {fmtNPR(p.revenue)}
              </td>
              <td className="py-2 px-4 text-right text-[13px] tabular-nums">
                <span
                  className={p.convPct < 3 ? 'text-warning font-semibold' : 'text-text-secondary'}
                >
                  {p.convPct}%
                </span>
              </td>
              <td className="py-2 px-4 text-right text-[13px] tabular-nums">
                <span
                  className={p.returnRate > 5 ? 'text-error font-semibold' : 'text-text-secondary'}
                >
                  {p.returnRate}%
                </span>
              </td>
              <td className="py-2 px-4 text-center">
                <Sparkline data={p.sparkline} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 48
  const h = 20
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })
  const ariaSummary = `7-day trend: ${data[0]} to ${data[data.length - 1]}, peak ${max}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaSummary}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="#8A1B57"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProductCardMobile({
  product,
  rank,
  onSelect,
  t,
}: {
  product: AnalyticsProductRow
  rank: number
  onSelect: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <div
      className="bg-surface border border-border-light rounded-lg p-3 flex gap-3 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={t('seller.analytics.products.viewProductAria', { name: product.name })}
    >
      <span className="text-[14px] font-bold text-text-tertiary tabular-nums w-6 shrink-0">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-text truncate">
            {product.name}
            {product.outOfStock && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-error/10 px-1.5 py-0.5 text-[10px] font-semibold text-error">
                OOS
              </span>
            )}
          </p>
          <Sparkline data={product.sparkline} />
        </div>
        <p className="text-[12px] text-text-muted truncate">{product.category}</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
          <span className="text-text-muted">
            {product.views.toLocaleString()} {t('seller.analytics.products.colViews')}
          </span>
          <span className="font-semibold text-text tabular-nums">{fmtNPR(product.revenue)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          <span className={product.convPct < 3 ? 'text-warning font-semibold' : 'text-text-muted'}>
            {product.convPct}% {t('seller.analytics.products.colConv')}
          </span>
          <span className={product.returnRate > 5 ? 'text-error font-semibold' : 'text-text-muted'}>
            {product.returnRate}% {t('seller.analytics.products.colReturn')}
          </span>
        </div>
      </div>
    </div>
  )
}

function CalloutCard({
  callout,
  t,
}: {
  callout: AnalyticsProductCallout
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const accent =
    callout.type === 'top'
      ? 'border-success/30 bg-success/5'
      : callout.type === 'under'
        ? 'border-warning/30 bg-warning/5'
        : 'border-error/30 bg-error/5'
  const iconColor =
    callout.type === 'top'
      ? 'text-success'
      : callout.type === 'under'
        ? 'text-warning'
        : 'text-error'

  return (
    <div
      className={`rounded-lg border p-4 ${accent}`}
      aria-label={t('seller.analytics.products.calloutAria', {
        title: callout.title,
        hint: callout.hint,
        products: callout.productNames.join(', '),
      })}
      role="note"
    >
      <p className={`text-[13px] font-semibold ${iconColor}`}>{callout.title}</p>
      <p className="text-[11px] text-text-muted mt-0.5 mb-2">{callout.hint}</p>
      <ul className="flex flex-col gap-1">
        {callout.productNames.map(name => (
          <li
            key={name}
            className="text-[12px] font-medium text-text flex items-center justify-between"
          >
            <span className="truncate">{name}</span>
            {callout.type === 'oos_demand' && (
              <a
                href="/inventory"
                className="text-primary font-semibold text-[11px] hover:underline shrink-0 ml-2"
                aria-label={t('seller.analytics.products.restockAria', { name })}
              >
                {t('seller.analytics.products.restock')}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CategoryComparison({
  categories,
  reduced,
  t,
}: {
  categories: AnalyticsCategoryComparison[]
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...categories.map(c => c.revenue))
  return (
    <div>
      <ul className="flex flex-col gap-3 mb-3">
        {categories.map((cat, i) => {
          const pct = Math.round((cat.revenue / max) * 100)
          return (
            <li key={cat.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden="true"
                  />
                  {cat.label}
                </span>
                <span className="text-[12px] font-semibold text-text tabular-nums">
                  {fmtNPR(cat.revenue)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: reduced ? 0 : 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-text-tertiary">
                  {cat.share}% · {cat.units} {t('seller.analytics.products.colUnits')}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {cat.convPct}% {t('seller.analytics.products.colConv')}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <details className="mt-1">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {t('seller.analytics.products.categoryCompare')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colLabel')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.products.colRevenue')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.products.colUnits')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colShare')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.products.colConv')}
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{c.label}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNPR(c.revenue)}</td>
                <td className="py-1.5 text-right tabular-nums">{c.units.toLocaleString()}</td>
                <td className="py-1.5 text-right tabular-nums">{c.share}%</td>
                <td className="py-1.5 text-right tabular-nums">{c.convPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function ProductDetail({
  detail,
  compare,
  reduced,
  onBack,
  t,
}: {
  detail: NonNullable<ReturnType<typeof getProductDetail>>
  compare: boolean
  reduced: boolean
  onBack: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const p = detail.product
  const maxTrend = Math.max(1, ...detail.trend.map(pt => Math.max(pt.current, pt.previous ?? 0)))

  return (
    <section aria-labelledby="an-product-detail-title">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text mb-4"
        aria-label={t('seller.analytics.products.detailBack')}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('seller.analytics.products.detailBack')}
      </button>

      <h2 id="an-product-detail-title" className="text-xl font-bold text-text mb-1">
        {p.name}
      </h2>
      <p className="text-sm text-text-muted mb-6">{p.category}</p>

      {/* Product KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <DetailKpi
          label={t('seller.analytics.products.detailKpiViews')}
          value={p.views.toLocaleString()}
        />
        <DetailKpi
          label={t('seller.analytics.products.detailKpiAddToCart')}
          value={p.addToCart.toLocaleString()}
        />
        <DetailKpi
          label={t('seller.analytics.products.detailKpiUnits')}
          value={p.units.toLocaleString()}
        />
        <DetailKpi
          label={t('seller.analytics.products.detailKpiRevenue')}
          value={fmtNPR(p.revenue)}
        />
        <DetailKpi label={t('seller.analytics.products.detailKpiConv')} value={`${p.convPct}%`} />
        <DetailKpi
          label={t('seller.analytics.products.detailKpiReturn')}
          value={`${p.returnRate}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend */}
        <div className="rounded-lg border border-border-light bg-surface p-5">
          <h3 className="text-sm font-semibold text-text mb-4">
            {t('seller.analytics.products.detailTrend')}
          </h3>
          {compare && (
            <div className="flex items-center gap-3 text-[11px] text-text-muted mb-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true" />
                {t('seller.analytics.chartCurrent')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary/35" aria-hidden="true" />
                {t('seller.analytics.chartPrevious')}
              </span>
            </div>
          )}
          <div
            className="flex items-end gap-2 h-36"
            role="img"
            aria-label={detail.trend.map(pt => `${pt.label}: ${fmtNPR(pt.current)}`).join(', ')}
          >
            {detail.trend.map((pt, i) => {
              const h = Math.max(4, Math.round((pt.current / maxTrend) * 100))
              const ph =
                pt.previous != null ? Math.max(4, Math.round((pt.previous / maxTrend) * 100)) : 0
              return (
                <div
                  key={pt.label + i}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                >
                  <div className="w-full flex items-end justify-center flex-1 gap-1">
                    {compare && pt.previous != null && (
                      <div
                        className="w-1/2 max-w-[14px] rounded-t bg-primary/35 min-h-[4px]"
                        style={{ height: `${ph}%` }}
                      />
                    )}
                    <div
                      className={`${compare ? 'w-1/2 max-w-[14px]' : 'w-full max-w-[24px]'} rounded-t bg-primary min-h-[4px]`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-text-muted font-medium">{pt.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Funnel */}
        <div className="rounded-lg border border-border-light bg-surface p-5">
          <h3 className="text-sm font-semibold text-text mb-4">
            {t('seller.analytics.products.detailFunnel')}
          </h3>
          <div
            role="img"
            aria-label={detail.funnel
              .map(
                f =>
                  `${f.label}: ${f.count}, ${f.convFromPrev}% conversion, ${f.dropOffPct}% drop-off`,
              )
              .join('. ')}
          >
            {detail.funnel.map((f, i) => {
              const maxF = Math.max(1, ...detail.funnel.map(ff => ff.count))
              const widthPct = Math.max(8, Math.round((f.count / maxF) * 100))
              return (
                <div key={f.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-text">{f.label}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-semibold text-text tabular-nums">
                        {f.count.toLocaleString()}
                      </span>
                      {i > 0 && (
                        <span
                          className={
                            f.isBiggestLeak ? 'text-gold font-semibold' : 'text-text-tertiary'
                          }
                        >
                          {f.dropOffPct}% drop
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-7 rounded-md bg-background overflow-hidden">
                    <motion.div
                      className={`h-7 rounded-md ${f.isBiggestLeak ? 'bg-gold' : 'bg-primary'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: reduced ? 0 : 0.5, delay: i * 0.08, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function DetailKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-light bg-surface shadow-sm p-3 flex flex-col gap-1">
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
      <span
        className="text-[18px] font-bold text-text tabular-nums"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
    </div>
  )
}
