'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  ChevronDown,
  AlertTriangle,
  Package,
  Inbox,
  RotateCcw,
} from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion, SellerOrderRow, SellerOrderRowSkeleton } from '@chinooz/ui-web'
import { useSellerOrders } from '@chinooz/hooks'
import OrdersBulkBar from '@/components/OrdersBulkBar'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPR } from '@chinooz/utils'
import { duration, easing } from '@chinooz/theme'
import type {
  SellerSubOrder,
  SellerOrderStatusKey,
  SellerPaymentType,
  SellerShippingMethod,
  SellerOrderSortKey,
} from '@chinooz/types'

type TabKey = SellerOrderStatusKey

interface TabDef {
  key: TabKey
  labelKey: string
  isNew?: boolean
}

const TABS: TabDef[] = [
  { key: 'new', labelKey: 'seller.orders.tabNew', isNew: true },
  { key: 'to_pack', labelKey: 'seller.orders.tabToPack' },
  { key: 'to_ship', labelKey: 'seller.orders.tabToShip' },
  { key: 'shipped', labelKey: 'seller.orders.tabShipped' },
  { key: 'completed', labelKey: 'seller.orders.tabCompleted' },
  { key: 'cancelled_returned', labelKey: 'seller.orders.tabCancelledReturned' },
  { key: 'action_needed', labelKey: 'seller.orders.tabActionNeeded' },
]

type DateRangeKey = 'all' | '7d' | '30d' | 'custom'
type PaymentFilter = 'all' | SellerPaymentType
type ShippingFilter = 'all' | SellerShippingMethod

interface FilterState {
  dateRange: DateRangeKey
  dateFrom: string
  dateTo: string
  payment: PaymentFilter
  shipping: ShippingFilter
}

const DEFAULT_FILTERS: FilterState = {
  dateRange: 'all',
  dateFrom: '',
  dateTo: '',
  payment: 'all',
  shipping: 'all',
}

const STATUS_PILL: Record<SellerOrderStatusKey, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
  to_pack: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  to_ship: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  shipped: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
  completed: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  cancelled_returned: { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
  action_needed: { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function matchesTab(o: SellerSubOrder, tab: TabKey): boolean {
  if (tab === 'action_needed') return o.actionNeeded
  if (tab === 'cancelled_returned') return o.statusKey === 'cancelled_returned'
  return o.statusKey === tab && !o.actionNeeded
}

function applyFilters(
  orders: SellerSubOrder[],
  tab: TabKey,
  search: string,
  filters: FilterState,
  sort: SellerOrderSortKey,
): SellerSubOrder[] {
  let list = orders.filter(o => matchesTab(o, tab))

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      o =>
        o.orderId.toLowerCase().includes(q) ||
        o.subOrderId.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.items.some(it => it.name.toLowerCase().includes(q)),
    )
  }

  const now = Date.now()
  if (filters.dateRange === '7d') {
    const cut = now - 7 * 86400000
    list = list.filter(o => new Date(o.createdAt).getTime() >= cut)
  } else if (filters.dateRange === '30d') {
    const cut = now - 30 * 86400000
    list = list.filter(o => new Date(o.createdAt).getTime() >= cut)
  } else if (filters.dateRange === 'custom') {
    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : -Infinity
    const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 86400000 : Infinity
    list = list.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= from && t <= to
    })
  }

  if (filters.payment !== 'all') {
    list = list.filter(o => o.paymentType === filters.payment)
  }
  if (filters.shipping !== 'all') {
    list = list.filter(o => o.shippingMethod === filters.shipping)
  }

  const sorted = [...list]
  if (sort === 'newest') {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sort === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } else if (sort === 'value') {
    sorted.sort((a, b) => b.total - a.total)
  }
  return sorted
}

