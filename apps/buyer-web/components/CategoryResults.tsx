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
  onClearFilters?: () => void
}

export default function CategoryResults({ categoryId, onClearFilters }: CategoryResultsProps) {
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

  // Loading state
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        aria-busy="true"
        aria-label={t('home.loadingProducts')}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-12 gap-3"
      >
        <span className="text-5xl">😕</span>
        <p className="text-base font-semibold text-text">{t('home.somethingWentWrong')}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-md border-[1.5px] border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          aria-label={t('common.retry')}
        >
          {t('common.retry')}
        </button>
      </motion.div>
    )
  }

  // Empty — no products in category
  if (allProducts.length === 0 && !onClearFilters) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.6, type: 'spring', damping: 18, stiffness: 120 }}
        className="flex flex-col items-center py-12 gap-3"
      >
        <span className="text-6xl">📭</span>
        <p className="text-base font-semibold text-text">{t('home.noProductsInCategory')}</p>
        <p className="text-sm text-text-muted text-center max-w-sm">
          {t('home.noProductsInCategorySubtitle')}
        </p>
        <button
          onClick={() => router.push('/categories')}
          className="mt-2 px-4 py-2 rounded-md border-[1.5px] border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          {t('home.backToCategories')}
        </button>
      </motion.div>
    )
  }

  // No results — filters too narrow
  if (allProducts.length === 0 && onClearFilters) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.6, type: 'spring', damping: 18, stiffness: 120 }}
        className="flex flex-col items-center py-12 gap-3"
      >
        <span className="text-6xl">🔍</span>
        <p className="text-base font-semibold text-text">{t('home.noProducts')}</p>
        <p className="text-sm text-text-muted text-center max-w-sm">
          {t('home.noProductsSubtitle')}
        </p>
        <button
          onClick={onClearFilters}
          className="mt-2 px-4 py-2 rounded-md border-[1.5px] border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          aria-label={t('home.clearFilters')}
        >
          {t('home.clearFilters')}
        </button>
      </motion.div>
    )
  }

  return (
    <div>
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
