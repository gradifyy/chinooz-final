'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { KpiValue } from './AnalyticsStates'
import {
  type AnalyticsSectionData,
  type AnalyticsFunnelStage,
  type AnalyticsTrafficSource,
  type AnalyticsChartPoint,
} from '@chinooz/mock-data'

function trendCls(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'text-success' : t === 'down' ? 'text-error' : 'text-text-muted'
}

function trendWord(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? 'increased' : t === 'down' ? 'decreased' : 'unchanged'
}

function TrendIcon({ t }: { t: 'up' | 'down' | 'flat' }) {
  const Icon = t === 'up' ? TrendingUp : t === 'down' ? TrendingDown : Minus
  return <Icon size={12} className={trendCls(t)} aria-hidden="true" />
}

export default function TrafficSection({
  data,
  compare,
}: {
  data: AnalyticsSectionData
  compare: boolean
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const trafficKpis = data.kpis.filter(k =>
    ['storeViews', 'productViews', 'visitors', 'addToCart', 'checkouts', 'convRate'].includes(
      k.key,
    ),
  )

  return (
    <section aria-labelledby="an-traffic-title">
      <h2 id="an-traffic-title" className="sr-only">
        {t('seller.analytics.sectionTraffic')}
      </h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {trafficKpis.map((kpi, i) => (
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
                isConvRate={kpi.key === 'convRate'}
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

      {/* Funnel (hero) + sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {data.funnel && (
          <div className="lg:col-span-2 rounded-lg border border-border-light bg-surface p-5">
            <FunnelChart stages={data.funnel} reduced={reduced} t={t} />
          </div>
        )}

        {data.trafficSources && (
          <div className="rounded-lg border border-border-light bg-surface p-5">
            <h3 className="text-sm font-semibold text-text mb-3">
              {t('seller.analytics.traffic.sourcesTitle')}
            </h3>
            <SourcesBreakdown sources={data.trafficSources} reduced={reduced} t={t} />
          </div>
        )}
      </div>

      {/* Conversion trend */}
      {data.convTrend && (
        <div className="rounded-lg border border-border-light bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">
              {t('seller.analytics.traffic.convTrendTitle')}
            </h3>
            {compare && (
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
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
          </div>
          <ConvTrendChart points={data.convTrend} compare={compare} reduced={reduced} t={t} />
        </div>
      )}
    </section>
  )
}

function FunnelChart({
  stages,
  reduced,
  t,
}: {
  stages: AnalyticsFunnelStage[]
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const maxCount = Math.max(1, ...stages.map(s => s.count))
  const biggestLeak = stages.find(s => s.isBiggestLeak)
  const summary = stages
    .map(s =>
      t('seller.analytics.traffic.funnelStageAria', {
        stage: s.label,
        count: s.count,
        convPct: s.convFromPrev,
        dropPct: s.dropOffPct,
      }),
    )
    .join('. ')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">
          {t('seller.analytics.traffic.funnelTitle')}
        </h3>
        {biggestLeak && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
            <AlertTriangle size={12} aria-hidden="true" />
            {t('seller.analytics.traffic.funnelBiggestLeakLabel', {
              stage: biggestLeak.label,
              pct: biggestLeak.dropOffPct,
            })}
          </span>
        )}
      </div>

      <div
        role="img"
        aria-label={t('seller.analytics.traffic.funnelAria', { count: stages.length, summary })}
      >
        {stages.map((stage, i) => {
          const widthPct = Math.max(8, Math.round((stage.count / maxCount) * 100))
          const isLeak = stage.isBiggestLeak
          return (
            <div key={stage.id} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold text-text">{stage.label}</span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-semibold text-text tabular-nums">
                    {t('seller.analytics.traffic.funnelCount', {
                      count: stage.count.toLocaleString(),
                    })}
                  </span>
                  {i > 0 && (
                    <span className="text-text-muted tabular-nums">
                      {t('seller.analytics.traffic.funnelConvPct', { pct: stage.convFromPrev })}
                    </span>
                  )}
                  {stage.dropOffPct > 0 && (
                    <span
                      className={`font-semibold tabular-nums ${isLeak ? 'text-gold' : 'text-text-tertiary'}`}
                    >
                      {t('seller.analytics.traffic.funnelDropOff', { pct: stage.dropOffPct })}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 rounded-md bg-background overflow-hidden">
                <motion.div
                  className={`h-8 rounded-md ${isLeak ? 'bg-gold' : 'bg-primary'}`}
                  style={{ originX: 0 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{
                    duration: reduced ? 0 : 0.6,
                    delay: reduced ? 0 : i * 0.08,
                    ease: 'easeOut',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Accessible data table */}
      <details className="mt-3">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {t('seller.analytics.traffic.funnelTitle')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colLabel')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colValue')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.traffic.funnelConvPct', { pct: '' }).trim()}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.traffic.funnelDropOff', { pct: '' }).trim()}
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map(s => (
              <tr key={s.id} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{s.label}</td>
                <td className="py-1.5 text-right tabular-nums">{s.count.toLocaleString()}</td>
                <td className="py-1.5 text-right tabular-nums">{s.convFromPrev}%</td>
                <td
                  className={`py-1.5 text-right tabular-nums ${s.isBiggestLeak ? 'text-gold font-semibold' : 'text-text-muted'}`}
                >
                  {s.dropOffPct > 0 ? `${s.dropOffPct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function SourcesBreakdown({
  sources,
  reduced,
  t,
}: {
  sources: AnalyticsTrafficSource[]
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...sources.map(s => s.value))

  return (
    <div>
      {/* Legend + bars */}
      <ul className="flex flex-col gap-2.5 mb-3">
        {sources.map((src, i) => {
          const pct = Math.round((src.value / max) * 100)
          return (
            <li key={src.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: src.color }}
                    aria-hidden="true"
                  />
                  {src.label}
                </span>
                <span className="text-[12px] font-semibold text-text tabular-nums">
                  {src.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: src.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: reduced ? 0 : 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-text-tertiary">{src.share}%</span>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Accessible data table */}
      <details className="mt-1">
        <summary className="text-[11px] text-text-muted cursor-pointer hover:text-text">
          {t('seller.analytics.traffic.sourcesTitle')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colLabel')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colValue')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.colShare')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.map(s => (
              <tr key={s.id} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-text-secondary">{s.label}</td>
                <td className="py-1.5 text-right tabular-nums">{s.value.toLocaleString()}</td>
                <td className="py-1.5 text-right tabular-nums">{s.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function ConvTrendChart({
  points,
  compare,
  reduced,
  t,
}: {
  points: AnalyticsChartPoint[]
  compare: boolean
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const max = Math.max(1, ...points.map(p => Math.max(p.current, p.previous ?? 0)))
  const w = 100 / Math.max(1, points.length)
  const h = 160
  const pad = 8

  const toX = (i: number) => `${pad + i * w + w / 2}%`
  const toY = (v: number) => `${h - pad - (v / max) * (h - pad * 2)}px`

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.current)}`)
    .join(' ')
  const prevPath =
    compare && points.some(p => p.previous != null)
      ? points
          .map((p, i) =>
            p.previous != null ? `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.previous)}` : '',
          )
          .filter(Boolean)
          .join(' ')
      : null

  const ariaSummary = points
    .map(p =>
      compare && p.previous != null
        ? t('seller.analytics.traffic.convTrendSummaryCompare', {
            label: p.label,
            current: p.current,
            previous: p.previous!,
          })
        : t('seller.analytics.traffic.convTrendSummary', { label: p.label, value: p.current }),
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
      </svg>

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
          {t('seller.analytics.traffic.convTrendTitle')} — data table
        </summary>
        <table className="mt-2 w-full text-[12px] text-text">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.sales.granularity')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.analytics.traffic.kpiConvRate')}
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
                <td className="py-1.5 text-right tabular-nums">{p.current}%</td>
                {compare && (
                  <td className="py-1.5 text-right tabular-nums text-text-muted">
                    {p.previous != null ? `${p.previous}%` : '—'}
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
