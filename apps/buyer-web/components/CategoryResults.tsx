'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion, EmptyState } from '@chinooz/ui-web'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui-web'
import { useInfiniteProducts, usePrefetchProduct } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import type { Product } from '@chinooz/types'

interface CategoryResultsProps {
  categoryId?: string
}

export default function CategoryResults({ categoryId }: CategoryResultsProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteProducts({ categoryId, limit: 12 })

  const allProducts = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page: { items: Product[] }) => page.items)
  }, [data])

  const handlePress = useCallback((product: Product) => {
    prefetchProduct(product.id)
    router.push(`/product/${product.id}`)
  }, [router, prefetchProduct])

  const handleAddToCart = useCallback((product: Product) => {
    addItem({
      id: `ci-${product.id}`,
      productId: product.id,
      name: product.name,
      image: product.images?.[0]?.uri ?? '',
      price: product.price,
      quantity: 1,
      maxQuantity: 10,
    })
  }, [addItem])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <span className="text-4xl">😕</span>
        <p className="text-sm text-text-muted">{t('common.error')}</p>
        <button
          onClick={refetch}
          className="bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (allProducts.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-5xl">🔍</span>}
        title={t('home.noProducts')}
        subtitle={t('emptyState.noItemsSubtitle')}
      />
    )
  }

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            viewMode === 'grid' ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text'
          }`}
          aria-label={t('home.gridView')}
          aria-pressed={viewMode === 'grid'}
        >
          ⊞ {t('home.gridView')}
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            viewMode === 'list' ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text'
          }`}
          aria-label={t('home.listView')}
          aria-pressed={viewMode === 'list'}
        >
          ☰ {t('home.listView')}
        </button>
      </div>

      {/* Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {allProducts.map((product, i) => (
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
                onPress={handlePress}
                onAddToCart={handleAddToCart}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {allProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                delay: reduced ? 0 : Math.min(i, 9) * 0.05,
              }}
            >
              <button
                onClick={() => handlePress(product)}
                className="w-full flex items-center gap-3 bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
                aria-label={`${product.name}, ${formatNPR(product.price)}`}
              >
                <div className="w-20 h-20 bg-shimmer shrink-0 flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="flex-1 min-w-0 p-2 space-y-1">
                  <p className="text-sm text-text line-clamp-2">{product.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gold">★</span>
                    <span className="text-xs text-text-muted">{product.rating}</span>
                    <span className="text-xs text-text-muted">({product.reviewCount})</span>
                  </div>
                  <p className="text-base font-semibold text-text tabular-nums">{formatNPR(product.price)}</p>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center py-6">
          <button
            onClick={handleEndReached}
            disabled={isFetchingNextPage}
            className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {isFetchingNextPage ? t('common.loading') : t('home.loadMore')}
          </button>
        </div>
      )}

      {/* Loading more skeletons */}
      {isFetchingNextPage && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={`sk-${i}`} />
          ))}
        </div>
      )}
    </div>
  )
}
