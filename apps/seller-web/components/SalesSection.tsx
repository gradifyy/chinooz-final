'use client'

import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import {
  type AnalyticsRange,
  type AnalyticsSectionData,
  type AnalyticsBreakdownGroup,
  type AnalyticsInsight,
  type AnalyticsChartGranularity,
  getSalesTrend,
  type AnalyticsFilter,
} from '@chinooz/mock-data'

type Kpi = AnalyticsSectionData['kpis'][number]

function trendCls(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'text-success' : t === 'down' ? 'text-error' : 'text-text-muted'
}

function trendWord(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'increased' : t === 'down' ? 'decreased' : 'unchanged'
}

function fmtNPR(n: number): string {
  return `NPR ${Math.round(n).toLocaleString()}`
}

export default function SalesSection({
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
  const [granularity, setGranularity] = useState<AnalyticsChartGranularity>('day')
  const [grossNet, setGrossNet] = useState<'gross' | 'net'>('net')

  const trend = useMemo(
    () => getSalesTrend(range, { granularity, grossNet, compare, filter }),
    [range, granularity, grossNet, compare, filter],
  )

  const salesKpis = data.kpis.filter(k =>
    ['netRevenue', 'orders', 'units', 'aov'].includes(k.key),
  )

  return (
    <section aria-labelledby="an-sales-title">
      <h2 id="an-sales-title" className="sr-only">
        {t('seller.analytics.sectionSales')}
      </h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {salesKpis.map((kpi, i) => (
          <motion.div
            key={kpi.key}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.4,
              delay: reduced ? 0 : Math.min(i * 0.05, 0.2),
              ease: 'easeOut',
            }}
            className="rounded-lg border border-border-light bg-surface shadow-sm p-4 flex flex-col gap-1.5"
            aria-label={`${kpi.label}: ${kpi.value}, ${trendWord(kpi.trend)} ${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct}%${compare && kpi.previousValue ? `, previous ${kpi.previousValue}` : ''}`}
            role="group"
          >
            <span className="text-[12px] font-medium text-text-muted leading-4">
              {kpi.label}
            </span>
            <span
              className="text-[22px] leading-7 font-bold text-text tabular-nums"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {kpi.value}
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
                <span className="text-[11px] text-text-tertiary ml-auto truncate">
                  {kpi.hint}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trend chart + insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-lg border border-border-light bg-surface p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-text">
              {t('seller.analytics.sales.trendTitle')}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Segmented
                ariaLabel={t('seller.analytics.sales.granularityAria')}
                options={[
                  { key: 'day', label: t('seller.analytics.sales.granularityDay') },
                  { key: 'week', label: t('seller.analytics.sales.granularityWeek') },
                  { key: 'month', label: t('seller.analytics.sales.granularityMonth') },
                ]}
                activeKey={granularity}
                onChange={k => setGranularity(k as AnalyticsChartGranularity)}
              />
              <Segmented
                ariaLabel={t('seller.analytics.sales.grossNetAria')}
                options={[
                  { key: 'net', label: t('seller.analytics.sales.grossNetNet') },
                  { key: 'gross', label: t('seller.analytics.sales.grossNetGross') },
                ]}
                activeKey={grossNet}
                onChange={k => setGrossNet(k as 'gross' | 'net')}
              />
            </div>
          </div>

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

          <SalesTrendChart
            points={trend.points}
            compare={compare}
            grossNet={grossNet}
            reduced={reduced}
          />
        </div>

        {/* Insight callout */}
        <div className="flex flex-col gap-3">
          {data.insights?.map(ins => (
            <InsightCallout key={ins.id} insight={ins} />
          ))}
        </div>
      </div>

      {/* Breakdowns */}
      {data.breakdowns && data.breakdowns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.breakdowns.map(group => (
            <BreakdownCard key={group.id} group={group} compare={compare} />
          ))}
        </div>
      )}
    </section>
  )
}

function TrendIcon({ t }: { t: 'up' | 'down' | 'flat' }) {
  const Icon = t === 'up' ? TrendingUp : t === 'down' ? TrendingDown : Minus
  return <Icon size={12} className={trendCls(t)} aria-hidden="true" />
}

