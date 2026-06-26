'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
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

function DiscountBadge({ price, compare }: { price: number; compare: number }) {
  const reduced = useReducedMotion()
  const pct = Math.round((1 - price / compare) * 100)

  return (
    <motion.span
      animate={reduced ? {} : { scale: [1, 1.05, 1] }}
      transition={reduced ? {} : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-block bg-gold text-white text-xs font-bold px-2 py-0.5 rounded-full"
    >
      -{pct}%
    </motion.span>
  )
}

interface ProductInfoProps {
  product: Product
  displayPrice: number
  displayCompare?: number
  wishlisted?: boolean
  onToggleWishlist?: () => void
  onPressReviews?: () => void
  onPressSeller?: () => void
}

export default function ProductInfo({
  product,
  displayPrice,
  displayCompare,
  wishlisted = false,
  onToggleWishlist,
  onPressReviews,
  onPressSeller,
}: ProductInfoProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const isOOS = product.stock === 'out_of_stock'
  const isLow = product.stock === 'low_stock'
  const hasDiscount = displayCompare && displayCompare > displayPrice

  return (
    <div className="flex flex-col gap-3">
      {/* Title + Wishlist */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[28px] font-bold text-text leading-[34px] md:leading-tight line-clamp-2 md:line-clamp-none flex-1">
          {product.name}
        </h1>
        <motion.button
          onClick={onToggleWishlist}
          whileTap={reduced ? {} : { scale: 1.3 }}
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            wishlisted ? 'bg-error-light' : 'bg-background'
          }`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span className={`text-xl ${wishlisted ? 'text-error' : 'text-text-muted'}`}>
            {wishlisted ? '♥' : '♡'}
          </span>
        </motion.button>
      </div>

      {/* Rating + Stock */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onPressReviews}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          aria-label={`${product.rating} stars, ${product.reviewCount} reviews, tap to see reviews`}
        >
          <StarRating rating={product.rating} size={16} />
          <span className="text-sm text-text-muted font-medium">{product.rating.toFixed(1)}</span>
          <span className="text-sm text-text-muted">({product.reviewCount})</span>
        </button>

        {isOOS && (
          <span className="inline-block bg-error-light text-error text-xs font-semibold px-2.5 py-1 rounded-full">
            {t('product.outOfStock')}
          </span>
        )}
        {isLow && (
          <span className="inline-block bg-warning-light text-[#92400E] text-xs font-semibold px-2.5 py-1 rounded-full">
            {t('product.onlyAFewLeft')}
          </span>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-bold text-text tabular-nums"
          aria-label={`${formatNPR(displayPrice)}${hasDiscount ? `, was ${formatNPR(displayCompare!)}` : ''}`}
        >
          {formatNPR(displayPrice)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-base text-text-muted line-through">{formatNPR(displayCompare!)}</span>
            <DiscountBadge price={displayPrice} compare={displayCompare!} />
          </>
        )}
      </div>

      {/* Seller row */}
      <button
        onClick={onPressSeller}
        className="flex items-center gap-3 py-3 px-3 bg-background rounded-xl hover:bg-border-light transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">{product.sellerName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-text truncate">{product.sellerName}</span>
            <span className="inline-flex items-center gap-0.5 bg-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
              ✓ {t('product.verified')}
            </span>
          </div>
          <span className="text-xs text-text-muted">{t('product.soldBy')} seller</span>
        </div>
        <span className="text-lg text-text-tertiary">›</span>
      </button>
    </div>
  )
}
