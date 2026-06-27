'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion, EmptyState } from '@chinooz/ui-web'
import { ProductCard } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import FilterPanel, { type FilterState } from '@/components/FilterPanel'
import type { Product, Category } from '@chinooz/types'

const QUICK_FILTERS = [
  { key: 'onSale', labelKey: 'categories.onSale' },
  { key: 'freeDelivery', labelKey: 'categories.freeDelivery' },
  { key: 'topRated', labelKey: 'categories.topRated' },
  { key: 'newArrivals', labelKey: 'categories.newArrivals' },
]

const SORT_OPTIONS = [
  { key: 'popular', labelKey: 'categories.mostPopular' },
  { key: 'priceLow', labelKey: 'categories.priceLowHigh' },
  { key: 'priceHigh', labelKey: 'categories.priceHighLow' },
]

const DEFAULT_FILTERS: FilterState = {
  priceMin: 0,
  priceMax: 999999,
  minRating: 0,
  brands: new Set(),
  inStock: false,
  onSale: false,
}

interface Props {
  categoryId: string
  categoryName: string
  categories: Category[]
  initialProducts: Product[]
  initialTotal: number
}

export default function CategoryListingClient({
  categoryId,
  categoryName,
  categories,
  initialProducts,
  initialTotal,
}: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('popular')
  const [showSort, setShowSort] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Hydrate filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const urlFilters: FilterState = { ...DEFAULT_FILTERS }
    if (params.get('onSale') === '1') urlFilters.onSale = true
    if (params.get('inStock') === '1') urlFilters.inStock = true
    if (params.get('minRating')) urlFilters.minRating = Number(params.get('minRating'))
    if (params.get('priceMin')) urlFilters.priceMin = Number(params.get('priceMin'))
    if (params.get('priceMax')) urlFilters.priceMax = Number(params.get('priceMax'))
    if (params.get('brands')) {
      urlFilters.brands = new Set(params.get('brands')!.split(','))
    }
    if (params.get('sort')) setSortBy(params.get('sort')!)
    setFilters(urlFilters)
  }, [])

  // Sync filters to URL
  const syncToUrl = useCallback((f: FilterState, sort: string) => {
    const params = new URLSearchParams()
    if (f.onSale) params.set('onSale', '1')
    if (f.inStock) params.set('inStock', '1')
    if (f.minRating > 0) params.set('minRating', String(f.minRating))
    if (f.priceMin > 0) params.set('priceMin', String(f.priceMin))
    if (f.priceMax < 999999) params.set('priceMax', String(f.priceMax))
    if (f.brands.size > 0) params.set('brands', Array.from(f.brands).join(','))
    if (sort !== 'popular') params.set('sort', sort)
    const qs = params.toString()
    window.history.replaceState(null, '', `${pathname}${qs ? `?${qs}` : ''}`)
  }, [pathname])

  const filteredProducts = useMemo(() => {
    let items = [...initialProducts]
    if (filters.inStock) items = items.filter(p => p.stock !== 'out_of_stock')
    if (filters.onSale) items = items.filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
    if (filters.minRating > 0) items = items.filter(p => p.rating >= filters.minRating)
    if (filters.brands.size > 0) items = items.filter(p => filters.brands.has(p.sellerName))
    items = items.filter(p => p.price >= filters.priceMin && p.price <= filters.priceMax)
    if (sortBy === 'priceLow') items.sort((a, b) => a.price - b.price)
    if (sortBy === 'priceHigh') items.sort((a, b) => b.price - a.price)
    if (sortBy === 'popular') items.sort((a, b) => b.reviewCount - a.reviewCount)
    return items
  }, [initialProducts, filters, sortBy])

  const activeChipCount = useMemo(() => {
    let count = 0
    if (filters.inStock) count++
    if (filters.onSale) count++
    if (filters.minRating > 0) count++
    if (filters.brands.size > 0) count += filters.brands.size
    if (filters.priceMin > 0 || filters.priceMax < 999999) count++
    return count
  }, [filters])

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (filters.onSale) chips.push({ key: 'onSale', label: t('categories.onSale') })
    if (filters.inStock) chips.push({ key: 'inStock', label: t('categories.inStock') })
    if (filters.minRating > 0) chips.push({ key: 'rating', label: `${filters.minRating}★+` })
    filters.brands.forEach(b => chips.push({ key: `brand-${b}`, label: b }))
    if (filters.priceMin > 0 || filters.priceMax < 999999) {
      chips.push({ key: 'price', label: `${filters.priceMin}–${filters.priceMax}` })
    }
    return chips
  }, [filters, t])

  const removeChip = useCallback((key: string) => {
    setFilters(f => {
      const next = { ...f }
      if (key === 'onSale') next.onSale = false
      else if (key === 'inStock') next.inStock = false
      else if (key === 'rating') next.minRating = 0
      else if (key.startsWith('brand-')) {
        const brand = key.replace('brand-', '')
        const b = new Set(f.brands)
        b.delete(brand)
        next.brands = b
      } else if (key === 'price') {
        next.priceMin = 0
        next.priceMax = 999999
      }
      syncToUrl(next, sortBy)
      return next
    })
  }, [sortBy, syncToUrl])

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    syncToUrl(DEFAULT_FILTERS, sortBy)
  }, [sortBy, syncToUrl])

  const handleApplyFilters = useCallback((f: FilterState) => {
    setFilters(f)
    syncToUrl(f, sortBy)
    setShowFilterPanel(false)
  }, [sortBy, syncToUrl])

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    syncToUrl(DEFAULT_FILTERS, sortBy)
    setShowFilterPanel(false)
  }, [sortBy, syncToUrl])

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav aria-label={t('categories.breadcrumbPath')} className="flex items-center gap-1 text-sm">
        <Link href="/categories" className="text-text-muted hover:text-primary transition-colors">
          {t('categories.allCategories')}
        </Link>
        <BreadcrumbTrail categoryId={categoryId} categories={categories} />
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text">{categoryName || t('categories.allCategories')}</h1>
        <p className="text-xs text-text-muted mt-1" aria-live="polite">
          {t('categories.results', { count: filteredProducts.length })}
        </p>
      </div>

      {/* Sticky filter/sort bar */}
      <div className="sticky top-16 z-20 bg-surface border-b border-border-light py-2 flex items-center gap-2">
        <button
          onClick={() => setShowFilterPanel(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
            activeChipCount > 0 ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text'
          } hover:border-primary/30`}
          aria-haspopup="dialog"
        >
          <span>🔧</span>
          <span>{t('categories.filters')}</span>
          {activeChipCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {activeChipCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-surface text-sm font-medium text-text hover:border-primary/30 transition-colors"
            aria-haspopup="listbox"
            aria-expanded={showSort}
          >
            <span>↕</span>
            <span>{t('categories.sortBy')}: {t(SORT_OPTIONS.find(o => o.key === sortBy)?.labelKey || 'categories.mostPopular')}</span>
          </button>
          {showSort && (
            <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-10 min-w-[180px]">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSortBy(opt.key); setShowSort(false); syncToUrl(filters, opt.key) }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    sortBy === opt.key ? 'bg-primary-50 text-primary font-semibold' : 'text-text hover:bg-background'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => removeChip(chip.key)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <span>{chip.label}</span>
              <span className="text-primary font-semibold">✕</span>
            </button>
          ))}
          <button onClick={clearAll} className="text-xs font-semibold text-text-muted hover:text-text transition-colors ml-1">
            {t('categories.clearAll')}
          </button>
        </div>
      )}

      {/* Quick-filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
        {QUICK_FILTERS.map(f => {
          const active = f.key === 'onSale' ? filters.onSale
            : f.key === 'topRated' ? filters.minRating >= 4
            : f.key === 'freeDelivery' ? false
            : false
          return (
            <button
              key={f.key}
              onClick={() => {
                if (f.key === 'onSale') {
                  const next = { ...filters, onSale: !filters.onSale }
                  setFilters(next)
                  syncToUrl(next, sortBy)
                } else if (f.key === 'topRated') {
                  const next = { ...filters, minRating: filters.minRating >= 4 ? 0 : 4 }
                  setFilters(next)
                  syncToUrl(next, sortBy)
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                active ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text'
              }`}
              aria-pressed={active}
            >
              {t(f.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl">🔍</span>}
          title={t('common.noResults')}
          subtitle={t('emptyState.noItemsSubtitle')}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                delay: reduced ? 0 : Math.min(i, 9) * 0.05,
              }}
            >
              <ProductCard
                product={product}
                onPress={(p) => router.push(`/product/${p.id}`)}
                onAddToCart={(p) => addItem({
                  id: `ci-${p.id}`,
                  productId: p.id,
                  name: p.name,
                  image: p.images?.[0]?.uri ?? '',
                  price: p.price,
                  quantity: 1,
                  maxQuantity: 10,
                })}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter panel */}
      <FilterPanel
        visible={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        products={initialProducts}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </div>
  )
}

function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(href)} className={className}>
      {children}
    </button>
  )
}

function BreadcrumbTrail({ categoryId, categories }: { categoryId: string; categories: Category[] }) {
  const router = useRouter()
  const path: { id: string; name: string }[] = []
  let current = categories.find(c => c.id === categoryId)
  while (current) {
    path.unshift({ id: current.id, name: current.name })
    current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined
  }

  return (
    <>
      {path.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          <span className="text-text-muted">›</span>
          <button
            onClick={() => router.push(`/category/${crumb.id}`)}
            className={`transition-colors ${
              i === path.length - 1
                ? 'text-primary font-semibold'
                : 'text-text-muted hover:text-primary'
            }`}
          >
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </>
  )
}
