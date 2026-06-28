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
import { ProductRow, ProductRowSkeleton } from '@/components/ProductRow'

type StatusTab = SellerProductStatus | 'all'
type SortKey = NonNullable<SellerProductFilter['sort']>

const STOCK_BADGE: Record<StockStatus, { label: string; cls: string; dot: string }> = {
  in_stock: { label: 'seller.products.stockInStock', cls: 'bg-success/10 text-success', dot: 'bg-success' },
  low_stock: { label: 'seller.products.stockLowStock', cls: 'bg-warning/15 text-[#92400E]', dot: 'bg-warning' },
  out_of_stock: { label: 'seller.products.stockOutOfStock', cls: 'bg-error/10 text-error', dot: 'bg-error' },
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectable = true

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

  const handleSelectChange = (id: string, sel: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (sel) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleEdit = (p: SellerProduct) => {
    analytics.track({ event: 'seller_product_edit_tapped', screen: 'seller-products', properties: { productId: p.id } })
  }
  const handleDuplicate = (p: SellerProduct) => {
    analytics.track({ event: 'seller_product_duplicate_tapped', screen: 'seller-products', properties: { productId: p.id } })
  }
  const handleToggleActive = (p: SellerProduct) => {
    analytics.track({ event: 'seller_product_toggle_active', screen: 'seller-products', properties: { productId: p.id, from: p.status } })
  }
  const handleDelete = (p: SellerProduct) => {
    analytics.track({ event: 'seller_product_delete_tapped', screen: 'seller-products', properties: { productId: p.id } })
  }
  const handleStockChange = (p: SellerProduct, stock: number) => {
    analytics.track({ event: 'seller_product_stock_edit', screen: 'seller-products', properties: { productId: p.id, stock } })
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
              <ProductTableSkeleton selectable={selectable} />
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
                  <ProductTable
                    items={items}
                    selectable={selectable}
                    selectedIds={selectedIds}
                    onSelectChange={handleSelectChange}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onStockChange={handleStockChange}
                  />
                </div>

                {/* Mobile cards (<md) */}
                <div className="md:hidden flex flex-col gap-3">
                  {items.map((p, i) => (
                    <MobileCardWrapper key={p.id} product={p} index={i} reduced={reduced} />
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

function ProductTable({
  items,
  selectable,
  selectedIds,
  onSelectChange,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onStockChange,
}: {
  items: SellerProduct[]
  selectable: boolean
  selectedIds: Set<string>
  onSelectChange: (id: string, sel: boolean) => void
  onEdit: (p: SellerProduct) => void
  onDuplicate: (p: SellerProduct) => void
  onToggleActive: (p: SellerProduct) => void
  onDelete: (p: SellerProduct) => void
  onStockChange: (p: SellerProduct, stock: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="bg-surface border border-border-light rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-background sticky top-0">
              {selectable && <Th className="text-left w-10">{''}</Th>}
              <Th className="text-left min-w-[280px]">{t('seller.products.colProduct')}</Th>
              <Th className="text-left">{t('seller.products.colCategory')}</Th>
              <Th className="text-right">{t('seller.products.colPrice')}</Th>
              <Th className="text-left">{t('seller.products.colStock')}</Th>
              <Th className="text-left">{t('seller.products.colStatus')}</Th>
              <Th className="text-right">{t('seller.products.colSales')}</Th>
              <Th className="text-right w-12">{''}</Th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <ProductRow
                key={p.id}
                product={p}
                selected={selectedIds.has(p.id)}
                selectable={selectable}
                onSelectChange={onSelectChange}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
                onStockChange={onStockChange}
              />
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

function ProductTableSkeleton({ selectable = false }: { selectable?: boolean }) {
  return (
    <div className="bg-surface border border-border-light rounded-lg overflow-hidden" aria-busy="true">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-background">
              {selectable && <th className="w-10 px-4 py-2.5" />}
              <th className="text-left min-w-[280px] px-4 py-2.5 text-[12px] font-semibold text-text-muted uppercase">{''}</th>
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductRowSkeleton key={i} selectable={selectable} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobileCardWrapper({
  product,
  index,
  reduced,
}: {
  product: SellerProduct
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
  const [stockValue, setStockValue] = useState(String(product.stockCount))
  const [selected, setSelected] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const sLevel = product.stockCount <= 0 ? 'out' : product.stockCount <= 10 ? 'low' : 'in_stock'
  const sColor = sLevel === 'out' ? '#DC2626' : sLevel === 'low' ? '#F59E0B' : '#16A34A'
  const sLabel = sLevel === 'out' ? t('seller.products.stockOutOfStock') : sLevel === 'low' ? t('seller.products.stockLowStock') : t('seller.products.stockInStock')
  const stCfg = {
    active: { label: t('seller.products.statusActive'), color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
    draft: { label: t('seller.products.statusDraft'), color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
    out_of_stock: { label: t('seller.products.statusOutOfStock'), color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
    archived: { label: t('seller.products.statusArchived'), color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  }[product.status]

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
      className={`bg-surface border rounded-lg shadow-sm p-3 flex gap-3 cursor-pointer transition-colors ${selected ? 'border-primary bg-primary-50/40' : 'border-border-light hover:bg-background/60'}`}
      onClick={() => {/* edit in SP4 */}}
      role="button"
      aria-label={t('seller.products.rowAria', { name: product.name, price: formatNPR(product.price), stockLabel: sLabel, count: product.stockCount, status: stCfg.label })}
    >
      {selected && <div className="w-4 h-4 mt-1 rounded bg-primary flex items-center justify-center text-white text-[10px] font-bold">✓</div>}
      <SafeImage
        src={product.image}
        alt={product.name}
        className="w-12 h-12 rounded-md object-cover bg-border-light shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[16px] font-semibold text-text truncate">{product.name}</p>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold shrink-0" style={{ backgroundColor: stCfg.bg, color: stCfg.color }}>{stCfg.label}</span>
        </div>
        <p className="text-[12px] text-text-muted truncate font-mono">{product.sku}</p>
        <p className="text-[12px] text-text-muted truncate">{product.categoryName}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-text tabular-nums">{formatNPR(product.price)}</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ backgroundColor: `rgba(${sLevel === 'out' ? '220,38,38' : sLevel === 'low' ? '245,158,11' : '22,163,74'},0.10)`, color: sColor }}>
            {sLabel} · <span className="tabular-nums">{product.stockCount}</span>
          </span>
        </div>
        <p className="mt-1 text-[12px] text-text-muted">{t('seller.products.unitsSold', { count: product.salesCount })}</p>
      </div>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o) }}
          aria-label={t('seller.products.actionSheetTitle')}
          className="text-text-muted hover:text-text p-1"
        >
          <span className="text-[20px] font-bold leading-none">⋯</span>
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              role="menu"
              initial={reduced ? false : { opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
              transition={reduced ? { duration: 0 } : { duration: 0.15 }}
              className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-md shadow-lg z-dropdown overflow-hidden"
            >
              <MobileMenuItem label={t('seller.products.actionEdit')} ariaLabel={t('seller.products.actionEditAria')} onClick={() => { setMenuOpen(false) }} />
              <MobileMenuItem label={t('seller.products.actionDuplicate')} ariaLabel={t('seller.products.actionDuplicateAria')} onClick={() => { setMenuOpen(false) }} />
              <MobileMenuItem label={product.status === 'active' ? t('seller.products.actionDeactivate') : t('seller.products.actionActivate')} ariaLabel={t('seller.products.actionSheetTitle')} onClick={() => { setMenuOpen(false) }} />
              <MobileMenuItem label={t('seller.products.actionQuickStock')} ariaLabel={t('seller.products.actionQuickStockAria')} onClick={() => { setMenuOpen(false); setStockValue(String(product.stockCount)); setStockOpen(true) }} />
              <div className="border-t border-border-light my-1" />
              <MobileMenuItem label={t('seller.products.actionDelete')} ariaLabel={t('seller.products.actionDeleteAria')} danger onClick={() => { setMenuOpen(false); setConfirmOpen(true) }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function MobileMenuItem({ label, ariaLabel, onClick, danger }: { label: string; ariaLabel: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-full text-left px-3 py-2 text-[14px] transition-colors hover:bg-background ${danger ? 'text-error' : 'text-text'}`}
    >
      {label}
    </button>
  )
}
