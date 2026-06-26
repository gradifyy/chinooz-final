'use client'

import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from './hooks/useReducedMotion'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'
import type { ProductCardProps, Product } from '@chinooz/types'

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
  if (stock === 'in_stock') return null
  if (stock === 'low_stock') {
    return <p className="text-xs text-warning font-medium">Only a few left — order soon</p>
  }
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-text-muted text-white text-xs font-semibold px-3 py-1 rounded-full">
      Out of stock
    </div>
  )
}

export default function ProductCard({
  product,
  variant = 'default',
  wishlisted = false,
  onPress,
  onToggleWishlist,
  onAddToCart,
  className = '',
  testID,
}: ProductCardProps) {
  const reduced = useReducedMotion()
  const isCompact = variant === 'compact'
  const isOOS = product.stock === 'out_of_stock'
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price
  const imageUri = product.images?.[0]?.uri

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleWishlist?.(product)
  }, [product, onToggleWishlist])

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart?.(product)
  }, [product, onAddToCart])

  if (isCompact) {
    return (
      <motion.button
        data-testid={testID}
        onClick={() => onPress?.(product)}
        whileHover={reduced ? {} : { scale: 1.02 }}
        whileTap={reduced ? {} : { scale: 0.97 }}
        className={`w-[160px] bg-surface rounded-xl overflow-hidden shadow-sm text-left shrink-0 ${className}`}
        aria-label={product.name}
      >
        <div className="relative w-[160px] h-[160px]">
          <SafeImage
            src={imageUri}
            alt={product.name}
            className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`}
          />
          <StockBadge stock={product.stock} />
        </div>
        <div className="p-2.5 space-y-1">
          <p className="text-[13px] font-medium text-text truncate">{product.name}</p>
          <p className="text-[14px] font-semibold text-text tabular-nums">{formatNPR(product.price)}</p>
        </div>
      </motion.button>
    )
  }

  return (
    <motion.div
      data-testid={testID}
      whileHover={reduced ? {} : { scale: 1.01 }}
      className={`bg-surface rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      <button
        onClick={() => onPress?.(product)}
        className="w-full text-left"
        aria-label={product.name}
      >
        <div className="relative w-full aspect-square">
          <SafeImage
            src={imageUri}
            alt={product.name}
            className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`}
          />
          <StockBadge stock={product.stock} />
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-gold text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              -{Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)}%
            </span>
          )}
          <motion.button
            onClick={handleWishlist}
            whileTap={reduced ? {} : { scale: 1.3 }}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <span className={`text-lg ${wishlisted ? 'text-error' : 'text-text-muted'}`}>
              {wishlisted ? '♥' : '♡'}
            </span>
          </motion.button>
        </div>

        <div className="p-3 space-y-1.5">
          <p className="text-sm text-text leading-5 line-clamp-2 min-h-[40px]">{product.name}</p>

          <div className="flex items-center gap-1">
            <StarRating rating={product.rating} size={12} />
            <span className="text-[11px] text-text-muted">({product.reviewCount})</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-text tabular-nums">{formatNPR(product.price)}</span>
            {hasDiscount && (
              <span className="text-xs text-text-muted line-through">{formatNPR(product.compareAtPrice!)}</span>
            )}
          </div>

          {product.stock === 'low_stock' && <StockBadge stock={product.stock} />}
        </div>
      </button>

      {!isOOS && (
        <div className="px-3 pb-3">
          <motion.button
            onClick={handleAddToCart}
            whileHover={reduced ? {} : { scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            className="w-full bg-primary text-white h-10 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
            aria-label="Add to cart"
          >
            Add to Cart
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

export function ProductCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="w-[160px] bg-surface rounded-xl overflow-hidden shadow-sm shrink-0">
        <Skeleton width={160} height={160} borderRadius={0} />
        <div className="p-2.5 space-y-1.5">
          <Skeleton width="80%" height={12} />
          <Skeleton width="50%" height={14} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl overflow-hidden shadow-sm">
      <Skeleton width="100%" height={0} borderRadius={0} className="aspect-square" />
      <div className="p-3 space-y-2">
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={12} />
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={40} borderRadius={12} />
      </div>
    </div>
  )
}
