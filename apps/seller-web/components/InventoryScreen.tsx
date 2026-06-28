'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ArrowUpDown,
  PackageSearch,
  RotateCw,
} from 'lucide-react'
import { Container, Screen, SafeImage, Spinner, EmptyState, InventoryRow } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSellerInventory, useSellerCategories, useUpdateStock } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPR } from '@chinooz/utils'
import { easing } from '@chinooz/theme'
import type { SellerInventoryProduct, SellerInventoryVariant, StockStatus } from '@chinooz/types'
import { LOW_STOCK_THRESHOLD, type InventorySort } from '@chinooz/mock-data'

type TabKey = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

const STATUS_STYLES: Record<StockStatus, { dot: string; text: string; bg: string; labelKey: string }> = {
  in_stock: { dot: 'bg-success', text: 'text-success', bg: 'bg-success-light', labelKey: 'seller.inventory.inStock' },
  low_stock: { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning-light', labelKey: 'seller.inventory.lowStock' },
  out_of_stock: { dot: 'bg-error', text: 'text-error', bg: 'bg-error-light', labelKey: 'seller.inventory.outOfStock' },
}

const SORT_OPTIONS: { key: InventorySort; labelKey: string }[] = [
  { key: 'best_selling', labelKey: 'seller.inventory.sortBestSelling' },
  { key: 'stock_desc', labelKey: 'seller.inventory.sortStockDesc' },
  { key: 'stock_asc', labelKey: 'seller.inventory.sortStockAsc' },
  { key: 'name', labelKey: 'seller.inventory.sortName' },
]

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'seller.inventory.tabAll' },
  { key: 'in_stock', labelKey: 'seller.inventory.tabInStock' },
  { key: 'low_stock', labelKey: 'seller.inventory.tabLowStock' },
  { key: 'out_of_stock', labelKey: 'seller.inventory.tabOutStock' },
]

