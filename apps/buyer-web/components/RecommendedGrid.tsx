'use client'

import React, { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useInfiniteProducts } from '@chinooz/hooks'
import { useCartStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui-web'
import type { Product } from '@chinooz/types'

export default function RecommendedGrid() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteProducts({ limit: 10 })

  const allProducts = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page: { items: Product[] }) => page.items)
  }, [data])

  const handlePress = useCallback((product: Product) => {
    router.push(`/product/${product.id}`)
  }, [router])

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
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div>
        <h2 className="text-[22px] font-semibold text-text mb-3">{t('home.recommended')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-base text-error">{t('common.error')}</p>
        <button
          onClick={() => refetch()}
          className="bg-primary text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (!allProducts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-base text-text-muted">{t('home.noProducts')}</p>
      </div>
    )
  }

  return (
    <div>
      <motion.h2
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.3 }}
        className="text-[22px] font-semibold text-text mb-3"
      >
        {t('home.recommended')}
      </motion.h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <AnimatePresence>
          {allProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
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
        </AnimatePresence>
      </div>

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

      {isFetchingNextPage && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={`sk-${i}`} />
          ))}
        </div>
      )}
    </div>
  )
}
