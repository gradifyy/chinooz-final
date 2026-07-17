'use client'

import { MAX_QTY } from '@chinooz/utils'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Container,
  Screen,
  ProductCard,
  ProductGrid,
  EmptyState,
  useReducedMotion,
} from '@chinooz/ui-web'
import { useCartStore, useWishlistStore } from '@chinooz/state'
import { useSellerStorefront, usePrefetchProduct } from '@chinooz/hooks'
import OfflineBanner from '@/components/OfflineBanner'
import type { Product } from '@chinooz/types'

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{ fontSize: size }}
          className={i < Math.round(rating) ? 'text-gold' : 'text-border'}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function SellerStorefrontClient({ sellerId }: { sellerId: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data, isLoading, isError } = useSellerStorefront(sellerId)
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()
  const wishlistHas = useWishlistStore(s => s.has)
  const wishlistToggle = useWishlistStore(s => s.toggle)

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
      <Screen>
        <Container className="py-6">
          <div className="h-28 rounded-2xl bg-border animate-pulse mb-6" />
          <ProductGrid count={8} />
        </Container>
      </Screen>
    )
  }

  if (isError || !data) {
    return (
      <Screen>
        <Container className="py-10">
          <EmptyState
            icon={<span className="text-5xl">🏪</span>}
            title={t('seller.notFound')}
            subtitle={t('seller.notFoundSubtitle')}
            action={{ label: t('product.backToHome'), onPress: () => router.push('/') }}
          />
        </Container>
      </Screen>
    )
  }

  const { seller, products } = data

  return (
    <Screen>
      <OfflineBanner />
      <Container className="py-6">
        {/* Seller header */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border mb-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">{seller.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-text truncate">{seller.name}</h1>
              <span className="inline-flex items-center gap-0.5 bg-success-light text-success text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0">
                ✓ {t('product.verified')}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <StarRating rating={seller.rating} size={14} />
                <span className="text-sm text-text-muted font-medium">
                  {seller.rating.toFixed(1)}
                </span>
              </span>
              <span className="text-sm text-text-muted">·</span>
              <span className="text-sm text-text-muted">
                {t('seller.productCount', { count: seller.productCount })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Products */}
        <h2 className="text-lg font-semibold text-text mb-3">{t('seller.allProducts')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              wishlisted={wishlistHas(product.id)}
              onPress={handlePress}
              onAddToCart={handleAddToCart}
              onToggleWishlist={p => wishlistToggle(p.id)}
              onLongPress={p => prefetchProduct(p.id)}
            />
          ))}
        </div>
      </Container>
    </Screen>
  )
}