function CountBadge({ count, tab }: { count: number; tab: TabKey }) {
  if (count <= 0) return null
  const isError = tab === 'new'
  const isWarning = tab === 'action_needed'
  return (
    <span
      aria-label={`${count}`}
      className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[12px] font-semibold leading-none ${
        isError
          ? 'bg-error text-white'
          : isWarning
            ? 'bg-warning text-white'
            : 'bg-primary-50 text-primary'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ActiveFilterChips({
  filters,
  onRemove,
  onClear,
  t,
}: {
  filters: FilterState
  onRemove: (field: keyof FilterState) => void
  onClear: () => void
  t: (k: string) => string
}) {
  const reduced = useReducedMotion()
  const chips: { field: keyof FilterState; label: string }[] = []

  if (filters.dateRange === '7d') chips.push({ field: 'dateRange', label: t('seller.orders.date7d') })
  else if (filters.dateRange === '30d') chips.push({ field: 'dateRange', label: t('seller.orders.date30d') })
  else if (filters.dateRange === 'custom')
    chips.push({ field: 'dateRange', label: `${t('seller.orders.dateFrom')} ${filters.dateFrom || '…'} ${t('seller.orders.dateTo')} ${filters.dateTo || '…'}` })

  if (filters.payment === 'cod') chips.push({ field: 'payment', label: t('seller.orders.paymentCod') })
  else if (filters.payment === 'prepaid') chips.push({ field: 'payment', label: t('seller.orders.paymentPrepaid') })

  if (filters.shipping === 'standard') chips.push({ field: 'shipping', label: t('seller.orders.shippingStandard') })
  else if (filters.shipping === 'express') chips.push({ field: 'shipping', label: t('seller.orders.shippingExpress') })
  else if (filters.shipping === 'sameday') chips.push({ field: 'shipping', label: t('seller.orders.shippingSameday') })
  else if (filters.shipping === 'pickup') chips.push({ field: 'shipping', label: t('seller.orders.shippingPickup') })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3" aria-label={t('seller.orders.activeFilters')}>
      <AnimatePresence initial={!reduced}>
        {chips.map(ch => (
          <motion.span
            key={ch.field}
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.85 }}
            transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000, ease: easing.spring as any }}
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary pl-3 pr-1.5 py-1 text-xs font-semibold"
          >
            {ch.label}
            <button
              onClick={() => onRemove(ch.field)}
              className="inline-flex items-center justify-center h-5 w-5 rounded-full hover:bg-primary/10 transition-colors"
              aria-label={t('seller.orders.removeFilter')}
            >
              <X size={12} />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <button
        onClick={onClear}
        className="text-xs font-semibold text-text-muted hover:text-text underline underline-offset-2"
        aria-label={t('seller.orders.clearFiltersAria')}
      >
        {t('seller.orders.clearFilters')}
      </button>
    </div>
  )
}

function FilterBar({
  filters,
  onChange,
  t,
}: {
  filters: FilterState
  onChange: (f: FilterState) => void
  t: (k: string) => string
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="filter-date">
        {t('seller.orders.dateRange')}
      </label>
      <select
        id="filter-date"
        aria-label={t('seller.orders.dateRange')}
        value={filters.dateRange}
        onChange={e => set({ dateRange: e.target.value as DateRangeKey })}
        className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="all">{t('seller.orders.dateAll')}</option>
        <option value="7d">{t('seller.orders.date7d')}</option>
        <option value="30d">{t('seller.orders.date30d')}</option>
        <option value="custom">{t('seller.orders.dateCustom')}</option>
      </select>

      {filters.dateRange === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label={t('seller.orders.dateFrom')}
            value={filters.dateFrom}
            onChange={e => set({ dateFrom: e.target.value })}
            className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="date"
            aria-label={t('seller.orders.dateTo')}
            value={filters.dateTo}
            onChange={e => set({ dateTo: e.target.value })}
            className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      <label className="sr-only" htmlFor="filter-payment">
        {t('seller.orders.paymentType')}
      </label>
      <select
        id="filter-payment"
        aria-label={t('seller.orders.paymentType')}
        value={filters.payment}
        onChange={e => set({ payment: e.target.value as PaymentFilter })}
        className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="all">{t('seller.orders.paymentAll')}</option>
        <option value="cod">{t('seller.orders.paymentCod')}</option>
        <option value="prepaid">{t('seller.orders.paymentPrepaid')}</option>
      </select>

      <label className="sr-only" htmlFor="filter-shipping">
        {t('seller.orders.shippingMethod')}
      </label>
      <select
        id="filter-shipping"
        aria-label={t('seller.orders.shippingMethod')}
        value={filters.shipping}
        onChange={e => set({ shipping: e.target.value as ShippingFilter })}
        className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="all">{t('seller.orders.shippingAll')}</option>
        <option value="standard">{t('seller.orders.shippingStandard')}</option>
        <option value="express">{t('seller.orders.shippingExpress')}</option>
        <option value="sameday">{t('seller.orders.shippingSameday')}</option>
        <option value="pickup">{t('seller.orders.shippingPickup')}</option>
      </select>
    </div>
  )
}

function SortSelect({
  value,
  onChange,
  t,
}: {
  value: SellerOrderSortKey
  onChange: (s: SellerOrderSortKey) => void
  t: (k: string) => string
}) {
  return (
    <div className="relative">
      <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
      <label className="sr-only" htmlFor="sort-orders">
        {t('seller.orders.sortAria')}
      </label>
      <select
        id="sort-orders"
        aria-label={t('seller.orders.sortAria')}
        value={value}
        onChange={e => onChange(e.target.value as SellerOrderSortKey)}
        className="h-10 rounded-md border border-border bg-surface pl-8 pr-8 text-sm text-text font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
      >
        <option value="newest">{t('seller.orders.sortNewest')}</option>
        <option value="oldest">{t('seller.orders.sortOldest')}</option>
        <option value="value">{t('seller.orders.sortValue')}</option>
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
    </div>
  )
}

function EmptyState({ tab, t }: { tab: TabKey; t: (k: string) => string }) {
  const reduced = useReducedMotion()
  const icon = tab === 'action_needed' ? <CheckIcon /> : tab === 'cancelled_returned' ? <RotateCcw size={40} /> : <Inbox size={40} />
  const title =
    tab === 'action_needed'
      ? t('seller.orders.emptyActionNeeded')
      : t('seller.orders.emptyTitle')
  const subtitle =
    tab === 'action_needed'
      ? t('seller.orders.emptyActionNeededSubtitle')
      : t('seller.orders.emptySubtitle')
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: duration.slow / 1000, ease: easing.easeOut as any }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center"
    >
      <span className="text-text-tertiary mb-4" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="text-sm text-text-muted mt-2 max-w-xs">{subtitle}</p>
    </motion.div>
  )
}

