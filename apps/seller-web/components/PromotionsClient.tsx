'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, Plus, X, ChevronDown, Tag, ArrowUpDown } from 'lucide-react'
import { duration, easing } from '@chinooz/theme'
import { useReducedMotion, SegmentedControl, EmptyState, Screen, Container } from '@chinooz/ui-web'
import {
  getPromotions,
  getPromotionCounts,
  PROMOTION_TYPES,
  type Promotion,
  type PromotionStatus,
  type PromotionType,
  type PromotionSort,
} from '@chinooz/mock-data'
import { analytics } from '@chinooz/analytics'

const STATUS_KEYS: PromotionStatus[] = ['active', 'scheduled', 'expired', 'draft']
const SORT_KEYS: PromotionSort[] = ['newest', 'ending_soon', 'performance']

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatNPR(n: number): string {
  return n.toLocaleString()
}

function typeLabel(t: (k: string) => string, type: PromotionType): string {
  const map: Record<PromotionType, string> = {
    percentage: t('seller.promotions.typePercentage'),
    fixed: t('seller.promotions.typeFixed'),
    flash_sale: t('seller.promotions.typeFlashSale'),
    bogo: t('seller.promotions.typeBogo'),
    free_shipping: t('seller.promotions.typeFreeShipping'),
  }
  return map[type]
}

function discountText(p: Promotion): string {
  if (p.type === 'percentage' || p.type === 'flash_sale') return `${p.discountValue}%`
  if (p.type === 'fixed') return `NPR ${p.discountValue}`
  if (p.type === 'bogo') return 'BOGO'
  return ''
}

const statusBadge: Record<PromotionStatus, { cls: string; key: string }> = {
  active: { cls: 'bg-success-light text-success', key: 'seller.promotions.statusActive' },
  scheduled: { cls: 'bg-info-light text-info', key: 'seller.promotions.statusScheduled' },
  expired: { cls: 'bg-border text-text-secondary', key: 'seller.promotions.statusExpired' },
  draft: { cls: 'bg-warning-light text-[#92400E]', key: 'seller.promotions.statusDraft' },
}

