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
} from 'lucide-react'
import { Screen, Container } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSellerSessionStore } from '@chinooz/state'
import {
  getSellerDashboardMetrics,
  SELLER_GO_LIVE_TASKS,
  type SellerDateRange,
  type SellerDateRangeKey,
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
  const store = useSellerSessionStore(s => s.store)
  const goLiveStatus = useSellerSessionStore(s => s.goLiveStatus)

  const [rangeKey, setRangeKey] = useState<SellerDateRangeKey>('7d')
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

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

  const metrics = useMemo(() => getSellerDashboardMetrics(range), [range])

  useEffect(() => {
    analytics.screen({ name: 'seller-dashboard' })
  }, [])

  const goLiveTasks = SELLER_GO_LIVE_TASKS
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
                aria-label={t('seller.reviews.moreAria')}
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
                    {t('seller.reviews.moreReviews')}
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
            <section aria-labelledby="sd-kpis">
              <h3 id="sd-kpis" className="text-lg font-semibold text-text mb-3">
                {t('seller.dashboard.sectionKpis')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {metrics.kpis.map(kpi => (
                  <KpiCard key={kpi.key} kpi={kpi} />
                ))}
              </div>
            </section>

            <section aria-labelledby="sd-sales">
              <h3 id="sd-sales" className="text-lg font-semibold text-text mb-3">
                {t('seller.dashboard.sectionSales')}
              </h3>
              <div className="rounded-lg border border-border-light bg-surface p-5">
                <SalesChart points={metrics.chart} />
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section aria-labelledby="sd-alerts">
                <div className="flex items-center justify-between mb-3">
                  <h3 id="sd-alerts" className="text-lg font-semibold text-text">
                    {t('seller.dashboard.sectionAlerts')}
                  </h3>
                  <button className="text-sm font-semibold text-primary hover:underline" onClick={() => router.push('/reviews')}>
                    {t('seller.dashboard.seeAll')}
                  </button>
                </div>
                <Alerts alerts={metrics.alerts} onCta={(id) => {
                  if (id === 'reviews-needing-response') router.push('/reviews')
                }} />
              </section>

              <section aria-labelledby="sd-activity">
                <div className="flex items-center justify-between mb-3">
                  <h3 id="sd-activity" className="text-lg font-semibold text-text">
                    {t('seller.dashboard.sectionActivity')}
                  </h3>
                  <button className="text-sm font-semibold text-primary hover:underline" onClick={() => router.push('/analytics')}>
                    {t('seller.dashboard.seeAll')}
                  </button>
                </div>
                <RecentActivity items={metrics.activity} />
              </section>
            </div>

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
              />
            </section>
          </motion.div>
        </AnimatePresence>
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

function KpiCard({ kpi }: { kpi: { key: string; label: string; value: string; deltaPct: number; trend: 'up' | 'down' | 'flat'; hint: string } }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const trendColor = kpi.trend === 'up' ? 'text-success' : kpi.trend === 'down' ? 'text-error' : 'text-text-muted'
  return (
    <div className="rounded-lg border border-border-light bg-surface p-4 flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-text-muted">{kpi.label}</span>
      <span className="text-xl font-bold text-text">{kpi.value}</span>
      <div className="flex items-center gap-1">
        <TrendIcon size={14} className={trendColor} />
        <span className={`text-xs font-semibold ${trendColor}`}>
          {kpi.deltaPct > 0 ? '+' : ''}
          {kpi.deltaPct}%
        </span>
        <span className="text-[11px] text-text-tertiary ml-auto">{kpi.hint}</span>
      </div>
    </div>
  )
}

function SalesChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(...points.map(p => p.value), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-36">
      {points.map((p, i) => {
        const h = Math.max(8, (p.value / max) * 100)
        return (
          <div key={p.label + i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="w-full flex items-end justify-center flex-1">
              <div
                className="w-1/2 rounded-sm bg-primary min-h-[8px] transition-all"
                style={{ height: `${h}%` }}
                title={`${p.label}: ${p.value}`}
              />
            </div>
            <span className="text-[11px] text-text-muted font-medium">{p.label}</span>
          </div>
        )
      })}
    </div>
  )
}

const ALERT_ICON = {
  warning: { Icon: AlertTriangle, color: 'text-warning' },
  error: { Icon: XCircle, color: 'text-error' },
  info: { Icon: Info, color: 'text-info' },
} as const

function Alerts({ alerts, onCta }: { alerts: { id: string; severity: 'warning' | 'error' | 'info'; title: string; body: string; cta?: string }[]; onCta?: (id: string) => void }) {
  const { t } = useTranslation()
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border-light bg-surface p-5 text-sm text-text-muted text-center">
        {t('seller.dashboard.noAlerts')}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {alerts.map(a => {
        const { Icon, color } = ALERT_ICON[a.severity]
        const borderColor = a.severity === 'warning' ? 'border-l-warning' : a.severity === 'error' ? 'border-l-error' : 'border-l-info'
        return (
          <div key={a.id} className={`rounded-lg border border-border-light border-l-[3px] ${borderColor} bg-surface p-4`}>
            <div className="flex gap-2.5">
              <Icon size={20} className={color} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{a.title}</p>
                <p className="text-sm text-text-muted mt-0.5">{a.body}</p>
                {a.cta && (
                  <button
                    className="text-sm font-semibold text-primary mt-1 hover:underline"
                    onClick={() => onCta?.(a.id)}
                  >
                    {a.cta}
                  </button>
                )}
              </div>
            </div>
          </div>
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
}

function QuickActions({ actions, onPress }: { actions: { id: string; label: string; icon: string }[]; onPress: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map(a => {
        const Icon = ACTION_ICON[a.icon] ?? Plus
        return (
          <button
            key={a.id}
            onClick={() => onPress(a.id)}
            aria-label={a.label}
            className="flex flex-col items-center gap-2 rounded-lg border border-border-light bg-surface py-3.5 hover:border-primary/40 hover:bg-primary-50/40 transition-colors"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
              <Icon size={22} className="text-primary" />
            </span>
            <span className="text-xs font-semibold text-text text-center">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const ACTIVITY_ICON = {
  order: { Icon: Box, color: 'text-info' },
  review: { Icon: CheckCircle2, color: 'text-success' },
  payout: { Icon: Wallet, color: 'text-primary' },
  stock: { Icon: Layers, color: 'text-warning' },
  follower: { Icon: TrendingUp, color: 'text-info' },
} as const

function RecentActivity({ items }: { items: { id: string; kind: 'order' | 'review' | 'payout' | 'stock' | 'follower'; title: string; subtitle: string; at: string }[] }) {
  const { t } = useTranslation()
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border-light bg-surface p-5 text-sm text-text-muted text-center">
        {t('seller.dashboard.noActivity')}
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-border-light bg-surface p-2">
      {items.map((item, i) => {
        const { Icon, color } = ACTIVITY_ICON[item.kind]
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 py-2.5 px-2 ${i > 0 ? 'border-t border-border-light' : ''}`}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5">
              <Icon size={18} className={color} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">{item.title}</p>
              <p className="text-xs text-text-muted truncate">{item.subtitle}</p>
            </div>
            <span className="text-[11px] text-text-tertiary whitespace-nowrap">{item.at}</span>
          </div>
        )
      })}
    </div>
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
