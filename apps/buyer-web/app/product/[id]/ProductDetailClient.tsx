'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion, ProductCard, QuantityStepper } from '@chinooz/ui-web'
import { useCartStore } from '@chinooz/state'
import { useReviews, useProducts, usePrefetchProduct } from '@chinooz/hooks'
import ImageGallery from '@/components/ImageGallery'
import ProductInfo from '@/components/ProductInfo'
import VariantSelector from '@/components/VariantSelector'
import Accordion from '@/components/Accordion'
import DescriptionSection from '@/components/DescriptionSection'
import SpecsTable from '@/components/SpecsTable'
import DeliverySection from '@/components/DeliverySection'
import Snackbar from '@/components/Snackbar'
import type { Product } from '@chinooz/types'

const MAX_QTY = 10

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

export default function ProductDetailClient({ product }: { product: Product }) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const addItem = useCartStore(s => s.addItem)
  const removeItem = useCartStore(s => s.removeItem)
  const prefetchProduct = usePrefetchProduct()

  const { data: reviews } = useReviews(product.id)
  const { data: related } = useProducts({ limit: 6 })

  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.id || '')
  const [imageIndex, setImageIndex] = useState(0)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [snackVisible, setSnackVisible] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  const activeVariant = product.variants.find(v => v.id === selectedVariant)
  const displayPrice = activeVariant?.price ?? product.price
  const displayCompare = activeVariant?.compareAtPrice ?? product.compareAtPrice
  const stockStatus = activeVariant?.stock ?? product.stock
  const isOOS = stockStatus === 'out_of_stock'
  const needsVariant = product.variants.length > 0 && !selectedVariant
  const maxQty = Math.min(MAX_QTY, 10)

  const handleAddToCart = useCallback(() => {
    if (needsVariant) {
      setPromptError(t('product.selectFirst', { variant: Object.keys(product.variants[0]?.attributes || {})[0] || 'option' }))
      return
    }
    setPromptError(null)
    const itemId = `ci-${product.id}-${selectedVariant || 'default'}`
    setLastAddedId(itemId)
    addItem({
      id: itemId,
      productId: product.id,
      variantId: selectedVariant || undefined,
      name: activeVariant ? `${product.name} — ${activeVariant.name}` : product.name,
      image: product.images?.[0]?.uri ?? '',
      price: displayPrice,
      quantity,
      maxQuantity: maxQty,
    })
    setSnackVisible(true)
    setQuantity(1)
  }, [product, selectedVariant, activeVariant, displayPrice, quantity, addItem, needsVariant, t, maxQty])

  const handleBuyNow = useCallback(() => {
    if (needsVariant) {
      setPromptError(t('product.selectFirst', { variant: Object.keys(product.variants[0]?.attributes || {})[0] || 'option' }))
      return
    }
    setPromptError(null)
    const itemId = `ci-${product.id}-${selectedVariant || 'default'}`
    addItem({
      id: itemId,
      productId: product.id,
      variantId: selectedVariant || undefined,
      name: activeVariant ? `${product.name} — ${activeVariant.name}` : product.name,
      image: product.images?.[0]?.uri ?? '',
      price: displayPrice,
      quantity,
      maxQuantity: maxQty,
    })
    router.push('/cart')
  }, [product, selectedVariant, activeVariant, displayPrice, quantity, addItem, needsVariant, t, maxQty, router])

  const handleUndo = useCallback(() => {
    if (lastAddedId) {
      removeItem(lastAddedId)
      setLastAddedId(null)
    }
    setSnackVisible(false)
  }, [lastAddedId, removeItem])

  return (
    <div className="flex flex-col gap-8">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div className="md:sticky md:top-24 md:self-start relative">
          <ImageGallery images={product.images} onIndexChange={setImageIndex} />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <ProductInfo
            product={product}
            displayPrice={displayPrice}
            displayCompare={displayCompare}
            onPressReviews={() => {}}
            onPressSeller={() => {}}
          />

          {/* Variants */}
          {product.variants.length > 0 && (
            <VariantSelector
              variants={product.variants}
              selectedId={selectedVariant}
              onSelect={(id) => { setSelectedVariant(id); setPromptError(null) }}
              promptError={promptError}
            />
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Qty</p>
              <QuantityStepper
                value={quantity}
                min={1}
                max={maxQty}
                onChange={setQuantity}
                disabled={isOOS}
              />
            </div>
            {quantity >= maxQty && (
              <p className="text-xs font-medium text-text-muted">{t('product.maxReached')}</p>
            )}
          </div>

          {/* Description */}
          <Accordion title={t('product.description')} defaultOpen>
            <DescriptionSection description={product.description} />
          </Accordion>

          {/* Specifications */}
          <Accordion title={t('product.specifications')}>
            <SpecsTable product={product} />
          </Accordion>

          {/* Delivery & Returns */}
          <Accordion title={t('product.delivery')}>
            <DeliverySection sellerName={product.sellerName} stock={product.stock} />
          </Accordion>

          {/* Desktop inline actions */}
          <div className="hidden md:flex gap-3 sticky top-24">
            <motion.button
              onClick={handleAddToCart}
              disabled={isOOS}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="flex-1 bg-primary text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 hover:bg-primary-dark transition-colors"
              aria-label={`${t('product.addToCart')}, ${formatNPR(displayPrice * quantity)}`}
            >
              {t('product.addToCart')} · {formatNPR(displayPrice * quantity)}
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 pt-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-40">
        {/* Quantity + Price */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] text-text-muted">{t('product.addToCart')}</p>
            <p className="text-xl font-bold text-text tabular-nums" aria-label={`${formatNPR(displayPrice * quantity)}, add to cart`}>
              {formatNPR(displayPrice * quantity)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <QuantityStepper
              value={quantity}
              min={1}
              max={maxQty}
              onChange={setQuantity}
              disabled={isOOS}
            />
            {quantity >= maxQty && (
              <p className="text-[12px] font-medium text-text-muted">{t('product.maxReached')}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <motion.button
            onClick={handleAddToCart}
            disabled={isOOS}
            whileHover={reduced ? {} : { scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-primary-dark transition-colors"
            aria-label={t('product.addToCart')}
          >
            {t('product.addToCart')}
          </motion.button>
          <motion.button
            onClick={handleBuyNow}
            disabled={isOOS}
            whileHover={reduced ? {} : { scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            className="flex-1 bg-gold text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            aria-label={t('product.buyNow')}
          >
            {t('product.buyNow')}
          </motion.button>
        </div>
      </div>

      {/* Snackbar */}
      <Snackbar
        visible={snackVisible}
        message={t('product.addedToCart')}
        actionLabel={t('product.undo')}
        onAction={handleUndo}
        onDismiss={() => setSnackVisible(false)}
      />
    </div>
  )
}