export default function PromotionsClient() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const [status, setStatus] = useState<PromotionStatus>('active')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)
  const [type, setType] = useState<PromotionType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<PromotionSort>('newest')

  const counts = useMemo(() => getPromotionCounts(), [])

  useEffect(() => {
    analytics.screen({ name: 'seller-promotions' })
  }, [])

  const segments = useMemo(
    () =>
      STATUS_KEYS.map(key => ({
        key,
        label: t(`seller.promotions.status${key.charAt(0).toUpperCase()}${key.slice(1)}`),
        badge: counts[key],
      })),
    [counts, t],
  )

  const activeFilterChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (type !== 'all') {
      chips.push({
        id: 'type',
        label: typeLabel(t, type),
        onRemove: () => setType('all'),
      })
    }
    if (dateFrom) {
      chips.push({
        id: 'dateFrom',
        label: `${t('seller.promotions.dateFrom')} ${formatDate(dateFrom)}`,
        onRemove: () => setDateFrom(''),
      })
    }
    if (dateTo) {
      chips.push({
        id: 'dateTo',
        label: `${t('seller.promotions.dateTo')} ${formatDate(dateTo)}`,
        onRemove: () => setDateTo(''),
      })
    }
    if (search) {
      chips.push({ id: 'search', label: `“${search}”`, onRemove: () => setSearch('') })
    }
    return chips
  }, [type, dateFrom, dateTo, search, t])

  const clearAll = useCallback(() => {
    setType('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
  }, [])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promotions', status, debouncedSearch, type, dateFrom, dateTo, sort],
    queryFn: () =>
      getPromotions({
        status,
        search: debouncedSearch || undefined,
        type,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort,
      }),
  })

  const items = data ?? []
  const hasFilters = type !== 'all' || !!dateFrom || !!dateTo || !!search

  const chipEnter: Transition = reduced
    ? { duration: 0 }
    : { duration: duration.normal / 1000, ease: easing.spring as any }

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                {t('seller.promotions.title')}
              </h1>
              <p className="text-text-muted text-sm mt-0.5">{t('seller.promotions.subtitle')}</p>
            </div>
            <button
              onClick={() => {}}
              aria-label={t('seller.promotions.createAria')}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-95 transition-opacity active:scale-[0.98] min-touch"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">{t('seller.promotions.create')}</span>
            </button>
          </div>

          {/* Sticky controls */}
          <div className="sticky top-0 z-sticky -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border-light">
            <div className="flex flex-col gap-3">
              <SegmentedControl
                segments={segments}
                activeKey={status}
                onChange={key => setStatus(key as PromotionStatus)}
                testID="promotions-status-tabs"
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                    <Search size={16} />
                  </span>
                  <input
                    type="search"
                    inputMode="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('seller.promotions.search')}
                    aria-label={t('seller.promotions.searchAria')}
                    className="w-full h-10 rounded-md bg-surface border border-border pl-9 pr-9 text-sm text-text placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label={t('seller.promotions.clearAll')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <SlidersHorizontal
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <select
                      aria-label={t('seller.promotions.filterAria')}
                      value={type}
                      onChange={e => setType(e.target.value as PromotionType | 'all')}
                      className="h-10 rounded-md bg-surface border border-border pl-8 pr-8 text-sm text-text outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-touch"
                    >
                      <option value="all">{t('seller.promotions.typeAll')}</option>
                      {PROMOTION_TYPES.map(tt => (
                        <option key={tt.key} value={tt.key}>
                          {typeLabel(t, tt.key)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      aria-label={t('seller.promotions.dateFrom')}
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="h-10 rounded-md bg-surface border border-border px-2.5 text-sm text-text outline-none focus:border-primary transition-colors min-touch"
                    />
                    <span className="text-text-tertiary text-xs">–</span>
                    <input
                      type="date"
                      aria-label={t('seller.promotions.dateTo')}
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="h-10 rounded-md bg-surface border border-border px-2.5 text-sm text-text outline-none focus:border-primary transition-colors min-touch"
                    />
                  </div>

                  <div className="relative">
                    <ArrowUpDown
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <select
                      aria-label={t('seller.promotions.sortAria')}
                      value={sort}
                      onChange={e => setSort(e.target.value as PromotionSort)}
                      className="h-10 rounded-md bg-surface border border-border pl-8 pr-8 text-sm text-text outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-touch"
                    >
                      {SORT_KEYS.map(k => (
                        <option key={k} value={k}>
                          {t(`seller.promotions.sort${k === 'newest' ? 'Newest' : k === 'ending_soon' ? 'EndingSoon' : 'Performance'}`)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence initial={!reduced}>
                {activeFilterChips.length > 0 && (
                  <motion.div
                    layout={!reduced}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <span className="text-xs font-medium text-text-muted">
                      {t('seller.promotions.activeFilters')}:
                    </span>
                    {activeFilterChips.map(chip => (
                      <motion.button
                        key={chip.id}
                        layout={!reduced}
                        initial={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                        transition={chipEnter}
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-xs font-semibold pl-3 pr-2 h-7 hover:opacity-90 transition-opacity"
                        aria-label={`${chip.label} — ${t('seller.promotions.clearAll')}`}
                      >
                        {chip.label}
                        <X size={12} />
                      </motion.button>
                    ))}
                    <button
                      onClick={clearAll}
                      className="text-xs font-semibold text-primary hover:underline ml-1 min-touch h-7 px-1"
                    >
                      {t('seller.promotions.clearAll')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* List */}
          <div className="mt-4">
            {isLoading ? (
              <SkeletonTable />
            ) : isError ? (
              <EmptyState
                title={t('seller.promotions.error')}
                subtitle=""
                action={{ label: t('seller.promotions.retry'), onPress: () => refetch() }}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={hasFilters ? t('seller.promotions.emptyFilteredTitle') : t('seller.promotions.emptyTitle')}
                subtitle={
                  hasFilters
                    ? t('seller.promotions.emptyFilteredSubtitle')
                    : t('seller.promotions.emptySubtitle')
                }
                action={
                  !hasFilters
                    ? { label: t('seller.promotions.emptyAction'), onPress: () => {} }
                    : undefined
                }
              />
            ) : (
              <>
                <p className="text-xs text-text-muted mb-2">
                  {t('seller.promotions.count', { count: items.length })}
                </p>
                {/* Desktop table */}
                <div className="hidden md:block rounded-lg border border-border-light overflow-auto bg-surface max-h-[calc(100vh-220px)] scrollbar-none">
                  <table className="w-full" role="table">
                    <thead className="sticky top-0 z-base bg-surface">
                      <tr className="border-b border-border">
                        {[
                          'colPromotion',
                          'colType',
                          'colDiscount',
                          'colStatus',
                          'colSchedule',
                          'colRedemptions',
                          'colRevenue',
                        ].map(col => (
                          <th
                            key={col}
                            scope="col"
                            className="text-left text-xs font-semibold text-text-muted px-4 py-2.5 whitespace-nowrap bg-surface"
                          >
                            {t(`seller.promotions.${col}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(p => (
                        <PromotionRow key={p.id} promo={p} t={t} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-3">
                  {items.map(p => (
                    <PromotionCard key={p.id} promo={p} t={t} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </Screen>
  )
}

type T = (key: string, opts?: Record<string, unknown>) => string

function PromotionRow({ promo, t }: { promo: Promotion; t: T }) {
  const sb = statusBadge[promo.status]
  const isSale = promo.type === 'flash_sale' || promo.type === 'percentage'
  return (
    <tr className="border-b border-border-light last:border-b-0 h-16 hover:bg-background/60 transition-colors">
      <td className="px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
            <Tag size={16} color="#8A1B57" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-text truncate">{promo.name}</span>
              {isSale && promo.status === 'active' && (
                <span className="shrink-0 text-[10px] font-bold tracking-wide text-white bg-gold rounded-full px-1.5 py-px">
                  {t('seller.promotions.saleBadge')}
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted font-mono">{promo.code}</span>
          </div>
        </div>
      </td>
      <td className="px-4">
        <span className="text-sm text-text-secondary">{typeLabel(t, promo.type)}</span>
      </td>
      <td className="px-4">
        <span className="text-sm font-bold text-gold tabular-nums">{discountText(promo)}</span>
      </td>
      <td className="px-4">
        <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 ${sb.cls}`}>
          {t(sb.key)}
        </span>
      </td>
      <td className="px-4">
        <span className="text-sm text-text-secondary whitespace-nowrap">
          {formatDate(promo.startsAt)} – {formatDate(promo.endsAt)}
        </span>
      </td>
      <td className="px-4">
        <span className="text-sm text-text tabular-nums">{promo.redemptions.toLocaleString()}</span>
      </td>
      <td className="px-4">
        <span className="text-sm font-semibold text-text tabular-nums">
          {t('seller.promotions.revenue', { amount: formatNPR(promo.revenue) })}
        </span>
      </td>
    </tr>
  )
}

function PromotionCard({ promo, t }: { promo: Promotion; t: T }) {
  const sb = statusBadge[promo.status]
  const isSale = promo.type === 'flash_sale' || promo.type === 'percentage'
  const scheduleKey =
    promo.status === 'expired'
      ? 'endedOn'
      : promo.status === 'scheduled'
        ? 'startsOn'
        : 'endsIn'
  return (
    <div className="rounded-lg border border-border-light bg-surface shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
            <Tag size={18} color="#8A1B57" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-text truncate">{promo.name}</span>
              {isSale && promo.status === 'active' && (
                <span className="shrink-0 text-[10px] font-bold tracking-wide text-white bg-gold rounded-full px-1.5 py-px">
                  {t('seller.promotions.saleBadge')}
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted font-mono">{promo.code}</span>
          </div>
        </div>
        <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${sb.cls}`}>
          {t(sb.key)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-text-muted">{t('seller.promotions.colDiscount')}</p>
          <p className="text-xl font-bold text-gold tabular-nums leading-tight">{discountText(promo)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">{t('seller.promotions.colRevenue')}</p>
          <p className="text-sm font-semibold text-text tabular-nums">
            {t('seller.promotions.revenue', { amount: formatNPR(promo.revenue) })}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-between gap-2">
        <span className="text-xs text-text-secondary">
          {t(`seller.promotions.${scheduleKey}`, { date: formatDate(promo.status === 'expired' ? promo.endsAt : promo.status === 'scheduled' ? promo.startsAt : promo.endsAt) })}
        </span>
        <span className="text-xs text-text-muted">
          {t('seller.promotions.redemptions', { count: promo.redemptions })}
        </span>
      </div>
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="hidden md:block rounded-lg border border-border-light overflow-hidden bg-surface">
      <div className="border-b border-border px-4 py-2.5">
        <div className="flex gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 w-20 bg-shimmer rounded" />
          ))}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="h-16 border-b border-border-light last:border-b-0 px-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 bg-shimmer rounded" />
            <div className="h-2.5 w-24 bg-shimmer rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
