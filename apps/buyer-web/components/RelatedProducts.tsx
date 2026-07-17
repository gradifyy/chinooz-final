'use client'

import { MAX_QTY } from '@chinooz/utils'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion, ProductCard } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import { useSimilarProducts, useRecommendedProducts, usePrefetchProduct } from '@chinooz/hooks'
import type { Product } from '@chinooz/types'

function RailSection({
  titleKey,
  seeAllHref,
  products,
  isLoading,
}: {
  titleKey: string
  seeAllHref: string
  products: Product[] | undefined
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const handlePress = useCallback(
    (product: Product) => {
      prefetchProduct(product.id)
      router.push(`/product/${product.id}`)
    },
    [router, prefetchProduct],
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

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-36 h-5 bg-border rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px]">
              <div className="bg-surface rounded-xl overflow-hidden shadow-sm">
                <div className="h-[160px] bg-border animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="w-3/4 h-3 bg-border rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-border rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
              delay: reduced ? 0 : Math.min(i, 9) * 0.04,
            }}
            className="shrink-0 w-[160px] snap-start"
          >
            <ProductCard
              product={product}
              variant="compact"
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onLongPress={p => prefetchProduct(p.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

interface RelatedProductsProps {
  categoryId: string
  productId: string
}

export default function RelatedProducts({ categoryId, productId }: RelatedProductsProps) {
  const similar = useSimilarProducts(categoryId, productId)
  const recommended = useRecommendedProducts()

  return (
    <div className="space-y-8">
      <RailSection
        titleKey="product.similarItems"
        seeAllHref={`/search?category=${categoryId}`}
        products={similar.data}
        isLoading={similar.isLoading}
      />

      <RailSection
        titleKey="product.youMayAlsoLike"
        seeAllHref="/search?sort=recommended"
        products={recommended.data}
        isLoading={recommended.isLoading}
      />
    </div>
  )
}
