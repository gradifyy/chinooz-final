'use client'

import { MAX_QTY } from '@chinooz/utils'

import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@chinooz/state'
import { usePrefetchProduct } from '@chinooz/hooks'
import { useReducedMotion } from '@chinooz/ui-web'
import { ProductCard, ProductCardSkeleton } from '@chinooz/ui-web'
import type { Product } from '@chinooz/types'

interface ProductRailProps {
  titleKey: string
  seeAllHref: string
  products: Product[] | undefined
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

export default function ProductRail({
  titleKey,
  seeAllHref,
  products,
  isLoading,
  isError,
  onRetry,
}: ProductRailProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const handlePress = useCallback(
    (product: Product) => {
      router.push(`/product/${product.id}`)
    },
    [router],
  )

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem({
        id: `ci-${product.id}`,
        productId: product.id,
        name: product.name,
        image: product.images?.[0]?.uri ?? '',
        price: product.price,
        quantity: 1,
        maxQuantity: MAX_QTY,
      })
    },
    [addItem],
  )

  const handleHover = useCallback(
    (product: Product) => {
      prefetchProduct(product.id)
    },
    [prefetchProduct],
  )

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-32 h-5 bg-border rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] snap-start">
              <ProductCardSkeleton variant="compact" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <p className="text-sm text-error">{t('common.error')}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-primary text-white px-4 py-1.5 rounded-xl font-semibold text-xs hover:bg-primary-dark transition-colors"
          >
            {t('common.retry')}
          </button>
        )}
      </div>
    )
  }

  if (!products || products.length === 0) return null

  return (
    <div>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.3 }}
        className="flex items-center justify-between mb-3"
      >
        <h3 className="text-lg font-semibold text-text">{t(titleKey)}</h3>
        <motion.button
          onClick={() => router.push(seeAllHref)}
          whileHover={reduced ? {} : { x: 2 }}
          whileTap={reduced ? {} : { scale: 0.97 }}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary"
        >
          {t('common.seeAll')}
          <span className="text-base">›</span>
        </motion.button>
      </motion.div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={reduced ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduced ? 0 : 0.25,
              delay: reduced ? 0 : Math.min(i, 7) * 0.04,
            }}
            className="shrink-0 w-[160px] snap-start"
          >
            <ProductCard
              product={product}
              variant="compact"
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onLongPress={handleHover}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