function CheckIcon() {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-light text-success">
      <Package size={22} />
    </span>
  )
}

export default function SellerOrders() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const sellerId = useSellerSessionStore(s => s.sellerId)

  const [activeTab, setActiveTab] = useState<TabKey>('new')
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 250)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SellerOrderSortKey>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    analytics.screen({ name: 'seller-orders' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!headerRef.current) return
    const el = headerRef.current
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showFilters])

  const { data: allOrders = [], isLoading, isError, refetch } = useSellerOrders(sellerId ?? null)

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      new: 0,
      to_pack: 0,
      to_ship: 0,
      shipped: 0,
      completed: 0,
      cancelled_returned: 0,
      action_needed: 0,
    }
    for (const o of allOrders) {
      if (o.actionNeeded) c.action_needed++
      if (o.statusKey === 'cancelled_returned') {
        c.cancelled_returned++
        continue
      }
      if (o.statusKey === 'new' && !o.actionNeeded) c.new++
      else if (o.statusKey === 'to_pack' && !o.actionNeeded) c.to_pack++
      else if (o.statusKey === 'to_ship' && !o.actionNeeded) c.to_ship++
      else if (o.statusKey === 'shipped') c.shipped++
      else if (o.statusKey === 'completed') c.completed++
    }
    return c
  }, [allOrders])

  const visibleOrders = useMemo(
    () => applyFilters(allOrders, activeTab, debouncedSearch, filters, sort),
    [allOrders, activeTab, debouncedSearch, filters, sort],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.dateRange !== 'all') n++
    if (filters.payment !== 'all') n++
    if (filters.shipping !== 'all') n++
    return n
  }, [filters])

  const selectedOrders = useMemo(
    () => allOrders.filter(o => selectedIds.has(o.subOrderId)),
    [allOrders, selectedIds],
  )

  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every(o => selectedIds.has(o.subOrderId))

  const removeFilter = useCallback((field: keyof FilterState) => {
    setFilters(prev => {
      const next = { ...prev }
      if (field === 'dateRange') {
        next.dateRange = 'all'
        next.dateFrom = ''
        next.dateTo = ''
      } else if (field === 'payment') {
        next.payment = 'all'
      } else if (field === 'shipping') {
        next.shipping = 'all'
      }
      return next
    })
  }, [])

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as TabKey)
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  if (!isLoggedIn) return null

  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, damping: 22, stiffness: 320, mass: 0.8 }

  return (
    <Screen>
      {/* Sticky header: title + status tabs + search/filter/sort */}
      <div ref={headerRef} className="sticky top-0 z-sticky bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border-light">
        <Container className="max-w-[1280px]">
          {/* Title row */}
          <div className="flex items-center gap-3 pt-5 pb-3">
            <button
              onClick={() => router.push('/')}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-surface transition-colors"
              aria-label={t('seller.orders.back')}
            >
              <span className="text-xl text-text">←</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-text flex items-center gap-2">
                <span aria-hidden="true">🧾</span>
                {t('seller.orders.title')}
              </h1>
              <p className="text-xs text-text-muted truncate">{t('seller.orders.subtitle')}</p>
            </div>
          </div>

          {/* Status segmented control */}
          <div
            className="flex overflow-x-auto scrollbar-none -mx-1 px-1 pb-3"
            role="tablist"
            aria-label={t('seller.orders.title')}
          >
            <div className="relative flex bg-surface rounded-full h-10 min-w-max md:min-w-0 md:mx-auto border border-border-light">
              {TABS.map(tab => {
                const isActive = tab.key === activeTab
                const count = counts[tab.key]
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    role="tab"
                    aria-selected={isActive}
                    className={`relative z-10 flex items-center gap-1.5 px-3.5 md:px-4 h-10 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="orders-segment-indicator"
                        className={`absolute inset-0 rounded-full ${tab.key === 'new' ? 'bg-primary' : tab.key === 'action_needed' ? 'bg-warning' : 'bg-primary'}`}
                        transition={spring}
                      />
                    )}
                    <span className="relative z-10">{t(tab.labelKey)}</span>
                    <span className="relative z-10">
                      <CountBadge count={count} tab={tab.key} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search + filter toggle + sort */}
          <div className="flex items-center gap-2 pb-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
              <label className="sr-only" htmlFor="orders-search">
                {t('seller.orders.searchAria')}
              </label>
              <input
                id="orders-search"
                type="text"
                inputMode="search"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t('seller.orders.searchPlaceholder')}
                aria-label={t('seller.orders.searchAria')}
                className="w-full h-10 pl-10 pr-9 rounded-md bg-surface border border-border text-sm text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {searchInput.length > 0 && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                  aria-label={t('seller.orders.clearSearch')}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(v => !v)}
              aria-label={t('seller.orders.filterAria')}
              aria-expanded={showFilters}
              className={`h-10 inline-flex items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-primary text-primary bg-primary-50'
                  : 'border-border text-text-secondary bg-surface hover:bg-background'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">{t('seller.orders.filter')}</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[11px] font-semibold px-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <SortSelect value={sort} onChange={setSort} t={t} />
          </div>

          {/* Inline filter bar (web) — collapsible */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000, ease: easing.easeOut as any }}
                className="overflow-hidden"
              >
                <div className="pb-3">
                  <FilterBar filters={filters} onChange={setFilters} t={t} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter chips */}
          <div className="pb-3">
            <ActiveFilterChips filters={filters} onRemove={removeFilter} onClear={clearFilters} t={t} />
          </div>
        </Container>
      </div>

      <Container className="max-w-[1280px] py-4 md:py-6">
        {/* Live region for new orders count */}
        <span className="sr-only" aria-live="polite">
          {t('seller.orders.newCountAria', { count: counts.new })}
        </span>

        {isLoading ? (
          <div className="space-y-2 md:space-y-0" aria-busy="true" aria-label={t('seller.orders.loading')}>
            {/* Mobile skeletons */}
            <div className="md:hidden flex flex-col gap-3">
              {[0, 1, 2, 3].map(i => (
                <SellerOrderRowSkeleton key={i} />
              ))}
            </div>
            {/* Table skeleton */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-border-light">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <SellerOrderRowSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <span className="text-4xl mb-3">⚠️</span>
            <h3 className="text-lg font-semibold text-text">{t('seller.orders.errorTitle')}</h3>
            <p className="text-sm text-text-muted mt-2">{t('seller.orders.errorSubtitle')}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-5 py-2.5 rounded-md border border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors"
              aria-label={t('seller.orders.retry')}
            >
              {t('seller.orders.retry')}
            </button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <EmptyState tab={activeTab} t={t} />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {visibleOrders.map((o, i) => (
                  <SellerOrderRow
                    key={o.subOrderId}
                    order={o}
                    index={i}
                    selected={selectedIds.has(o.subOrderId)}
                    onToggleSelect={toggleSelect}
                    onPress={() => router.push(`/orders/${o.subOrderId}`)}
                    onAction={() => router.push(`/orders/${o.subOrderId}`)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Web: dense table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border-light bg-surface">
              <table className="w-full border-collapse" role="table">
                <thead className="sticky z-sticky bg-surface" style={{ top: headerHeight }}>
                  <tr className="border-b border-[#E5E5E5]">
                    {[
                      { key: 'select', label: '', cls: 'w-12' },
                      { key: 'order', label: 'seller.orders.columnOrder', cls: 'text-left' },
                      { key: 'buyer', label: 'seller.orders.columnBuyer', cls: 'text-left hidden lg:table-cell' },
                      { key: 'items', label: 'seller.orders.columnProduct', cls: 'text-left' },
                      { key: 'total', label: 'seller.orders.columnTotal', cls: 'text-left hidden md:table-cell' },
                      { key: 'payment', label: 'seller.orders.columnPayment', cls: 'text-left hidden xl:table-cell' },
                      { key: 'date', label: 'seller.orders.columnDate', cls: 'text-left hidden md:table-cell' },
                      { key: 'status', label: 'seller.orders.columnStatus', cls: 'text-left' },
                      { key: 'sla', label: 'SLA', cls: 'text-left hidden xl:table-cell' },
                      { key: 'action', label: 'seller.orders.columnAction', cls: 'text-right' },
                    ].map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-4 py-3 text-[12px] font-semibold text-text-muted ${col.cls}`}
                      >
                        {col.label ? t(col.label) : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {visibleOrders.map((o, i) => (
                      <SellerOrderRow
                        key={o.subOrderId}
                        order={o}
                        index={i}
                        selected={selectedIds.has(o.subOrderId)}
                        onToggleSelect={toggleSelect}
                        onPress={() => router.push(`/orders/${o.subOrderId}`)}
                        onAction={() => router.push(`/orders/${o.subOrderId}`)}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Container>

      {/* Bulk action bar */}
      {selectedOrders.length > 0 && (
        <OrdersBulkBar
          selectedOrders={selectedOrders}
          onClear={() => setSelectedIds(new Set())}
          onRefetch={refetch}
          t={t}
        />
      )}
    </Screen>
  )
}
