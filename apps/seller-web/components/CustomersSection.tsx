'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { KpiValue } from './AnalyticsStates'
import {
  type AnalyticsSectionData,
  type AnalyticsCustomerRow,
  type AnalyticsGeoRow,
  type AnalyticsSearchTerm,
} from '@chinooz/mock-data'

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

export default function CustomersSection({
  data,
  compare,
}: {
  data: AnalyticsSectionData
  compare: boolean
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const customerKpis = data.kpis.filter(k =>
    ['total', 'new', 'returning', 'repeatRate', 'ltv'].includes(k.key),
  )

  return (
    <section aria-labelledby="an-customers-title">
      <h2 id="an-customers-title" className="sr-only">
        {t('seller.analytics.sectionCustomers')}
      </h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {customerKpis.map((kpi, i) => (
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
                isMoney={kpi.key === 'ltv'}
                isPct={kpi.key === 'repeatRate'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* New vs returning trend */}
        {data.customerTrend && (
          <div className="lg:col-span-2 rounded-lg border border-border-light bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {t('seller.analytics.customers.trendTitle')}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary" aria-hidden="true" />
                  {t('seller.analytics.customers.trendNew')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gold" aria-hidden="true" />
                  {t('seller.analytics.customers.trendReturning')}
                </span>
              </div>
            </div>
            <CustomerTrendChart points={data.customerTrend} reduced={reduced} t={t} />
          </div>
        )}

        {/* Top customers */}
        {data.customers && (
          <div className="rounded-lg border border-border-light bg-surface p-5">
            <h3 className="text-sm font-semibold text-text mb-3">
              {t('seller.analytics.customers.topCustomers')}
            </h3>
            <TopCustomers customers={data.customers} t={t} />
          </div>
        )}
      </div>

      {/* Geo breakdown + search terms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {data.geoBreakdown && (
          <div className="lg:col-span-2 rounded-lg border border-border-light bg-surface p-5">
            <h3 className="text-sm font-semibold text-text mb-4">
              {t('seller.analytics.customers.geoTitle')}
            </h3>
            <GeoBreakdown rows={data.geoBreakdown} reduced={reduced} t={t} />
          </div>
        )}

        {data.searchTerms && data.searchTerms.length > 0 && (
          <div className="rounded-lg border border-border-light bg-surface p-5">
            <h3 className="text-sm font-semibold text-text mb-3">
              {t('seller.analytics.customers.searchTitle')}
            </h3>
            <SearchTerms terms={data.searchTerms} t={t} />
          </div>
        )}
      </div>
    </section>
  )
}

function CustomerTrendChart({
  points,
  reduced,
  t,
}: {
  points: { label: string; new: number; returning: number }[]
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...points.map(p => p.new + p.returning))
  const ariaSummary = points
    .map(p =>
      t('seller.analytics.customers.trendSummary', {
        label: p.label,
        newC: p.new,
        returningC: p.returning,
      }),
    )
    .join('. ')

  return (
    <div role="img" aria-label={ariaSummary}>
      <div className="flex items-end gap-2 h-40">
        {points.map((p, i) => {
          const newH = Math.max(2, Math.round((p.new / max) * 100))
          const returningH = Math.max(2, Math.round((p.returning / max) * 100))
          return (
            <div
              key={p.label + i}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
            >
              <div className="w-full max-w-[28px] flex flex-col justify-end h-full rounded-t overflow-hidden">
                <motion.div
                  className="w-full bg-gold"
                  initial={{ height: 0 }}
                  animate={{ height: `${returningH}%` }}
                  transition={{ duration: reduced ? 0 : 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
                <motion.div
                  className="w-full bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: `${newH}%` }}
                  transition={{
                    duration: reduced ? 0 : 0.5,
                    delay: i * 0.05 + 0.05,
                    ease: 'easeOut',
                  }}
                />
              </div>
              <span className="text-[11px] text-text-muted font-medium">{p.label}</span>
            </div>
          )
        })}
      </div>

      <details className="mt-3">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {t('seller.analytics.customers.trendTitle')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.sales.granularity')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.customers.trendNew')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.customers.trendReturning')}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.label + i} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{p.label}</td>
                <td className="py-1.5 text-right tabular-nums">{p.new}</td>
                <td className="py-1.5 text-right tabular-nums">{p.returning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function TopCustomers({
  customers,
  t,
}: {
  customers: AnalyticsCustomerRow[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const sorted = [...customers].sort((a, b) => b.spend - a.spend).slice(0, 6)
  return (
    <ul className="flex flex-col">
      {sorted.map((c, i) => (
        <li
          key={c.id}
          className={`flex items-center gap-2.5 py-2.5 ${i > 0 ? 'border-t border-border-light' : ''}`}
          aria-label={t('seller.analytics.customers.rowAria', {
            name: c.displayName,
            orders: c.orders,
            spend: c.spend.toLocaleString(),
            aov: c.aov.toLocaleString(),
            lastOrder: c.lastOrder,
          })}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary text-[12px] font-bold shrink-0">
            {c.displayName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text truncate">{c.displayName}</p>
            <p className="text-[11px] text-text-muted">
              {c.orders} {t('seller.analytics.customers.colOrders')} · {c.lastOrder}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-semibold text-text tabular-nums">{fmtNPR(c.spend)}</p>
            <p className="text-[11px] text-text-tertiary tabular-nums">
              NPR {c.aov.toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function GeoBreakdown({
  rows,
  reduced,
  t,
}: {
  rows: AnalyticsGeoRow[]
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...rows.map(r => r.customers))
  return (
    <div>
      <ul className="flex flex-col gap-2.5 mb-3">
        {rows.map((r, i) => {
          const pct = Math.round((r.customers / max) * 100)
          return (
            <li key={r.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  />
                  {r.label}
                </span>
                <span className="text-[12px] font-semibold text-text tabular-nums">
                  {r.customers.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: r.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: reduced ? 0 : 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[10px] text-text-tertiary mt-0.5 inline-block">{r.share}%</span>
            </li>
          )
        })}
      </ul>
      <details className="mt-1">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {t('seller.analytics.customers.geoTitle')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.customers.colRegion')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.customers.colCustomers')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colShare')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{r.customers.toLocaleString()}</td>
                <td className="py-1.5 text-right tabular-nums">{r.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function SearchTerms({
  terms,
  t,
}: {
  terms: AnalyticsSearchTerm[]
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {terms.map(term => (
        <span
          key={term.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border-light px-3 py-1.5 text-[12px] font-medium text-text"
          aria-label={t('seller.analytics.customers.searchAria', {
            term: term.term,
            count: term.count,
          })}
        >
          {term.term}
          <span className="text-[10px] text-text-tertiary tabular-nums">{term.count}</span>
        </span>
      ))}
    </div>
  )
}
