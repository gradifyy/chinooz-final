'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, ArrowUpDown, Plus, X, Package, ChevronDown } from 'lucide-react'
import { Container, Screen, Button, EmptyState, SafeImage, useReducedMotion } from '@chinooz/ui-web'
import { useSellerProducts, useSellerCategories } from '@chinooz/hooks'
import { analytics } from '@chinooz/analytics'
import { useSellerSessionStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'
import type { SellerProduct, SellerProductStatus, StockStatus } from '@chinooz/types'
import type { SellerProductFilter } from '@chinooz/mock-data'
import { useA11y } from '@/components/A11yProvider'

type StatusTab = SellerProductStatus | 'all'
type SortKey = NonNullable<SellerProductFilter['sort']>

const STOCK_BADGE: Record<StockStatus, { label: string; cls: string; dot: string }> = {
  in_stock: { label: 'seller.products.stockInStock', cls: 'bg-success/10 text-success', dot: 'bg-success' },
  low_stock: { label: 'seller.products.stockLowStock', cls: 'bg-warning/15 text-[#92400E]', dot: 'bg-warning' },
  out_of_stock: { label: 'seller.products.stockOutOfStock', cls: 'bg-error/10 text-error', dot: 'bg-error' },
}

const STATUS_BADGE: Record<SellerProductStatus, { label: string; cls: string }> = {
  active: { label: 'seller.products.statusActive', cls: 'bg-success/10 text-success' },
  draft: { label: 'seller.products.statusDraft', cls: 'bg-info/10 text-info' },
  out_of_stock: { label: 'seller.products.statusOutOfStock', cls: 'bg-error/10 text-error' },
  archived: { label: 'seller.products.statusArchived', cls: 'bg-border text-text-secondary' },
}

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function ProductsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [status, setStatus] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  const [stockLevel, setStockLevel] = useState<StockStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [sortOpen, setSortOpen] = useState(false)

  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    analytics.screen({ name: 'seller-products' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!sortOpen) return
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [sortOpen])

  const filter: SellerProductFilter = useMemo(
    () => ({
      status,
      search: debouncedSearch,
      categoryId,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      stockLevel,
      sort,
    }),
    [status, debouncedSearch, categoryId, priceMin, priceMax, stockLevel, sort],
  )

  const { data, isLoading, isFetching } = useSellerProducts(filter)
  const { data: sellerCats } = useSellerCategories()

  const counts = data?.counts
  const items = data?.items ?? []

  const statusTabs: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all', label: t('seller.products.statusAll'), count: counts?.all ?? 0 },
    { key: 'active', label: t('seller.products.statusActive'), count: counts?.active ?? 0 },
    { key: 'draft', label: t('seller.products.statusDraft'), count: counts?.draft ?? 0 },
    { key: 'out_of_stock', label: t('seller.products.statusOutOfStock'), count: counts?.out_of_stock ?? 0 },
    { key: 'archived', label: t('seller.products.statusArchived'), count: counts?.archived ?? 0 },
  ]

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t('seller.products.sortNewest') },
    { key: 'best_selling', label: t('seller.products.sortBestSelling') },
    { key: 'price_asc', label: t('seller.products.sortPriceAsc') },
    { key: 'price_desc', label: t('seller.products.sortPriceDesc') },
    { key: 'stock', label: t('seller.products.sortStock') },
  ]
  const activeSortLabel = sortOptions.find(s => s.key === sort)?.label ?? sortOptions[0].label

  const activeFilters: { key: string; label: string; onClear: () => void }[] = []
  if (categoryId) {
    const cat = sellerCats?.find(c => c.id === categoryId)
    activeFilters.push({
      key: 'cat',
      label: cat?.name ?? categoryId,
      onClear: () => setCategoryId(undefined),
    })
  }
  if (priceMin) {
    activeFilters.push({ key: 'pmin', label: `${t('seller.products.filterPriceMin')}: ${formatNPR(Number(priceMin))}`, onClear: () => setPriceMin('') })
  }
  if (priceMax) {
    activeFilters.push({ key: 'pmax', label: `${t('seller.products.filterPriceMax')}: ${formatNPR(Number(priceMax))}`, onClear: () => setPriceMax('') })
  }
  if (stockLevel !== 'all') {
    const lbl = STOCK_BADGE[stockLevel as StockStatus].label
    activeFilters.push({ key: 'stock', label: t(lbl), onClear: () => setStockLevel('all') })
  }

  const clearAll = () => {
    setCategoryId(undefined)
    setPriceMin('')
    setPriceMax('')
    setStockLevel('all')
  }

  const hasActiveFilters = activeFilters.length > 0
  const isFiltered = hasActiveFilters || debouncedSearch.length > 0 || status !== 'all'

  const onAdd = () => {
    analytics.track({ event: 'seller_add_product_tapped', screen: 'seller-products' })
  }

  return (
    <Screen>
      {/* Sticky search / filter bar */}
      <div className="sticky top-0 z-sticky bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border-light">
        <Container>
          <div className="py-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                size={18}
                aria-hidden="true"
              />
              <input
                type="text"
                inputMode="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('seller.products.search')}
                aria-label={t('seller.products.searchAria')}
                className="w-full h-10 rounded-md border border-border bg-background pl-10 pr-9 text-[14px] text-text placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen(o => !o)}
                aria-label={t('seller.products.sortAria')}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                className="h-10 px-3 rounded-md border border-border bg-background text-[14px] font-medium text-text flex items-center gap-1.5 hover:border-text-tertiary transition-colors"
              >
                <ArrowUpDown size={16} className="text-text-muted" aria-hidden="true" />
                <span className="hidden sm:inline">{activeSortLabel}</span>
                <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.ul
                    role="listbox"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: reduced ? 0 : 0.15 }}
                    className="absolute right-0 mt-1 w-52 bg-surface border border-border rounded-md shadow-lg z-dropdown overflow-hidden"
                  >
                    {sortOptions.map(opt => (
                      <li key={opt.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={sort === opt.key}
                          onClick={() => {
                            setSort(opt.key)
                            setSortOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-[14px] flex items-center justify-between transition-colors hover:bg-background ${
                            sort === opt.key ? 'text-primary font-semibold' : 'text-text'
                          }`}
                        >
                          {opt.label}
                          {sort === opt.key && <span className="text-primary" aria-hidden="true">•</span>}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Add product (web, aligned with navbar action) */}
            <Button
              variant="primary"
              size="md"
              onPress={onAdd}
              leftIcon={<Plus size={16} aria-hidden="true" />}
              className="h-10 shrink-0"
            >
              <span className="hidden sm:inline">{t('seller.products.addProduct')}</span>
            </Button>
          </div>

          {/* Inline filter bar (web) */}
          <div className="hidden md:flex items-center gap-2 pb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted">
              <SlidersHorizontal size={15} aria-hidden="true" />
              {t('seller.products.filter')}
            </span>
            <select
              aria-label={t('seller.products.filterCategory')}
              value={categoryId ?? ''}
              onChange={e => setCategoryId(e.target.value || undefined)}
              className="h-9 rounded-md border border-border bg-background px-2.5 text-[13px] text-text outline-none focus:border-primary transition-colors"
            >
              <option value="">{t('seller.products.filterCategory')}</option>
              {sellerCats?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="inline-flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                aria-label={t('seller.products.filterPriceMin')}
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder={t('seller.products.filterPriceMin')}
                className="h-9 w-24 rounded-md border border-border bg-background px-2.5 text-[13px] text-text placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
              />
              <span className="text-text-tertiary text-[13px]">—</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label={t('seller.products.filterPriceMax')}
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder={t('seller.products.filterPriceMax')}
                className="h-9 w-24 rounded-md border border-border bg-background px-2.5 text-[13px] text-text placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
              />
            </div>

            <select
              aria-label={t('seller.products.filterStockLevel')}
              value={stockLevel}
              onChange={e => setStockLevel(e.target.value as StockStatus | 'all')}
              className="h-9 rounded-md border border-border bg-background px-2.5 text-[13px] text-text outline-none focus:border-primary transition-colors"
            >
              <option value="all">{t('seller.products.filterStockLevel')}</option>
              <option value="in_stock">{t('seller.products.stockInStock')}</option>
              <option value="low_stock">{t('seller.products.stockLowStock')}</option>
              <option value="out_of_stock">{t('seller.products.stockOutOfStock')}</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[13px] font-medium text-primary hover:text-primary-dark transition-colors ml-1"
              >
                {t('seller.products.clearAll')}
              </button>
            )}
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-6">
          {/* Status segmented control */}
          <div
            role="tablist"
            aria-label={t('seller.products.title')}
            className="flex items-center gap-1 p-1 bg-surface rounded-full h-10 w-full md:w-auto md:inline-flex overflow-x-auto scrollbar-none"
          >
            {statusTabs.map(tab => {
              const isActive = tab.key === status
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setStatus(tab.key)}
                  className={`relative z-10 flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 shrink-0 ${
                    isActive ? 'text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center text-[12px] font-semibold rounded-full px-1.5 min-w-[20px] h-5 transition-colors ${
                      isActive ? 'bg-white/25 text-white' : 'bg-border text-text-secondary'
                    }`}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="status-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary"
                      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Active filter chips */}
          <div className="mt-3 min-h-[28px] flex items-center gap-2 flex-wrap">
            <AnimatePresence mode="popLayout">
              {activeFilters.map(f => (
                <motion.span
                  key={f.key}
                  initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary text-white pl-3 pr-1.5 py-1 text-[13px] font-medium"
                >
                  {f.label}
                  <button
                    type="button"
                    onClick={f.onClear}
                    aria-label={`${t('seller.products.clearAll')}: ${f.label}`}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 hover:bg-white/40 transition-colors"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            {isFetching && items.length > 0 && (
              <span className="text-[12px] text-text-tertiary">…</span>
            )}
          </div>

          {/* Result count */}
          <p className="mt-3 text-[13px] text-text-muted">
            {t('seller.products.count', { count: data?.total ?? 0 })}
          </p>

          {/* List slot */}
          <div className="mt-4">
            {isLoading ? (
              <ProductTableSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Package size={40} className="text-text-tertiary" aria-hidden="true" />}
                title={isFiltered ? t('seller.products.emptyFilteredTitle') : t('seller.products.emptyTitle')}
                subtitle={isFiltered ? t('seller.products.emptyFilteredSubtitle') : t('seller.products.emptySubtitle')}
                action={
                  !isFiltered
                    ? { label: t('seller.products.addProduct'), onPress: onAdd }
                    : { label: t('seller.products.clearAll'), onPress: () => { clearAll(); setSearch(''); setStatus('all') } }
                }
              />
            ) : (
              <>
                {/* Web data table (md+) */}
                <div className="hidden md:block">
                  <ProductTable items={items} />
                </div>

                {/* Mobile cards (<md) */}
                <div className="md:hidden flex flex-col gap-3">
                  {items.map((p, i) => (
                    <ProductCardMobile key={p.id} product={p} index={i} reduced={reduced} />
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

function ProductTable({ items }: { items: SellerProduct[] }) {
  const { t } = useTranslation()
  return (
    <div className="bg-surface border border-border-light rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-background sticky top-0">
              <Th className="text-left min-w-[280px]">{t('seller.products.colProduct')}</Th>
              <Th className="text-left">{t('seller.products.colCategory')}</Th>
              <Th className="text-right">{t('seller.products.colPrice')}</Th>
              <Th className="text-left">{t('seller.products.colStock')}</Th>
              <Th className="text-left">{t('seller.products.colStatus')}</Th>
              <Th className="text-right">{t('seller.products.colSales')}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr
                key={p.id}
                className="h-16 border-b border-border last:border-b-0 hover:bg-background/60 transition-colors"
              >
                <td className="py-2 px-4">
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={p.image}
                      alt={p.name}
                      className="w-10 h-10 rounded-md object-cover bg-border-light shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-text truncate max-w-[220px]">{p.name}</p>
                      <p className="text-[12px] text-text-muted truncate">{t('seller.products.sku')}: {p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-4 text-[13px] text-text-secondary">{p.categoryName}</td>
                <td className="py-2 px-4 text-right">
                  <span className="text-[14px] font-semibold text-text">{formatNPR(p.price)}</span>
                  {p.compareAtPrice && (
                    <span className="block text-[12px] text-text-tertiary line-through">{formatNPR(p.compareAtPrice)}</span>
                  )}
                </td>
                <td className="py-2 px-4">
                  <StockPill stock={p.stock} count={p.stockCount} />
                </td>
                <td className="py-2 px-4">
                  <StatusPill status={p.status} />
                </td>
                <td className="py-2 px-4 text-right text-[13px] text-text-secondary tabular-nums">{p.salesCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-[12px] font-semibold text-text-muted tracking-wide uppercase ${className}`}
    >
      {children}
    </th>
  )
}

function StockPill({ stock, count }: { stock: StockStatus; count: number }) {
  const { t } = useTranslation()
  const cfg = STOCK_BADGE[stock]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {t(cfg.label)} · {count}
    </span>
  )
}

function StatusPill({ status }: { status: SellerProductStatus }) {
  const { t } = useTranslation()
  const cfg = STATUS_BADGE[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${cfg.cls}`}>
      {t(cfg.label)}
    </span>
  )
}

function ProductCardMobile({
  product,
  index,
  reduced,
}: {
  product: SellerProduct
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
      className="bg-surface border border-border-light rounded-lg shadow-sm p-3 flex gap-3"
    >
      <SafeImage
        src={product.image}
        alt={product.name}
        className="w-14 h-14 rounded-md object-cover bg-border-light shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-text truncate">{product.name}</p>
          <StatusPill status={product.status} />
        </div>
        <p className="text-[12px] text-text-muted truncate">{t('seller.products.sku')}: {product.sku}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-text">{formatNPR(product.price)}</span>
          <StockPill stock={product.stock} count={product.stockCount} />
        </div>
      </div>
    </motion.div>
  )
}

function ProductTableSkeleton() {
  return (
    <div className="bg-surface border border-border-light rounded-lg overflow-hidden">
      <div className="h-11 border-b border-border bg-background" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 border-b border-border last:border-b-0 flex items-center px-4 gap-3">
          <div className="w-10 h-10 rounded-md bg-shimmer animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-shimmer animate-pulse" />
            <div className="h-2.5 w-1/4 rounded bg-shimmer animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
