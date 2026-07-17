'use client'

import { MAX_QTY } from '@chinooz/utils'

import React, { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion, ProductCard } from '@chinooz/ui-web'
import { useCartStore, useRecentlyViewedStore } from '@chinooz/state'
import { useProductsByIds, usePrefetchProduct } from '@chinooz/hooks'
import type { Product } from '@chinooz/types'

/**
 * Recently-viewed rail for the web home. Reads the (previously mobile-only)
 * `recentlyViewed` store, hydrates product details by id, and surfaces them in
 * a horizontal rail — closing the web/mobile personalization parity gap.
 */
export default function RecentlyViewedRail() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()
  const entries = useRecentlyViewedStore(s => s.entries)

  const ids = useMemo(() => entries.map(e => e.productId), [entries])
  const { data: products } = useProductsByIds(ids)

  // Preserve the recency order from the store (useProductsByIds returns catalog order).
  const ordered = useMemo(() => {
    if (!products) return []
    const byId = new Map(products.map(p => [p.id, p]))
    return ids.map(id => byId.get(id)).filter((p): p is Product => !!p)
  }, [products, ids])

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

  if (ordered.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-text">{t('home.recentlyViewed')}</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
        {ordered.map((product, i) => (
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