const TABNUM = { 'font-variant-numeric': 'tabular-nums' } as React.CSSProperties

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={[
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full',
        'text-xs font-semibold tabular-nums',
        active ? 'bg-white/25 text-white' : 'bg-primary-50 text-primary border border-primary-50',
      ].join(' ')}
      style={TABNUM}
      aria-label={`${count}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function SegmentControl({
  active,
  onChange,
  counts,
}: {
  active: TabKey
  onChange: (k: TabKey) => void
  counts: Record<TabKey, number>
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <div className="flex overflow-x-auto scrollbar-none md:overflow-visible" role="tablist" aria-label="Stock status">
      <div className="relative flex bg-surface rounded-full h-10 p-1 min-w-max md:min-w-0">
        {TABS.map(tab => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              role="tab"
              aria-selected={isActive}
              className={[
                'relative z-10 flex items-center gap-1.5 h-8 px-4 rounded-full',
                'text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                isActive ? 'text-white' : 'text-text-muted hover:text-text',
              ].join(' ')}
            >
              {isActive && (
                <motion.div
                  layoutId="inv-segment-indicator"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={reduced ? { duration: 0 } : { type: 'spring', damping: 22, stiffness: 320, mass: 0.7 }}
                />
              )}
              <span className="relative z-10">{t(tab.labelKey)}</span>
              <span className="relative z-10">
                <CountBadge count={counts[tab.key]} active={isActive} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: StockStatus }) {
  const { t } = useTranslation()
  const s = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {t(s.labelKey)}
    </span>
  )
}

function SortDropdown({
  value,
  onChange,
}: {
  value: InventorySort
  onChange: (v: InventorySort) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = SORT_OPTIONS.find(o => o.key === value) ?? SORT_OPTIONS[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('seller.inventory.sort')}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-surface text-sm font-medium text-text hover:bg-background transition-colors"
      >
        <ArrowUpDown size={15} className="text-text-muted" />
        <span className="hidden sm:inline">{t(current.labelKey)}</span>
        <span className="sm:hidden">{t('seller.inventory.sort')}</span>
        <ChevronDown size={15} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-border bg-surface py-1 shadow-lg overflow-hidden"
          >
            {SORT_OPTIONS.map(opt => (
              <li key={opt.key} role="option" aria-selected={opt.key === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.key)
                    setOpen(false)
                  }}
                  className={[
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    opt.key === value ? 'text-primary font-semibold bg-primary-50' : 'text-text hover:bg-background',
                  ].join(' ')}
                >
                  {t(opt.labelKey)}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterBar({
  categories,
  category,
  onCategory,
  stockMin,
  stockMax,
  onStock,
  onReset,
}: {
  categories: { id: string; name: string }[]
  category: string | null
  onCategory: (id: string | null) => void
  stockMin: number | null
  stockMax: number | null
  onStock: (min: number | null, max: number | null) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [min, setMin] = useState(stockMin?.toString() ?? '')
  const [max, setMax] = useState(stockMax?.toString() ?? '')

  useEffect(() => {
    setMin(stockMin?.toString() ?? '')
    setMax(stockMax?.toString() ?? '')
  }, [stockMin, stockMax])

  const apply = () => onStock(min ? Number(min) : null, max ? Number(max) : null)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <SlidersHorizontal size={15} className="text-text-muted flex-shrink-0" />
        <select
          aria-label={t('seller.inventory.category')}
          value={category ?? ''}
          onChange={e => onCategory(e.target.value || null)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none max-w-[180px]"
        >
          <option value="">{t('seller.inventory.categoryAll')}</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-text-muted">{t('seller.inventory.stockRange')}</span>
        <input
          inputMode="numeric"
          aria-label={t('seller.inventory.stockMin')}
          value={min}
          onChange={e => setMin(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={apply}
          placeholder={t('seller.inventory.stockMin')}
          className="w-16 h-9 rounded-lg border border-border bg-background px-2 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
          style={TABNUM}
        />
        <span className="text-text-tertiary">–</span>
        <input
          inputMode="numeric"
          aria-label={t('seller.inventory.stockMax')}
          value={max}
          onChange={e => setMax(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={apply}
          placeholder={t('seller.inventory.stockMax')}
          className="w-16 h-9 rounded-lg border border-border bg-background px-2 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
          style={TABNUM}
        />
      </div>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto text-sm font-medium text-text-muted hover:text-text transition-colors"
      >
        {t('seller.inventory.reset')}
      </button>
    </div>
  )
}

function ActiveChips({
  category,
  categoryName,
  stockMin,
  stockMax,
  onClearCategory,
  onClearStock,
}: {
  category: string | null
  categoryName?: string
  stockMin: number | null
  stockMax: number | null
  onClearCategory: () => void
  onClearStock: () => void
}) {
  const { t } = useTranslation()
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (category) chips.push({ key: 'cat', label: categoryName ?? category, onRemove: onClearCategory })
  const stockLabel = [stockMin != null ? `${stockMin}` : null, stockMax != null ? `${stockMax}` : null]
    .filter(Boolean)
    .join('–')
  if (stockLabel) chips.push({ key: 'stock', label: `${t('seller.inventory.stockRange')}: ${stockLabel}`, onRemove: onClearStock })
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(c => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          {c.label}
          <button type="button" onClick={c.onRemove} aria-label="Remove" className="inline-flex items-center">
            <X size={13} />
          </button>
        </span>
      ))}
    </div>
  )
}

function ProductGroupRow({
  product,
  expanded,
  onToggle,
}: {
  product: SellerInventoryProduct
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <div role="row" className="bg-background hover:bg-surface transition-colors border-b border-border-light">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 h-14 text-left"
      >
        <SafeImage
          src={product.image}
          alt={product.name}
          width={36}
          height={36}
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-border-light"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text truncate">{product.name}</p>
          <p className="text-xs text-text-muted truncate">
            {product.variantCount > 1
              ? t('seller.inventory.variants', { count: product.variantCount })
              : t('seller.inventory.variant', { count: product.variantCount })}
            <span className="text-text-tertiary"> · {product.categoryName}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <StatusPill status={product.stock} />
          <span className="text-sm font-semibold text-text tabular-nums" style={TABNUM}>
            {product.aggregateStock}
          </span>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.15, ease: easing.easeOut }}
          className="text-text-muted"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>
    </div>
  )
}

const VARIANT_GRID = 'grid grid-cols-[1.4fr_1fr_120px_110px_70px_130px] items-center'

function VariantRow({ v, onStockChange, editState }: {
  v: SellerInventoryVariant
  onStockChange: (newStock: number, mode: 'set' | 'adjust', reason?: 'restock' | 'correction' | 'damage' | 'loss' | 'return' | 'other') => void
  editState: 'idle' | 'saving' | 'saved' | 'error'
}) {
  return (
    <InventoryRow
      variant={v}
      lowStockThreshold={LOW_STOCK_THRESHOLD}
      layout="table"
      showOptionalColumns
      editable
      onStockChange={onStockChange}
      editState={editState}
    />
  )
}

function ProductGroupCard({
  product,
  expanded,
  onToggle,
}: {
  product: SellerInventoryProduct
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-background transition-colors"
      >
        <SafeImage
          src={product.image}
          alt={product.name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-border-light"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text truncate">{product.name}</p>
          <p className="text-xs text-text-muted truncate">
            {product.variantCount > 1
              ? t('seller.inventory.variants', { count: product.variantCount })
              : t('seller.inventory.variant', { count: product.variantCount })}
            <span className="text-text-tertiary"> · {product.categoryName}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-bold text-text tabular-nums" style={TABNUM}>{product.aggregateStock}</span>
          <StatusPill status={product.stock} />
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.15, ease: easing.easeOut }}
          className="text-text-muted flex-shrink-0"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="variants"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={reduced ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduced ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2, ease: easing.easeOut }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border-light border-t border-border-light">
              {product.variants.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-3 pl-16">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text truncate">{v.name}</p>
                    <p className="text-xs text-text-muted tabular-nums" style={TABNUM}>{v.sku}</p>
                  </div>
                  <span className="text-sm font-semibold text-text tabular-nums" style={TABNUM}>{formatNPR(v.price)}</span>
                  <div className="flex flex-col items-end gap-1 w-20">
                    <span className="text-sm font-bold text-text tabular-nums" style={TABNUM}>{v.stockCount}</span>
                    <StatusPill status={v.stock} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function InventoryScreen() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query, 250)
  const [sort, setSort] = useState<InventorySort>('best_selling')
  const [category, setCategory] = useState<string | null>(null)
  const [stockMin, setStockMin] = useState<number | null>(null)
  const [stockMax, setStockMax] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => { analytics.screen({ name: 'seller-inventory' }) }, [])

  const catsQ = useSellerCategories()
  const inventoryFilter = {
    status: tab,
    search: debouncedQuery,
    categoryId: category ?? undefined,
    stockMin: stockMin ?? undefined,
    stockMax: stockMax ?? undefined,
    sort,
  }
  const invQ = useSellerInventory(inventoryFilter)
  const stockMutation = useUpdateStock()

  const handleStockChange = (variantId: string, productId: string, newStock: number, mode: 'set' | 'adjust', reason?: 'restock' | 'correction' | 'damage' | 'loss' | 'return' | 'other') => {
    stockMutation.mutate({ productId, variantId, newCount: newStock, mode, reason: reason ?? 'restock' })
  }

  const variantEditState = (variantId: string): 'idle' | 'saving' | 'saved' | 'error' => {
    if (stockMutation.isPending && stockMutation.variables?.variantId === variantId) return 'saving'
    if (stockMutation.isError && stockMutation.variables?.variantId === variantId) return 'error'
    if (stockMutation.isSuccess && stockMutation.variables?.variantId === variantId) return 'saved'
    return 'idle'
  }

  const counts = useMemo<Record<TabKey, number>>(() => {
    const c = invQ.data?.counts
    return {
      all: c?.all ?? 0,
      in_stock: c?.in_stock ?? 0,
      low_stock: c?.low_stock ?? 0,
      out_of_stock: c?.out_of_stock ?? 0,
    }
  }, [invQ.data])

  const categoryName = useMemo(
    () => catsQ.data?.find(c => c.id === category)?.name,
    [catsQ.data, category],
  )

  const toggleGroup = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const resetFilters = () => {
    setCategory(null)
    setStockMin(null)
    setStockMax(null)
  }

  const hasActiveFilters = Boolean(category) || stockMin != null || stockMax != null
  const products = invQ.data?.products ?? []
  const isLoading = invQ.isLoading
  const isError = invQ.isError

  if (!isLoggedIn) return null

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl font-bold text-text">{t('seller.inventory.title')}</h1>
            <p className="text-text-muted text-sm mt-0.5">{t('seller.inventory.subtitle')}</p>
          </div>

          {/* Sticky controls */}
          <div className="sticky top-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border-light">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  inputMode="search"
                  aria-label={t('seller.inventory.searchAria')}
                  placeholder={t('seller.inventory.search')}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-9 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <SortDropdown value={sort} onChange={setSort} />
            </div>

            <div className="mb-3">
              <SegmentControl active={tab} onChange={setTab} counts={counts} />
            </div>

            {/* Web inline filter bar */}
            <div className="hidden md:block">
              <FilterBar
                categories={catsQ.data ?? []}
                category={category}
                onCategory={setCategory}
                stockMin={stockMin}
                stockMax={stockMax}
                onStock={(mn, mx) => { setStockMin(mn); setStockMax(mx) }}
                onReset={resetFilters}
              />
            </div>

            {/* Mobile filter trigger */}
            <div className="md:hidden">
              <MobileFilterSheet
                categories={catsQ.data ?? []}
                category={category}
                onCategory={setCategory}
                stockMin={stockMin}
                stockMax={stockMax}
                onStock={(mn, mx) => { setStockMin(mn); setStockMax(mx) }}
                onReset={resetFilters}
              />
            </div>

            {hasActiveFilters && (
              <div className="mt-3">
                <ActiveChips
                  category={category}
                  categoryName={categoryName}
                  stockMin={stockMin}
                  stockMax={stockMax}
                  onClearCategory={() => setCategory(null)}
                  onClearStock={() => { setStockMin(null); setStockMax(null) }}
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="mt-4">
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Spinner size="md" />
                <span className="ml-3 text-sm text-text-muted">{t('seller.inventory.loading')}</span>
              </div>
            )}

            {isError && !isLoading && (
              <EmptyState
                icon={<RotateCw size={32} className="text-text-muted" />}
                title={t('seller.inventory.error')}
                action={{ label: t('seller.inventory.retry'), onPress: () => invQ.refetch() }}
              />
            )}

            {!isLoading && !isError && products.length === 0 && (
              <EmptyState
                icon={<PackageSearch size={32} className="text-text-muted" />}
                title={query ? t('seller.inventory.emptySearch', { query }) : t('seller.inventory.empty')}
              />
            )}

            {!isLoading && !isError && products.length > 0 && (
              <>
                {/* Web data table */}
                <div
                  className="hidden md:block rounded-xl border border-border-light bg-surface overflow-hidden"
                  role="table"
                  aria-label={t('seller.inventory.title')}
                >
                  {/* Sticky header */}
                  <div role="rowgroup" className="sticky top-[112px] z-10 bg-surface border-b border-border">
                    <div role="row" className={`${VARIANT_GRID} px-4 h-10`}>
                      <span role="columnheader" className="text-xs font-semibold text-text-muted">{t('seller.inventory.colProduct')}</span>
                      <span role="columnheader" className="text-xs font-semibold text-text-muted">{t('seller.inventory.colVariant')}</span>
                      <span role="columnheader" className="text-xs font-semibold text-text-muted">{t('seller.inventory.colSku')}</span>
                      <span role="columnheader" className="text-xs font-semibold text-text-muted">{t('seller.inventory.colPrice')}</span>
                      <span role="columnheader" className="text-xs font-semibold text-text-muted">{t('seller.inventory.colStock')}</span>
                      <span role="columnheader" className="text-xs font-semibold text-text-muted text-right">{t('seller.inventory.colStatus')}</span>
                    </div>
                  </div>
                  <div role="rowgroup">
                    {products.map(p => {
                      const isExpanded = expanded.has(p.id)
                      return (
                        <div key={p.id} role="rowgroup">
                          <ProductGroupRow product={p} expanded={isExpanded} onToggle={() => toggleGroup(p.id)} />
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                key="v"
                                role="rowgroup"
                                initial={reduced ? false : { height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={reduced ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                                transition={reduced ? { duration: 0 } : { duration: 0.2, ease: easing.easeOut }}
                                className="overflow-hidden"
                              >
                                {p.variants.map(v => (
                                  <VariantRow
                                    key={v.id}
                                    v={v}
                                    onStockChange={(ns, m, r) => handleStockChange(v.id, p.id, ns, m, r)}
                                    editState={variantEditState(v.id)}
                                  />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile compact rows */}
                <div className="md:hidden space-y-2.5">
                  {products.map(p => (
                    <ProductGroupCard
                      key={p.id}
                      product={p}
                      expanded={expanded.has(p.id)}
                      onToggle={() => toggleGroup(p.id)}
                    />
                  ))}
                </div>

                <p className="mt-4 text-xs text-text-muted tabular-nums" style={TABNUM}>
                  {t('seller.inventory.count', { count: invQ.data?.totalVariants ?? 0 })}
                </p>
              </>
            )}
          </div>
        </div>
      </Container>
    </Screen>
  )
}

function MobileFilterSheet({
  categories,
  category,
  onCategory,
  stockMin,
  stockMax,
  onStock,
  onReset,
}: {
  categories: { id: string; name: string }[]
  category: string | null
  onCategory: (id: string | null) => void
  stockMin: number | null
  stockMax: number | null
  onStock: (min: number | null, max: number | null) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [min, setMin] = useState(stockMin?.toString() ?? '')
  const [max, setMax] = useState(stockMax?.toString() ?? '')

  useEffect(() => {
    setMin(stockMin?.toString() ?? '')
    setMax(stockMax?.toString() ?? '')
  }, [stockMin, stockMax, open])

  const activeCount = (category ? 1 : 0) + (stockMin != null || stockMax != null ? 1 : 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('seller.inventory.filterAria')}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-surface text-sm font-medium text-text"
      >
        <SlidersHorizontal size={16} className="text-text-muted" />
        {t('seller.inventory.filter')}
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold tabular-nums" style={TABNUM}>
            {activeCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-overlay"
              role="button"
              aria-label="Close"
              tabIndex={0}
              onClick={() => setOpen(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
            />
            <motion.div
              className="absolute bottom-0 inset-x-0 bg-surface rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={reduced ? { duration: 0 } : { duration: 0.25, ease: easing.easeOut }}
              role="dialog"
              aria-modal="true"
              aria-label={t('seller.inventory.filterTitle')}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text">{t('seller.inventory.filterTitle')}</h2>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-text-muted"><X size={20} /></button>
              </div>

              <p className="text-xs font-semibold text-text-muted mb-2">{t('seller.inventory.category')}</p>
              <select
                aria-label={t('seller.inventory.category')}
                value={category ?? ''}
                onChange={e => onCategory(e.target.value || null)}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none mb-4"
              >
                <option value="">{t('seller.inventory.categoryAll')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <p className="text-xs font-semibold text-text-muted mb-2">{t('seller.inventory.stockRange')}</p>
              <div className="flex items-center gap-2 mb-6">
                <input
                  inputMode="numeric"
                  aria-label={t('seller.inventory.stockMin')}
                  value={min}
                  onChange={e => setMin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('seller.inventory.stockMin')}
                  className="flex-1 h-11 rounded-xl border border-border bg-background px-3 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
                  style={TABNUM}
                />
                <span className="text-text-tertiary">–</span>
                <input
                  inputMode="numeric"
                  aria-label={t('seller.inventory.stockMax')}
                  value={max}
                  onChange={e => setMax(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('seller.inventory.stockMax')}
                  className="flex-1 h-11 rounded-xl border border-border bg-background px-3 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
                  style={TABNUM}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onReset}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-text"
                >
                  {t('seller.inventory.reset')}
                </button>
                <button
                  type="button"
                  onClick={() => { onStock(min ? Number(min) : null, max ? Number(max) : null); setOpen(false) }}
                  className="flex-1 h-11 rounded-xl bg-primary text-sm font-semibold text-white"
                >
                  {t('seller.inventory.apply')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
