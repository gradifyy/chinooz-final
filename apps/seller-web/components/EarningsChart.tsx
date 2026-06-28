'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { formatNPRAmount, type FinanceEarningsPoint, type FinanceEarningsSeries } from '@chinooz/mock-data'

type Metric = 'gross' | 'net'

interface Props {
  series: FinanceEarningsSeries | null
  loading?: boolean
}

const VIEW_W = 640
const VIEW_H = 220
const PAD_L = 8
const PAD_R = 8
const PAD_T = 16
const PAD_B = 28

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cx = (prev.x + curr.x) / 2
    d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

export default function EarningsChart({ series, loading = false }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [metric, setMetric] = useState<Metric>('net')
  const [breakdown, setBreakdown] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const points = series?.points ?? []
  const previousPoints = series?.previousPoints ?? []
  const comparisonPct = series?.comparisonPct ?? 0

  const hasData = points.length >= 2
  const isEmpty = !loading && points.length === 0

  const maxVal = useMemo(() => {
    if (points.length === 0) return 1
    let m = 1
    for (const p of points) {
      m = Math.max(m, p.gross, p.net, p.sales)
    }
    if (breakdown) {
      for (const p of points) m = Math.max(m, p.sales)
    }
    return Math.ceil(m * 1.1)
  }, [points, breakdown])

  const coords = useMemo(() => {
    const innerW = VIEW_W - PAD_L - PAD_R
    const innerH = VIEW_H - PAD_T - PAD_B
    const n = points.length
    return points.map((p, i) => {
      const x = PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const yNet = PAD_T + innerH - (p.net / maxVal) * innerH
      const yGross = PAD_T + innerH - (p.gross / maxVal) * innerH
      return { x, yNet, yGross, p }
    })
  }, [points, maxVal])

  const prevCoords = useMemo(() => {
    const innerW = VIEW_W - PAD_L - PAD_R
    const innerH = VIEW_H - PAD_T - PAD_B
    const n = previousPoints.length
    return previousPoints.map((p, i) => {
      const x = PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const yNet = PAD_T + innerH - (p.net / maxVal) * innerH
      return { x, yNet, p }
    })
  }, [previousPoints, maxVal])

  const linePath = useMemo(() => {
    const ys = coords.map(c => ({ x: c.x, y: metric === 'net' ? c.yNet : c.yGross }))
    return smoothPath(ys)
  }, [coords, metric])

  const prevLinePath = useMemo(() => {
    if (previousPoints.length < 2) return ''
    return smoothPath(prevCoords.map(c => ({ x: c.x, y: c.yNet })))
  }, [prevCoords, previousPoints.length])

  const [drawProgress, setDrawProgress] = useState(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced || !hasData) {
      setDrawProgress(1)
      return
    }
    setDrawProgress(0)
    const start = performance.now()
    const dur = 600
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      setDrawProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [linePath, reduced, hasData])

  const peakIdx = useMemo(() => {
    if (points.length === 0) return null
    let idx = 0
    for (let i = 1; i < points.length; i++) {
      if (points[i].net > points[idx].net) idx = i
    }
    return idx
  }, [points])

  const comparisonTrend: 'up' | 'down' | 'flat' =
    comparisonPct > 1 ? 'up' : comparisonPct < -1 ? 'down' : 'flat'

  const ariaSummary = useMemo(() => {
    if (points.length === 0) return t('seller.finance.chartEmptyTitle')
    const nets = points.map(p => p.net)
    const low = Math.min(...nets)
    const high = Math.max(...nets)
    const direction =
      comparisonTrend === 'up' ? 'rose' : comparisonTrend === 'down' ? 'fell' : 'held'
    return t('seller.finance.chartSummaryAria', {
      direction,
      pct: Math.abs(comparisonPct),
      low: formatNPRAmount(low),
      high: formatNPRAmount(high),
      count: points.length,
    })
  }, [points, comparisonPct, comparisonTrend, t])

  const hovered = hoverIdx != null ? points[hoverIdx] : null
  const hoveredCoord = hoverIdx != null ? coords[hoverIdx] : null

  const handleKeyMove = (dir: -1 | 1) => {
    if (points.length === 0) return
    setHoverIdx(prev => {
      if (prev == null) return dir > 0 ? 0 : points.length - 1
      const next = prev + dir
      if (next < 0) return points.length - 1
      if (next > points.length - 1) return 0
      return next
    })
  }

  return (
    <div className="w-full">
      {/* Controls: gross/net toggle + breakdown + comparison */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div
          role="group"
          aria-label={t('seller.finance.chartToggleAria')}
          className="inline-flex rounded-full bg-background border border-border p-0.5"
        >
          {(['gross', 'net'] as Metric[]).map(m => (
            <button
              key={m}
              role="tab"
              aria-pressed={metric === m}
              aria-selected={metric === m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                metric === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
              }`}
            >
              {m === 'gross' ? t('seller.finance.chartGross') : t('seller.finance.chartNet')}
            </button>
          ))}
        </div>

        <button
          role="switch"
          aria-pressed={breakdown}
          aria-label={t('seller.finance.chartBreakdownAria')}
          onClick={() => setBreakdown(b => !b)}
          className={`min-touch inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
            breakdown
              ? 'bg-gold/15 border-gold text-gold'
              : 'bg-background border-border text-text-muted hover:text-text'
          }`}
        >
          {t('seller.finance.chartBreakdown')}
        </button>

        {!loading && hasData && (
          <div
            className="inline-flex items-center gap-1 text-xs font-semibold"
            aria-label={t('seller.finance.chartComparisonAria', { pct: Math.abs(comparisonPct) })}
          >
            {comparisonTrend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
            ) : comparisonTrend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-error" aria-hidden="true" />
            ) : (
              <Minus className="h-4 w-4 text-text-muted" aria-hidden="true" />
            )}
            <span
              className={
                comparisonTrend === 'up'
                  ? 'text-success'
                  : comparisonTrend === 'down'
                    ? 'text-error'
                    : 'text-text-muted'
              }
            >
              {comparisonTrend === 'up'
                ? t('seller.finance.chartComparisonUp', { pct: Math.abs(comparisonPct) })
                : comparisonTrend === 'down'
                  ? t('seller.finance.chartComparisonDown', { pct: Math.abs(comparisonPct) })
                  : t('seller.finance.chartComparisonFlat')}
            </span>
          </div>
        )}
      </div>

      {/* Chart area */}
      {loading ? (
        <div className="h-[220px] rounded-lg bg-background animate-pulse flex items-end gap-2 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-shimmer rounded-t"
              style={{ height: `${30 + ((i * 13) % 50)}%` }}
            />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="h-[220px] rounded-lg border border-dashed border-border bg-background flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-semibold text-text">{t('seller.finance.chartEmptyTitle')}</p>
          <p className="text-xs text-text-muted mt-1">{t('seller.finance.chartEmptySubtitle')}</p>
        </div>
      ) : !hasData ? (
        <div className="h-[220px] rounded-lg border border-dashed border-border bg-background flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-semibold text-text">{t('seller.finance.chartInsufficientTitle')}</p>
          <p className="text-xs text-text-muted mt-1">{t('seller.finance.chartInsufficientSubtitle')}</p>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-[220px]"
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaSummary}
          >
            {/* Gridlines */}
            {[0.25, 0.5, 0.75].map(f => (
              <line
                key={f}
                x1={PAD_L}
                x2={VIEW_W - PAD_R}
                y1={PAD_T + (VIEW_H - PAD_T - PAD_B) * f}
                y2={PAD_T + (VIEW_H - PAD_T - PAD_B) * f}
                stroke="#F0F0F0"
                strokeWidth={1}
              />
            ))}

            {/* Previous period (dashed muted) */}
            {prevLinePath && !breakdown && (
              <path
                d={prevLinePath}
                fill="none"
                stroke="#9CA3AF"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.6}
              />
            )}

            {/* Breakdown stacked bars */}
            {breakdown &&
              coords.map((c, i) => {
                const innerH = VIEW_H - PAD_T - PAD_B
                const barW = Math.min(22, (VIEW_W - PAD_L - PAD_R) / coords.length * 0.5)
                const hSales = (c.p.sales / maxVal) * innerH
                const hRefunds = (c.p.refunds / maxVal) * innerH
                const hFees = (c.p.fees / maxVal) * innerH
                const x = c.x - barW / 2
                return (
                  <g key={'bar' + i}>
                    <rect
                      x={x}
                      y={PAD_T + innerH - hSales}
                      width={barW}
                      height={hSales}
                      rx={2}
                      fill="#8A1B57"
                      opacity={0.5}
                    />
                    <rect
                      x={x}
                      y={PAD_T + innerH - hSales - hRefunds}
                      width={barW}
                      height={hRefunds}
                      fill="#DC2626"
                      opacity={0.7}
                    />
                    <rect
                      x={x}
                      y={PAD_T + innerH - hSales - hRefunds - hFees}
                      width={barW}
                      height={hFees}
                      fill="#E0A93B"
                      opacity={0.8}
                    />
                  </g>
                )
              })}

            {/* Main line */}
            {!breakdown && (
              <>
                <path
                  d={linePath}
                  fill="none"
                  stroke="#8A1B57"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={reduced ? 'none' : '1'}
                  strokeDashoffset={reduced ? 0 : 1 - drawProgress}
                  style={{ transition: reduced ? 'none' : 'stroke-dashoffset 0.05s linear' }}
                />
                {/* Peak gold marker */}
                {peakIdx != null && coords[peakIdx] && (
                  <circle
                    cx={coords[peakIdx].x}
                    cy={metric === 'net' ? coords[peakIdx].yNet : coords[peakIdx].yGross}
                    r={4}
                    fill="#E0A93B"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
                {/* Points */}
                {coords.map((c, i) => (
                  <circle
                    key={'pt' + i}
                    cx={c.x}
                    cy={metric === 'net' ? c.yNet : c.yGross}
                    r={hoverIdx === i ? 5 : 3}
                    fill={hoverIdx === i ? '#8A1B57' : '#FFFFFF'}
                    stroke="#8A1B57"
                    strokeWidth={2}
                  />
                ))}
              </>
            )}

            {/* X-axis labels */}
            {coords.map((c, i) => (
              <text
                key={'lbl' + i}
                x={c.x}
                y={VIEW_H - 6}
                textAnchor="middle"
                fontSize={10}
                fill="#9CA3AF"
                className="tabular-nums"
              >
                {c.p.label}
              </text>
            ))}
          </svg>

          {/* Tooltip */}
          {hovered && hoveredCoord && (
            <div
              className="absolute z-10 pointer-events-none rounded-lg bg-surface border border-border-light shadow-xl px-3 py-2 text-xs"
              style={{
                left: `${(hoveredCoord.x / VIEW_W) * 100}%`,
                top: 0,
                transform: 'translate(-50%, -100%)',
                marginTop: '-4px',
              }}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-text tabular-nums">{hovered.date}</p>
              <p className="mt-0.5 text-text-muted tabular-nums">
                {t('seller.finance.chartTooltipNet')}: NPR {formatNPRAmount(hovered.net)}
              </p>
              <p className="text-text-muted tabular-nums">
                {t('seller.finance.chartTooltipGross')}: NPR {formatNPRAmount(hovered.gross)}
              </p>
              {breakdown && (
                <>
                  <p className="text-text-muted tabular-nums">
                    {t('seller.finance.chartBreakdownSales')}: NPR {formatNPRAmount(hovered.sales)}
                  </p>
                  <p className="text-error tabular-nums">
                    {t('seller.finance.chartBreakdownRefunds')}: NPR {formatNPRAmount(hovered.refunds)}
                  </p>
                  <p className="text-gold tabular-nums">
                    {t('seller.finance.chartBreakdownFees')}: NPR {formatNPRAmount(hovered.fees)}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Invisible interaction layer with keyboard-focusable points */}
          <div className="absolute inset-0">
            {coords.map((c, i) => (
              <button
                key={'hit' + i}
                tabIndex={0}
                aria-label={t('seller.finance.chartPointAria', {
                  date: c.p.date,
                  net: formatNPRAmount(c.p.net),
                  gross: formatNPRAmount(c.p.gross),
                })}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    handleKeyMove(1)
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    handleKeyMove(-1)
                  }
                }}
                className="absolute rounded-full"
                style={{
                  left: `${(c.x / VIEW_W) * 100}%`,
                  top: `${((metric === 'net' ? c.yNet : c.yGross) / VIEW_H) * 100}%`,
                  width: 24,
                  height: 24,
                  transform: 'translate(-50%, -50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && hasData && (
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-4 h-0.5 bg-primary rounded" />
            {t('seller.finance.chartNetEarnings')}
          </span>
          {!breakdown && previousPoints.length >= 2 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <span className="inline-block w-4 h-0.5 border-t border-dashed border-text-tertiary" />
              {t('seller.finance.chartComparison')}
            </span>
          )}
          {breakdown && (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/50" />
                {t('seller.finance.chartBreakdownSales')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-error/70" />
                {t('seller.finance.chartBreakdownRefunds')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gold/80" />
                {t('seller.finance.chartBreakdownFees')}
              </span>
            </>
          )}
        </div>
      )}

      {/* A11y text-table fallback */}
      {!loading && hasData && (
        <details className="mt-3 group">
          <summary className="text-xs font-semibold text-text-muted cursor-pointer hover:text-text list-none">
            {t('seller.finance.chartLabel')} — data table
          </summary>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="text-left py-1 font-medium">{t('seller.finance.chartTooltipDate')}</th>
                <th className="text-right py-1 font-medium">{t('seller.finance.chartBreakdownSales')}</th>
                <th className="text-right py-1 font-medium">{t('seller.finance.chartBreakdownRefunds')}</th>
                <th className="text-right py-1 font-medium">{t('seller.finance.chartBreakdownFees')}</th>
                <th className="text-right py-1 font-medium">{t('seller.finance.chartTooltipGross')}</th>
                <th className="text-right py-1 font-medium">{t('seller.finance.chartTooltipNet')}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} className="border-t border-border-light">
                  <td className="py-1 text-text">{p.date}</td>
                  <td className="py-1 text-right tabular-nums text-text">{formatNPRAmount(p.sales)}</td>
                  <td className="py-1 text-right tabular-nums text-error">{formatNPRAmount(p.refunds)}</td>
                  <td className="py-1 text-right tabular-nums text-gold">{formatNPRAmount(p.fees)}</td>
                  <td className="py-1 text-right tabular-nums text-text">{formatNPRAmount(p.gross)}</td>
                  <td className="py-1 text-right tabular-nums font-semibold text-text">
                    {formatNPRAmount(p.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