function Segmented({
  options,
  activeKey,
  onChange,
  ariaLabel,
}: {
  options: { key: string; label: string }[]
  activeKey: string
  onChange: (key: string) => void
  ariaLabel: string
}) {
  return (
    <div
      className="inline-flex rounded-full bg-background border border-border-light p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(opt => {
        const active = opt.key === activeKey
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={`px-3 h-7 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
              active ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SalesTrendChart({
  points,
  compare,
  grossNet,
  reduced,
}: {
  points: AnalyticsSectionData['chart']
  compare: boolean
  grossNet: 'gross' | 'net'
  reduced: boolean
}) {
  const { t } = useTranslation()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map(p => Math.max(p.current, p.previous ?? 0)))
  const peakIdx = points.reduce((best, p, i) => (p.current > (points[best]?.current ?? 0) ? i : best), 0)
  const w = 100 / Math.max(1, points.length)
  const h = 160
  const pad = 8

  const toX = (i: number) => `${pad + i * w + w / 2}%`
  const toY = (v: number) => `${h - pad - (v / max) * (h - pad * 2)}px`

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.current)}`).join(' ')
  const prevPath =
    compare && points.some(p => p.previous != null)
      ? points
          .map((p, i) => (p.previous != null ? `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.previous)}` : ''))
          .filter(Boolean)
          .join(' ')
      : null

  const ariaSummary = points
    .map(p =>
      compare && p.previous != null
        ? t('seller.analytics.sales.chartSummaryCompare', {
            label: p.label,
            current: p.current.toLocaleString(),
            previous: p.previous.toLocaleString(),
          })
        : t('seller.analytics.sales.chartSummary', {
            label: p.label,
            value: p.current.toLocaleString(),
            period: grossNet,
          }),
    )
    .join('. ')

  return (
    <div className="relative">
      <svg
        className="w-full"
        height={h}
        viewBox={`0 0 100 ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaSummary}
      >
        <motion.path
          d={linePath}
          fill="none"
          stroke="#8A1B57"
          strokeWidth={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
        />
        {prevPath && (
          <path
            d={prevPath}
            fill="none"
            stroke="#8A1B57"
            strokeWidth={0.5}
            strokeOpacity={0.35}
            strokeDasharray="1 1"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map((p, i) => (
          <g key={p.label + i}>
            {i === peakIdx && (
              <circle cx={toX(i)} cy={toY(p.current)} r={1.2} fill="#E0A93B" vectorEffect="non-scaling-stroke" />
            )}
            <rect
              x={`calc(${toX(i)} - 2%)`}
              y={0}
              width="4%"
              height={h}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hover != null && points[hover] && (
        <div
          className="absolute -translate-x-1/2 z-10 pointer-events-none rounded-md bg-surface shadow-md border border-border px-3 py-2 text-[12px]"
          style={{ left: toX(hover), top: 4 }}
        >
          <p className="font-semibold text-text tabular-nums">
            {t('seller.analytics.sales.tooltipCurrent', { value: points[hover].current.toLocaleString() })}
          </p>
          {compare && points[hover].previous != null && (
            <p className="text-text-muted tabular-nums">
              {t('seller.analytics.sales.tooltipPrevious', { value: points[hover].previous!.toLocaleString() })}
            </p>
          )}
          <p className="text-text-tertiary mt-0.5">{points[hover].label}</p>
        </div>
      )}

      {/* X labels */}
      <div className="flex justify-between mt-2 px-1">
        {points.map((p, i) => (
          <span
            key={p.label + i}
            className="text-[11px] text-text-muted font-medium flex-1 text-center"
          >
            {p.label}
          </span>
        ))}
      </div>

      {/* Accessible text-table fallback */}
      <details className="mt-3">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {t('seller.analytics.sales.trendTitle')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px] text-text">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.sales.granularity')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {grossNet === 'gross' ? t('seller.analytics.sales.grossNetGross') : t('seller.analytics.sales.grossNetNet')}
              </th>
              {compare && (
                <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                  {t('seller.analytics.chartPrevious')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.label + i} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{p.label}</td>
                <td className="py-1.5 text-right tabular-nums">{fmtNPR(p.current)}</td>
                {compare && (
                  <td className="py-1.5 text-right tabular-nums text-text-muted">
                    {p.previous != null ? fmtNPR(p.previous) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function InsightCallout({ insight }: { insight: AnalyticsInsight }) {
  const { t } = useTranslation()
  const toneCls =
    insight.tone === 'best'
      ? 'border-gold/40 bg-gold/5'
      : insight.tone === 'worst'
        ? 'border-error/30 bg-error/5'
        : 'border-info/30 bg-info/5'
  const Icon = Sparkles
  const toneLabel =
    insight.tone === 'best'
      ? t('seller.analytics.sales.insightBest')
      : insight.tone === 'worst'
        ? t('seller.analytics.sales.insightWorst')
        : t('seller.analytics.sales.insightInfo')
  return (
    <div
      className={`rounded-lg border p-4 ${toneCls}`}
      role="note"
      aria-label={t('seller.analytics.sales.insightAria', { tone: toneLabel, title: insight.title, body: insight.body })}
    >
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold shrink-0">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text">
            {insight.title}
            <span className="ml-2 text-[11px] font-medium text-text-muted">· {insight.period}</span>
          </p>
          <p className="text-[12px] text-text-secondary mt-1 leading-5">{insight.body}</p>
        </div>
      </div>
    </div>
  )
}

function BreakdownCard({ group, compare }: { group: AnalyticsBreakdownGroup; compare: boolean }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...group.rows.map(r => r.value))
  const title =
    group.id === 'category'
      ? t('seller.analytics.sales.breakdownCategory')
      : group.id === 'payment'
        ? t('seller.analytics.sales.breakdownPayment')
        : t('seller.analytics.sales.breakdownStatus')
  const isStatus = group.id === 'status'
  const refunded = group.rows.find(r => r.id === 'refunded')
  const cancelled = group.rows.find(r => r.id === 'cancelled')
  const total = group.rows.reduce((s, r) => s + r.value, 0) || 1
  return (
    <div className="rounded-lg border border-border-light bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {!isStatus && (
          <span className="text-[11px] text-text-muted tabular-nums">
            {fmtNPR(group.total)}
          </span>
        )}
      </div>

      {/* Horizontal bars */}
      <ul className="flex flex-col gap-2.5 mb-3">
        {group.rows.map((r, i) => {
          const pct = Math.round((r.value / max) * 100)
          const sharePct = Math.round((r.value / total) * 100)
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
                  {isStatus ? r.value.toLocaleString() : fmtNPR(r.value)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: r.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-text-tertiary">{sharePct}%</span>
                <span className={`text-[10px] font-semibold tabular-nums ${trendCls(r.deltaPct > 3 ? 'up' : r.deltaPct < -3 ? 'down' : 'flat')}`}>
                  {r.deltaPct > 0 ? '+' : ''}
                  {r.deltaPct}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Legend / rates for status */}
      {isStatus && refunded && cancelled && (
        <div className="flex items-center gap-3 pt-2 border-t border-border-light text-[11px] text-text-muted">
          <span>
            {t('seller.analytics.sales.refundRate')}: <span className="font-semibold text-text tabular-nums">{Math.round((refunded.value / total) * 100)}%</span>
          </span>
          <span>
            {t('seller.analytics.sales.cancelRate')}: <span className="font-semibold text-text tabular-nums">{Math.round((cancelled.value / total) * 100)}%</span>
          </span>
        </div>
      )}

      {/* Accessible data table */}
      <details className="mt-3">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {title} — data table
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">{t('seller.analytics.colLabel')}</th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">{t('seller.analytics.colValue')}</th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">{t('seller.analytics.colShare')}</th>
              {compare && <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">{t('seller.analytics.colDelta')}</th>}
            </tr>
          </thead>
          <tbody>
            {group.rows.map(r => (
              <tr key={r.id} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{isStatus ? r.value.toLocaleString() : fmtNPR(r.value)}</td>
                <td className="py-1.5 text-right tabular-nums">{r.share}%</td>
                {compare && (
                  <td className={`py-1.5 text-right tabular-nums ${trendCls(r.deltaPct > 3 ? 'up' : r.deltaPct < -3 ? 'down' : 'flat')}`}>
                    {r.deltaPct > 0 ? '+' : ''}
                    {r.deltaPct}%
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
