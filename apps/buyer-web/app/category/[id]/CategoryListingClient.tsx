'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion, EmptyState } from '@chinooz/ui-web'
import { ProductCard } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
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
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('popular')
  const [showSort, setShowSort] = useState(false)

  const breadcrumb = useMemo(() => {
    const path: { id: string; name: string }[] = []
    let current = categories.find(c => c.id === categoryId)
    while (current) {
      path.unshift({ id: current.id, name: current.name })
      current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined
    }
    return path
  }, [categories, categoryId])

  const filteredProducts = useMemo(() => {
    let items = [...initialProducts]
    if (activeFilters.has('onSale')) items = items.filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
    if (activeFilters.has('topRated')) items = items.filter(p => p.rating >= 4)
    if (sortBy === 'priceLow') items.sort((a, b) => a.price - b.price)
    if (sortBy === 'priceHigh') items.sort((a, b) => b.price - a.price)
    if (sortBy === 'popular') items.sort((a, b) => b.reviewCount - a.reviewCount)
    return items
  }, [initialProducts, activeFilters, sortBy])

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav aria-label={t('categories.breadcrumbPath')} className="flex items-center gap-1 text-sm">
        <Link href="/categories" className="text-text-muted hover:text-primary transition-colors">
          {t('categories.allCategories')}
        </Link>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={crumb.id}>
            <span className="text-text-muted">›</span>
            <Link
              href={`/category/${crumb.id}`}
              className={`transition-colors ${
                i === breadcrumb.length - 1
                  ? 'text-primary font-semibold'
                  : 'text-text-muted hover:text-primary'
              }`}
            >
              {crumb.name}
            </Link>
          </React.Fragment>
        ))}
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
        {/* Filter button */}
        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-surface text-sm font-medium text-text hover:border-primary/30 transition-colors">
          <span>🔧</span>
          <span>{t('categories.filters')}</span>
          {activeFilters.size > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {activeFilters.size}
            </span>
          )}
        </button>

        {/* Sort dropdown */}
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
                  onClick={() => { setSortBy(opt.key); setShowSort(false) }}
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

      {/* Quick-filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
        {QUICK_FILTERS.map(f => {
          const active = activeFilters.has(f.key)
          return (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                active
                  ? 'bg-primary border-primary text-white'
                  : 'bg-surface border-border text-text'
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
