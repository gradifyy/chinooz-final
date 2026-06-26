'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion, ProductCard } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import { useReviews, useProducts, usePrefetchProduct } from '@chinooz/hooks'
import ImageGallery from '@/components/ImageGallery'
import type { Product } from '@chinooz/types'

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: size }} className={i < Math.round(rating) ? 'text-gold' : 'text-border'}>
          ★
        </span>
      ))}
    </div>
  )
}

function StockBadge({ stock }: { stock: string }) {
  const { t } = useTranslation()
  if (stock === 'in_stock') return null
  if (stock === 'low_stock') {
    return <span className="inline-block bg-warning-light text-[#92400E] text-xs font-semibold px-2.5 py-1 rounded-full">{t('product.onlyAFewLeft')}</span>
  }
  return <span className="inline-block bg-error-light text-error text-xs font-semibold px-2.5 py-1 rounded-full">{t('product.outOfStock')}</span>
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)
  const prefetchProduct = usePrefetchProduct()

  const { data: reviews } = useReviews(product.id)
  const { data: related } = useProducts({ limit: 6 })

  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.id || '')
  const [imageIndex, setImageIndex] = useState(0)

  const activeVariant = product.variants.find(v => v.id === selectedVariant)
  const displayPrice = activeVariant?.price ?? product.price
  const displayCompare = activeVariant?.compareAtPrice ?? product.compareAtPrice
  const isOOS = product.stock === 'out_of_stock'

  const handleAddToCart = useCallback(() => {
    addItem({
      id: `ci-${product.id}-${selectedVariant || 'default'}`,
      productId: product.id,
      variantId: selectedVariant || undefined,
      name: activeVariant ? `${product.name} — ${activeVariant.name}` : product.name,
      image: product.images?.[0]?.uri ?? '',
      price: displayPrice,
      quantity: 1,
      maxQuantity: 10,
    })
  }, [product, selectedVariant, activeVariant, displayPrice, addItem])

  const handleBuyNow = useCallback(() => {
    handleAddToCart()
    router.push('/cart')
  }, [handleAddToCart, router])

  return (
    <div className="flex flex-col gap-8">
      {/* Two-column layout: gallery + info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery (sticky on md+) */}
        <div className="md:sticky md:top-24 md:self-start relative">
          <ImageGallery images={product.images} onIndexChange={setImageIndex} />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-bold text-text">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={product.rating} size={16} />
              <span className="text-sm text-text-muted">({product.reviewCount})</span>
              <StockBadge stock={product.stock} />
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold text-text tabular-nums"
              aria-label={`${formatNPR(displayPrice)}, add to cart`}
            >
              {formatNPR(displayPrice)}
            </span>
            {displayCompare && displayCompare > displayPrice && (
              <>
                <span className="text-base text-text-muted line-through">{formatNPR(displayCompare)}</span>
                <span className="text-sm font-semibold text-success">
                  {Math.round((1 - displayPrice / displayCompare) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Seller */}
          <p className="text-sm text-text-muted">
            {t('product.soldBy')} <span className="font-semibold text-text">{product.sellerName}</span>
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {product.tags.map(tag => (
              <span key={tag} className="inline-block bg-primary-50 text-primary text-[11px] font-semibold px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-text">{t('product.selectVariant')}</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => {
                  const active = v.id === selectedVariant
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? 'border-primary bg-primary-50 text-primary font-semibold'
                          : 'border-border bg-surface text-text hover:border-primary/30'
                      }`}
                    >
                      {v.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text">{t('product.description')}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{product.description}</p>
          </div>

          {/* Desktop inline actions */}
          <div className="hidden md:flex gap-3 sticky top-24">
            <motion.button
              onClick={handleAddToCart}
              disabled={isOOS}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="flex-1 bg-primary text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 hover:bg-primary-dark transition-colors"
              aria-label={t('product.addToCart')}
            >
              {t('product.addToCart')}
            </motion.button>
            <motion.button
              onClick={handleBuyNow}
              disabled={isOOS}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="flex-1 bg-gold text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 hover:opacity-90 transition-opacity"
              aria-label={t('product.buyNow')}
            >
              {t('product.buyNow')}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Reviews — full width */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text">
          {t('product.reviews')} ({product.reviewCount})
        </h2>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.slice(0, 5).map(review => (
              <div key={review.id} className="flex flex-col gap-2 py-3 border-b border-border-light">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {review.userName.split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{review.userName}</p>
                    <StarRating rating={review.rating} size={10} />
                  </div>
                </div>
                {review.title && <p className="text-sm font-semibold text-text">{review.title}</p>}
                <p className="text-sm text-text-secondary leading-relaxed">{review.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 gap-2">
            <span className="text-4xl">💬</span>
            <p className="text-base font-semibold text-text">{t('product.noReviews')}</p>
            <p className="text-sm text-text-muted">{t('product.noReviewsSubtitle')}</p>
          </div>
        )}
      </div>

      {/* Related Products — full width */}
      {related && related.items.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">{t('product.relatedProducts')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {related.items.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                variant="compact"
                onPress={(prod) => router.push(`/product/${prod.id}`)}
                onLongPress={(prod) => prefetchProduct(prod.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 pt-3 pb-[env(safe-area-inset-bottom)] flex items-center gap-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-40">
        <div className="flex-1">
          <p className="text-[11px] text-text-muted">{t('product.addToCart')}</p>
          <p className="text-xl font-bold text-text tabular-nums" aria-label={`${formatNPR(displayPrice)}, add to cart`}>
            {formatNPR(displayPrice)}
          </p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOOS}
          className="bg-primary text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-primary-dark transition-colors"
          aria-label={t('product.addToCart')}
        >
          {t('product.addToCart')}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={isOOS}
          className="bg-gold text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
          aria-label={t('product.buyNow')}
        >
          {t('product.buyNow')}
        </button>
      </div>
    </div>
  )
}
