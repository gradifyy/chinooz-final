'use client'

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Search,
  Plus,
  Box,
  Layers,
  Wallet,
  Tag,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Menu,
  Star,
  MessageCircle,
  PackageX,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { Screen, Container } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import { useSellerReviews, useSellerDashboardStats, useGoLiveChecklist } from '@chinooz/hooks'
import {
  getEmptySellerDashboardMetrics,
  type SellerDateRange,
  type SellerDateRangeKey,
  type SellerKpi,
  type SellerChartPoint,
  type SellerChartMetric,
  type SellerAlert,
  type SellerQuickAction,
  type SellerActivityItem,
  type SellerActivityKind,
} from '@chinooz/mock-data'
import { analytics } from '@chinooz/analytics'

const RANGE_KEYS: SellerDateRangeKey[] = ['today', '7d', '30d', 'custom']

function dateLabel(key: SellerDateRangeKey, t: (k: string) => string): string {
  switch (key) {
    case 'today':
      return t('seller.dashboard.rangeToday')
    case '7d':
      return t('seller.dashboard.range7d')
    case '30d':
      return t('seller.dashboard.range30d')
    case 'custom':
      return t('seller.dashboard.rangeCustom')
  }
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function statusInfo(goLive: string): { key: 'live' | 'review' | 'paused'; color: string; bg: string } {
  if (goLive === 'live') return { key: 'live', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' }
  if (goLive === 'review') return { key: 'review', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' }
  return { key: 'paused', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' }
}

export default function SellerDashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const store = useSellerSessionStore(s => s.store)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  const [rangeKey, setRangeKey] = useState<SellerDateRangeKey>('7d')
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    update()
    window.addEventListener('online', () => setIsOffline(false))
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', () => setIsOffline(false))
      window.removeEventListener('offline', update)
    }
  }, [])

  const isFirstRun = goLiveStatus !== 'live'

  useEffect(() => {
    if (!moreOpen) return
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [moreOpen])

  const range: SellerDateRange = useMemo(() => {
    const days = rangeKey === 'today' ? 1 : rangeKey === '7d' ? 7 : 30
    return {
      key: rangeKey,
      label: dateLabel(rangeKey, t),
      days,
      custom: rangeKey === 'custom' ? customRange ?? undefined : undefined,
    }
  }, [rangeKey, customRange, t])

  const statsQuery = useSellerDashboardStats(range)
  const goLiveQuery = useGoLiveChecklist()

  const loading = !isFirstRun && statsQuery.isLoading
  const error = !isFirstRun && statsQuery.isError
  const refreshing = statsQuery.isFetching && !statsQuery.isLoading

  const metrics = useMemo(() => {
    if (isFirstRun) return getEmptySellerDashboardMetrics(range)
    return statsQuery.data ?? getEmptySellerDashboardMetrics(range)
  }, [isFirstRun, statsQuery.data, range])

  useEffect(() => {
    analytics.screen({ name: 'seller-dashboard' })
  }, [])

  const goLiveTasks = goLiveQuery.data ?? []
  const goLiveDone = goLiveTasks.filter(t => t.done).length
  const goLiveComplete = goLiveDone === goLiveTasks.length

  const status = statusInfo(goLiveStatus)
  const statusLabel =
    status.key === 'live'
      ? t('seller.dashboard.statusLive')
      : status.key === 'review'
        ? t('seller.dashboard.statusReview')
        : t('seller.dashboard.statusPaused')

  const switchRange = useCallback(
    (key: SellerDateRangeKey) => {
      if (key === 'custom') {
        setCustomOpen(true)
        return
      }
      setRangeKey(key)
    },
    [],
  )

  const applyCustom = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    setCustomRange({ start: customRange?.start ?? today, end: customRange?.end ?? today })
    setCustomOpen(false)
    setRangeKey('custom')
  }, [customRange])

  const onRetry = useCallback(() => {
    statsQuery.refetch()
  }, [statsQuery])

  return (
    <Screen>
      <div className="border-b border-border-light bg-surface sticky top-0 z-20">
        <Container className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50" aria-hidden>
              <span className="h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="font-bold text-text">{t('seller.dashboard.tab')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label={t('seller.dashboard.search')}
              className="min-touch rounded-full hover:bg-background flex items-center justify-center text-text"
            >
              <Search size={20} />
            </button>
            <button
              aria-label={t('seller.dashboard.notifications')}
              className="min-touch rounded-full hover:bg-background flex items-center justify-center text-text"
            >
              <Bell size={20} />
            </button>
            {/* ☰ More */}
            <div ref={moreRef} className="relative">
              <button
                aria-label={t('sellerReviews.moreAria')}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(o => !o)}
                className="min-touch rounded-full hover:bg-background flex items-center justify-center text-text"
              >
                {moreOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-52 bg-surface text-text rounded-md shadow-lg border border-border z-50 overflow-hidden"
                >
                  <Link
                    href="/reviews"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-text hover:bg-background transition-colors"
                  >
                    <span className="text-primary"><Star size={16} aria-hidden="true" /></span>
                    {t('sellerReviews.moreReviews')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6 md:py-8">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[22px] leading-tight font-semibold text-text tracking-tight">
              {t('seller.dashboard.greeting', { name: store?.name ?? t('seller.title') })}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">{t('seller.dashboard.dateLine', { date: todayLabel() })}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: status.bg, color: status.color }}
              aria-label={t('seller.dashboard.statusAria', { status: statusLabel })}
              aria-live="polite"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} aria-hidden />
              {statusLabel}
            </span>
            <div
              className="hidden md:inline-flex rounded-full bg-surface border border-border-light p-0.5"
              role="tablist"
              aria-label={t('seller.dashboard.rangeAriaLabel')}
            >
              {RANGE_KEYS.map(key => {
                const active = key === rangeKey
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchRange(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      active ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {dateLabel(key, t)}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        <div className="md:hidden mb-6">
          <div
            className="inline-flex rounded-full bg-surface border border-border-light p-0.5 w-full"
            role="tablist"
            aria-label={t('seller.dashboard.rangeAriaLabel')}
          >
            {RANGE_KEYS.map(key => {
              const active = key === rangeKey
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchRange(key)}
                  className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    active ? 'bg-primary text-white' : 'text-text-muted'
                  }`}
                >
                  {dateLabel(key, t)}
                </button>
              )
            })}
          </div>
        </div>

        {isOffline && !loading && !error && (
          <div role="status" aria-label={t('seller.dashboard.offlineBannerAria')} className="mb-4 rounded-md bg-warning/10 border border-warning/20 px-4 py-2.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[13px] font-semibold text-[#92400E]">{t('seller.dashboard.offlineBanner')}</span>
          </div>
        )}

        {error ? (
          <DashboardErrorState onRetry={onRetry} t={t} reduced={reduced} />
        ) : loading ? (
          <DashboardSkeleton t={t} />
        ) : isFirstRun ? (
          <FirstRunEmpty onAddProduct={() => router.push('/products/new')} t={t} reduced={reduced} />
        ) : (
          <>
            {!goLiveComplete && (
              <GoLiveChecklist
                tasks={goLiveTasks}
                done={goLiveDone}
                total={goLiveTasks.length}
                onContinue={() => router.push('/onboarding')}
                className="mb-6"
              />
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={rangeKey + (customRange?.start ?? '') + (customRange?.end ?? '')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="flex flex-col gap-4"
              >
                <motion.div
                  initial={reduced ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: 0, type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <section aria-labelledby="sd-kpis">
                    <h3 id="sd-kpis" className="text-lg font-semibold text-text mb-3">
                      {t('seller.dashboard.sectionKpis')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {refreshing
                        ? Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
                        : metrics.kpis.map(kpi => (
                            <KpiCard key={kpi.key} kpi={kpi} onPress={(k) => router.push(k.route)} t={t} />
                          ))}
                    </div>
                  </section>
                </motion.div>

                <motion.div
                  initial={reduced ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.05, type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <SalesChart points={metrics.chart} rangeLabel={range.label} t={t} />
                </motion.div>

                <motion.div
                  initial={reduced ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.1, type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <section aria-labelledby="sd-alerts">
                      <div className="flex items-center justify-between mb-3">
                        <h3 id="sd-alerts" className="text-lg font-semibold text-text">
                          {t('seller.dashboard.sectionAlerts')}
                        </h3>
                        <button className="text-sm font-semibold text-primary hover:underline" onClick={() => router.push('/orders')}>
                          {t('seller.dashboard.seeAll')}
                        </button>
                      </div>
                      <Alerts alerts={metrics.alerts} onRoute={(route) => router.push(route)} t={t} />
                    </section>

                    <section aria-labelledby="sd-activity">
                      <div className="flex items-center justify-between mb-3">
                        <h3 id="sd-activity" className="text-lg font-semibold text-text">
                          {t('seller.dashboard.sectionActivity')}
                        </h3>
                        <button className="text-sm font-semibold text-primary hover:underline" onClick={() => router.push('/orders')} aria-label={t('seller.dashboard.activitySeeAll')}>
                          {t('seller.dashboard.seeAll')}
                        </button>
                      </div>
                      <RecentActivity items={metrics.activity} loading={refreshing} onRoute={(route) => router.push(route)} lastViewed={0} t={t} />
                    </section>
                  </div>
                </motion.div>

                <motion.div
                  initial={reduced ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.15, type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <section aria-labelledby="sd-actions">
                    <h3 id="sd-actions" className="text-lg font-semibold text-text mb-3">
                      {t('seller.dashboard.sectionQuickActions')}
                    </h3>
                    <QuickActions
                      actions={metrics.quickActions}
                      onPress={id => {
                        const action = metrics.quickActions.find(a => a.id === id)
                        if (action?.href) router.push(action.href)
                      }}
                      t={t}
                    />
                  </section>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </>
        )}
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

function GoLiveChecklist({
  tasks,
  done,
  total,
  onContinue,
  className = '',
}: {
  tasks: { id: string; label: string; done: boolean }[]
  done: number
  total: number
  onContinue: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className={`rounded-lg border border-border-light bg-surface p-5 ${className}`}>
      <h3 className="text-base font-semibold text-text">{t('seller.dashboard.goLiveTitle')}</h3>
      <p className="text-sm text-text-muted mt-1">{t('seller.dashboard.goLiveSubtitle')}</p>
      <div className="mt-4 h-2 rounded-full bg-border-light overflow-hidden">
        <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold text-text-muted mt-2">
        {t('seller.dashboard.goLiveProgress', { done, total })}
      </p>
      <ul className="mt-4 space-y-2.5">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center gap-2.5">
            {task.done ? (
              <CheckCircle2 size={20} className="text-success" />
            ) : (
              <Circle size={20} className="text-text-tertiary" />
            )}
            <span className={`text-sm font-medium ${task.done ? 'text-text-muted line-through' : 'text-text'}`}>
              {task.label}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={onContinue}
        className="mt-4 w-full md:w-auto px-4 py-2.5 rounded-md bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
      >
        {t('seller.dashboard.goLiveContinue')}
      </button>
    </div>
  )
}

function useCountUp(target: number, enabled: boolean, durationMs = 300): number {
  const [value, setValue] = useState(0)
  const raf = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, enabled, durationMs])
  return value
}

function formatValue(kpi: SellerKpi, raw: number): string {
  const v = kpi.decimals ? Math.round(raw * 10) / 10 : Math.round(raw)
  if (kpi.prefix) return `${kpi.prefix} ${v.toLocaleString()}`
  if (kpi.suffix) return `${v.toFixed(kpi.decimals ?? 0)}${kpi.suffix}`
  return v.toLocaleString()
}

function KpiCard({ kpi, onPress, t }: { kpi: SellerKpi; onPress: (kpi: SellerKpi) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  const reduced = useReducedMotion()
  const animatedValue = useCountUp(kpi.numericValue, !reduced)
  const displayValue = formatValue(kpi, animatedValue)

  const direction = kpi.trend === 'up' ? t('seller.dashboard.kpiUp') : kpi.trend === 'down' ? t('seller.dashboard.kpiDown') : t('seller.dashboard.kpiFlat')
  const ariaLabel = t('seller.dashboard.kpiAria', {
    label: kpi.label,
    value: kpi.value,
    direction,
    delta: Math.abs(kpi.deltaPct),
    period: kpi.period,
  })

  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const trendColor = kpi.trend === 'up' ? 'text-success' : kpi.trend === 'down' ? 'text-error' : 'text-text-muted'
  const valueColor = kpi.accent === 'plum' ? 'text-primary' : 'text-text'

  return (
    <motion.button
      whileTap={{ scale: reduced ? 1 : 0.98 }}
      onClick={() => onPress(kpi)}
      aria-label={ariaLabel}
      className="rounded-lg border border-border-light bg-surface p-4 flex flex-col gap-1.5 text-left cursor-pointer hover:border-primary/30 transition-colors min-touch"
    >
      <span className="text-sm font-medium text-text-muted">{kpi.label}</span>
      <span className={`text-[28px] leading-tight font-bold tabular-nums ${valueColor}`}>
        {displayValue}
      </span>
      <Sparkline data={kpi.sparkline} />
      <span className="text-xs font-normal text-text-muted">{kpi.period}</span>
      <div className="flex items-center gap-1">
        <TrendIcon size={12} className={trendColor} />
        <span className={`text-xs font-semibold tabular-nums ${trendColor}`}>
          {kpi.deltaPct > 0 ? '+' : ''}
          {kpi.deltaPct}%
        </span>
        <span className="text-xs font-normal text-text-muted">{t('seller.dashboard.kpiVsPrev')}</span>
      </div>
    </motion.button>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100
  const h = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
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

function KpiCardSkeleton() {
  return (
    <div
      className="rounded-lg border border-border-light bg-surface p-4 flex flex-col gap-1.5"
      aria-busy="true"
      aria-label="Loading metric"
    >
      <div className="w-20 h-3.5 rounded bg-shimmer" />
      <div className="w-28 h-7 rounded bg-shimmer" />
      <div className="w-full h-8 rounded bg-shimmer" />
      <div className="w-16 h-3 rounded bg-shimmer" />
      <div className="w-20 h-3 rounded bg-shimmer" />
    </div>
  )
}

const CHART_METRICS: { key: SellerChartMetric; labelKey: string }[] = [
  { key: 'revenue', labelKey: 'seller.dashboard.chartMetricRevenue' },
  { key: 'orders', labelKey: 'seller.dashboard.chartMetricOrders' },
  { key: 'units', labelKey: 'seller.dashboard.chartMetricUnits' },
]

function metricValue(p: SellerChartPoint, metric: SellerChartMetric): number {
  return p[metric]
}

function metricPrefix(metric: SellerChartMetric): string {
  return metric === 'revenue' ? 'NPR ' : ''
}

function SalesChart({ points, rangeLabel, t }: { points: SellerChartPoint[]; rangeLabel: string; t: (k: string, o?: Record<string, unknown>) => string }) {
  const reduced = useReducedMotion()
  const [metric, setMetric] = useState<SellerChartMetric>('revenue')
  const [hover, setHover] = useState<number | null>(null)

  const h = 180
  const padL = 8
  const padR = 8
  const padT = 16
  const padB = 28
  const innerW = 100 - padL - padR
  const innerH = h - padT - padB

  const values = points.map(p => metricValue(p, metric))
  const maxVal = Math.max(1, ...values)
  const allZero = values.every(v => v === 0)

  const toX = (i: number) => padL + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const toY = (v: number) => padT + innerH - (v / maxVal) * innerH

  const linePath = useMemo(() => {
    const pts = points.map((p, i) => ({ x: toX(i), y: toY(metricValue(p, metric)) }))
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
  }, [points, metric, maxVal])

  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return ''
    const lastX = toX(points.length - 1)
    const firstX = toX(0)
    const base = h - padB
    return `${linePath} L ${lastX} ${base} L ${firstX} ${base} Z`
  }, [linePath, points])

  const ariaSummary = useMemo(() => {
    if (allZero) return t('seller.dashboard.chartEmpty')
    const metricLabel = t(`seller.dashboard.chartMetric${metric.charAt(0).toUpperCase() + metric.slice(1)}`)
    const from = metricPrefix(metric) + Math.min(...values).toLocaleString()
    const to = metricPrefix(metric) + Math.max(...values).toLocaleString()
    return t('seller.dashboard.chartAriaSummary', { metric: metricLabel, range: rangeLabel, from, to })
  }, [allZero, values, metric, rangeLabel, t])

  return (
    <div className="rounded-lg border border-border-light bg-surface p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-text">{t('seller.dashboard.sectionSales')}</h3>
        <div
          className="inline-flex rounded-full bg-background border border-border-light p-0.5"
          role="tablist"
          aria-label={t('seller.dashboard.chartToggleAria')}
        >
          {CHART_METRICS.map(m => {
            const active = m.key === metric
            return (
              <button
                key={m.key}
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {t(m.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {allZero ? (
        <div className="flex flex-col items-center justify-center h-[180px] rounded-lg border border-dashed border-border bg-background px-4">
          <p className="text-sm font-semibold text-text">{t('seller.dashboard.chartEmpty')}</p>
          <p className="text-xs text-text-muted mt-1 text-center">{t('seller.dashboard.chartEmptySub')}</p>
        </div>
      ) : (
        <div className="relative" role="img" aria-label={ariaSummary}>
          <svg className="w-full" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8A1B57" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#8A1B57" stopOpacity={0} />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map(f => (
              <line
                key={f}
                x1={padL}
                x2={100 - padR}
                y1={padT + innerH * f}
                y2={padT + innerH * f}
                stroke="#E5E5E5"
                strokeWidth={0.3}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {areaPath && (
              <path d={areaPath} fill="url(#chartGradient)" />
            )}

            <motion.path
              d={linePath}
              fill="none"
              stroke="#8A1B57"
              strokeWidth={0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: reduced ? 1 : 1 }}
              transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
            />

            {hover != null && points[hover] && (
              <>
                <line
                  x1={toX(hover)}
                  x2={toX(hover)}
                  y1={padT}
                  y2={h - padB}
                  stroke="#8A1B57"
                  strokeWidth={0.3}
                  strokeDasharray="1 1"
                  opacity={0.5}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={toX(hover)}
                  cy={toY(metricValue(points[hover], metric))}
                  r={1.5}
                  fill="#8A1B57"
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}

            {points.map((p, i) => (
              <g key={p.label + i}>
                <rect
                  x={`calc(${toX(i)} - 3%)`}
                  y={0}
                  width="6%"
                  height={h}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            ))}
          </svg>

          {hover != null && points[hover] && (
            <div
              className="absolute -translate-x-1/2 z-10 pointer-events-none rounded-md bg-surface shadow-md border border-border px-3 py-2"
              style={{ left: `${toX(hover)}%`, top: 4 }}
            >
              <p className="text-xs font-semibold text-text tabular-nums">
                {metricPrefix(metric)}{metricValue(points[hover], metric).toLocaleString()}
              </p>
              <p className="text-xs font-normal text-text-muted mt-0.5">{points[hover].label}</p>
            </div>
          )}

          <div className="flex justify-between mt-2 px-1">
            {points.map((p, i) => (
              <span key={p.label + i} className="text-xs font-normal text-text-muted flex-1 text-center">
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="mt-3">
        <summary className="text-xs text-text-muted cursor-pointer hover:text-text">
          {t('seller.dashboard.chartDataTable')}
        </summary>
        <table className="mt-2 w-full text-xs text-text">
          <thead>
            <tr className="border-b border-border-light">
              <th scope="col" className="text-left py-1.5 font-semibold text-text-muted">
                {t('seller.dashboard.chartColPeriod')}
              </th>
              <th scope="col" className="text-right py-1.5 font-semibold text-text-muted">
                {t('seller.dashboard.chartColValue')}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.label + i} className="border-b border-border-light last:border-b-0">
                <td className="py-1.5 text-left">{p.label}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {metricPrefix(metric)}{metricValue(p, metric).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

const ALERT_SEVERITY_STYLE = {
  error: { color: 'text-error', bg: 'bg-error/10', hex: '#DC2626' },
  warning: { color: 'text-warning', bg: 'bg-warning/10', hex: '#F59E0B' },
  info: { color: 'text-info', bg: 'bg-info/10', hex: '#2563EB' },
  success: { color: 'text-success', bg: 'bg-success/10', hex: '#16A34A' },
} as const

const ALERT_ICON_MAP: Record<string, any> = {
  'new-orders': Box,
  'low-stock': AlertTriangle,
  'out-of-stock': PackageX,
  'returns': RotateCcw,
  'messages': MessageCircle,
  'reviews': Star,
  'payout': Wallet,
  'kyc': ShieldAlert,
}

const ALERT_TITLE_KEY: Record<string, string> = {
  'new-orders': 'seller.dashboard.alertNewOrders',
  'low-stock': 'seller.dashboard.alertLowStock',
  'out-of-stock': 'seller.dashboard.alertOutOfStock',
  'returns': 'seller.dashboard.alertReturns',
  'messages': 'seller.dashboard.alertMessages',
  'reviews': 'seller.dashboard.alertReviews',
  'payout': 'seller.dashboard.alertPayout',
  'kyc': 'seller.dashboard.alertKyc',
}

function Alerts({ alerts, onRoute, t }: { alerts: SellerAlert[]; onRoute: (route: string) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  const reduced = useReducedMotion()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter(a => !dismissed.has(a.id))
  const allCaughtUp = visible.length === 0

  if (allCaughtUp) {
    return (
      <div className="rounded-lg border border-border-light bg-surface p-5">
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <motion.div
            initial={reduced ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 12, stiffness: 200 }}
          >
            <CheckCircle2 size={40} className="text-success" />
          </motion.div>
          <p className="text-base font-semibold text-text">{t('seller.dashboard.alertAllCaughtUp')}</p>
          <p className="text-xs font-normal text-text-muted text-center">{t('seller.dashboard.alertAllCaughtUpSub')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
      {visible.map((a, idx) => {
        const sev = ALERT_SEVERITY_STYLE[a.severity]
        const Icon = ALERT_ICON_MAP[a.icon] ?? AlertTriangle
        const title = t(ALERT_TITLE_KEY[a.icon] ?? a.title)
        const ariaLabel = t('seller.dashboard.alertAria', { title, count: a.count })

        return (
          <motion.div
            key={a.id}
            layout
            initial={false}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 300 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className={`flex items-center min-h-[56px] px-4 ${idx > 0 ? 'border-t border-border' : ''}`}
          >
            <button
              aria-label={ariaLabel}
              onClick={() => onRoute(a.route)}
              className="flex items-center gap-3 flex-1 py-2 text-left min-touch"
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 ${sev.bg}`}>
                <Icon size={24} className={sev.color} />
              </span>
              <span className="flex-1 text-base font-normal text-text leading-snug">{title}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 flex-shrink-0 ${sev.bg}`}>
                <span className={`text-xs font-semibold tabular-nums ${sev.color}`}>{a.count}</span>
              </span>
              <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" />
            </button>
            {a.dismissible && (
              <button
                aria-label={t('seller.dashboard.alertDismiss')}
                onClick={() => setDismissed(prev => new Set(prev).add(a.id))}
                className="p-2 ml-1 rounded-full hover:bg-background transition-colors flex-shrink-0"
              >
                <X size={16} className="text-text-muted" />
              </button>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

const ACTION_ICON: Record<string, any> = {
  plus: Plus,
  box: Box,
  layers: Layers,
  wallet: Wallet,
  tag: Tag,
  settings: Settings,
}

const ACTION_LABEL_KEY: Record<string, string> = {
  'add-product': 'seller.dashboard.actionAddProduct',
  'orders': 'seller.dashboard.actionViewOrders',
  'promotions': 'seller.dashboard.actionCreatePromotion',
  'inventory': 'seller.dashboard.actionUpdateInventory',
  'payouts': 'seller.dashboard.actionViewPayouts',
  'settings': 'seller.dashboard.actionStoreSettings',
}

function QuickActions({ actions, onPress, t }: { actions: SellerQuickAction[]; onPress: (id: string) => void; t: (k: string) => string }) {
  return (
    <div className="grid grid-cols-2 md:flex md:flex-row md:gap-3 xl:grid xl:grid-cols-6 gap-3">
      {actions.map(a => {
        const Icon = ACTION_ICON[a.icon] ?? Plus
        const label = t(ACTION_LABEL_KEY[a.id] ?? a.label)
        return (
          <QuickActionTile
            key={a.id}
            icon={Icon}
            label={label}
            onPress={() => onPress(a.id)}
          />
        )
      })}
    </div>
  )
}

function QuickActionTile({
  icon: Icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      whileTap={{ scale: reduced ? 1 : 0.96 }}
      transition={{ duration: reduced ? 0 : 0.1 }}
      onClick={onPress}
      aria-label={label}
      className="flex flex-col items-center gap-2.5 rounded-lg border border-border-light bg-surface py-4 px-2 hover:border-primary/30 hover:bg-primary-50/30 transition-colors min-touch md:flex-1 xl:flex-1"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
        <Icon size={28} className="text-primary" />
      </span>
      <span className="text-sm font-semibold text-text text-center leading-tight">{label}</span>
    </motion.button>
  )
}

const ACTIVITY_ICON: Record<SellerActivityKind, { Icon: any; color: string; bg: string }> = {
  order: { Icon: Box, color: 'text-info', bg: 'bg-info/10' },
  review: { Icon: Star, color: 'text-gold', bg: 'bg-warning/10' },
  message: { Icon: MessageCircle, color: 'text-primary', bg: 'bg-primary-50' },
}

const ACTIVITY_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  new: { color: 'text-info', bg: 'bg-info/10' },
  confirmed: { color: 'text-info', bg: 'bg-info/10' },
  shipped: { color: 'text-warning', bg: 'bg-warning/10' },
  delivered: { color: 'text-success', bg: 'bg-success/10' },
  pending: { color: 'text-warning', bg: 'bg-warning/10' },
  positive: { color: 'text-success', bg: 'bg-success/10' },
  neutral: { color: 'text-text-muted', bg: 'bg-border-light' },
}

const ACTIVITY_STATUS_KEY: Record<string, string> = {
  new: 'seller.dashboard.activityStatusNew',
  confirmed: 'seller.dashboard.activityStatusConfirmed',
  shipped: 'seller.dashboard.activityStatusShipped',
  delivered: 'seller.dashboard.activityStatusDelivered',
  pending: 'seller.dashboard.activityStatusPending',
  positive: 'seller.dashboard.activityStatusPositive',
  neutral: 'seller.dashboard.activityStatusNeutral',
}

const ACTIVITY_FILTERS: { key: 'all' | SellerActivityKind; labelKey: string }[] = [
  { key: 'all', labelKey: 'seller.dashboard.activityFilterAll' },
  { key: 'order', labelKey: 'seller.dashboard.activityFilterOrders' },
  { key: 'review', labelKey: 'seller.dashboard.activityFilterReviews' },
  { key: 'message', labelKey: 'seller.dashboard.activityFilterMessages' },
]

function RecentActivity({ items, loading, onRoute, lastViewed, t }: { items: SellerActivityItem[]; loading: boolean; onRoute: (route: string) => void; lastViewed: number; t: (k: string, o?: Record<string, unknown>) => string }) {
  const [filter, setFilter] = useState<'all' | SellerActivityKind>('all')

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp)
    if (filter === 'all') return sorted
    return sorted.filter(i => i.kind === filter)
  }, [items, filter])

  return (
    <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
      <div className="flex gap-1.5 p-2 border-b border-border-light" role="tablist">
        {ACTIVITY_FILTERS.map(f => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                active ? 'bg-primary text-white' : 'bg-background text-text-muted hover:text-text'
              }`}
            >
              {t(f.labelKey)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Loading activity">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-3 py-2.5 px-3 min-h-[56px] ${i > 0 ? 'border-t border-border-light' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-shimmer flex-shrink-0" />
              <div className="flex-1 gap-1">
                <div className="w-32 h-3.5 rounded bg-shimmer" />
                <div className="w-24 h-3 rounded bg-shimmer mt-1" />
              </div>
              <div className="w-12 h-5 rounded-full bg-shimmer flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Circle size={36} className="text-text-tertiary" />
          <p className="text-base font-semibold text-text">{t('seller.dashboard.activityEmpty')}</p>
          <p className="text-xs font-normal text-text-muted text-center">{t('seller.dashboard.activityEmptySub')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-1">
          <p className="text-sm font-semibold text-text">{t('seller.dashboard.activityEmpty')}</p>
        </div>
      ) : (
        filtered.map((item, i) => (
          <ActivityRow
            key={item.id}
            item={item}
            index={i}
            isNew={item.timestamp > lastViewed}
            onRoute={onRoute}
            t={t}
          />
        ))
      )}
    </div>
  )
}

function ActivityRow({ item, index, isNew, onRoute, t }: { item: SellerActivityItem; index: number; isNew: boolean; onRoute: (route: string) => void; t: (k: string, o?: Record<string, unknown>) => string }) {
  const reduced = useReducedMotion()
  const { Icon, color, bg } = ACTIVITY_ICON[item.kind]
  const statusLabel = item.status ? t(ACTIVITY_STATUS_KEY[item.status] ?? item.status) : undefined
  const statusStyle = item.status ? ACTIVITY_STATUS_STYLE[item.status] : undefined
  const ariaLabel = t('seller.dashboard.activityAria', {
    title: item.title,
    subtitle: item.subtitle,
    status: statusLabel ?? '',
    at: item.at,
  })

  return (
    <motion.button
      key={item.id}
      onClick={() => onRoute(item.route)}
      aria-label={ariaLabel}
      initial={isNew && !reduced ? { backgroundColor: 'rgba(138,27,87,0.08)' } : false}
      animate={isNew && !reduced ? { backgroundColor: 'rgba(138,27,87,0)' } : {}}
      transition={reduced ? { duration: 0 } : { duration: 2 }}
      className={`flex items-center gap-3 min-h-[56px] px-3 py-2.5 text-left w-full ${index > 0 ? 'border-t border-border-light' : ''} hover:bg-background transition-colors`}
    >
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-base font-normal text-text truncate leading-snug">{item.title}</p>
        <p className="text-xs font-normal text-text-muted truncate">{item.subtitle}</p>
      </div>
      {statusLabel && statusStyle && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 flex-shrink-0 ${statusStyle.bg}`}
          aria-label={statusLabel}
        >
          <span className={`text-xs font-semibold ${statusStyle.color}`}>{statusLabel}</span>
        </span>
      )}
      {item.amount && (
        <span className="text-xs font-semibold text-text tabular-nums flex-shrink-0">{item.amount}</span>
      )}
      <ChevronRight size={18} className="text-text-tertiary flex-shrink-0" />
    </motion.button>
  )
}

function DashboardSkeleton({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('seller.dashboard.loadingDashboard')}>
      <div>
        <div className="w-32 h-5 rounded bg-shimmer mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border-light bg-surface p-4 flex flex-col gap-2">
              <div className="w-20 h-3.5 rounded bg-shimmer" />
              <div className="w-28 h-7 rounded bg-shimmer" />
              <div className="w-full h-8 rounded bg-shimmer" />
              <div className="w-16 h-3 rounded bg-shimmer" />
              <div className="w-20 h-3 rounded bg-shimmer" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="w-24 h-5 rounded bg-shimmer mb-3" />
        <div className="h-[220px] rounded-lg border border-border-light bg-shimmer" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="w-20 h-5 rounded bg-shimmer mb-3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-shimmer mb-2" />
          ))}
        </div>
        <div>
          <div className="w-24 h-5 rounded bg-shimmer mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-shimmer mb-2" />
          ))}
        </div>
      </div>
    </div>
  )
}

function FirstRunEmpty({ onAddProduct, t, reduced }: { onAddProduct: () => void; t: (k: string) => string; reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 18, stiffness: 200 }}
      className="rounded-lg border border-border-light bg-surface p-8 flex flex-col items-center gap-3"
      role="summary"
      aria-label={t('seller.dashboard.firstRunTitle')}
    >
      <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center">
        <Plus size={40} className="text-primary" />
      </div>
      <h3 className="text-xl font-bold text-text text-center">{t('seller.dashboard.firstRunTitle')}</h3>
      <p className="text-sm font-normal text-text-muted text-center max-w-sm">{t('seller.dashboard.firstRunSubtitle')}</p>
      <button
        onClick={onAddProduct}
        aria-label={t('seller.dashboard.firstRunCtaAria')}
        className="mt-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity"
      >
        {t('seller.dashboard.firstRunCta')}
      </button>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 w-full mt-6">
        {['NPR 0', '0', '0', 'NPR 0', '0%', 'NPR 0'].map((v, i) => (
          <div key={i} className="rounded-lg border border-border-light p-3 flex flex-col items-center gap-1">
            <span className="text-base font-bold text-text-tertiary tabular-nums">{v}</span>
            <span className="text-xs font-semibold text-text-tertiary">—</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function DashboardErrorState({ onRetry, t, reduced }: { onRetry: () => void; t: (k: string) => string; reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.3 }}
      className="rounded-lg border border-border-light bg-surface p-8 flex flex-col items-center gap-3"
      role="alert"
      aria-label={t('seller.dashboard.errorTitle')}
    >
      <XCircle size={40} className="text-error" />
      <h3 className="text-lg font-semibold text-text text-center">{t('seller.dashboard.errorTitle')}</h3>
      <p className="text-sm font-normal text-text-muted text-center">{t('seller.dashboard.errorSubtitle')}</p>
      <button
        onClick={onRetry}
        aria-label={t('seller.dashboard.errorRetryAria')}
        className="mt-2 border-2 border-primary text-primary text-sm font-bold px-5 py-2.5 rounded-md hover:bg-primary-50 transition-colors"
      >
        {t('seller.dashboard.errorRetry')}
      </button>
    </motion.div>
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
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-overlay" aria-label={t('common.close')} onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text">{t('seller.dashboard.rangeCustomTitle')}</h3>
          <button onClick={onClose} aria-label={t('common.close')} className="min-touch rounded-full hover:bg-background flex items-center justify-center">
            <X size={20} className="text-text" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">{t('seller.dashboard.rangeStart')}</span>
            <input
              type="date"
              value={s}
              onChange={ev => onChange({ start: ev.target.value, end: e })}
              className="border border-border rounded-md px-3 py-2.5 text-sm text-text"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">{t('seller.dashboard.rangeEnd')}</span>
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
          {t('seller.dashboard.rangeApply')}
        </button>
      </div>
    </div>
  )
}
