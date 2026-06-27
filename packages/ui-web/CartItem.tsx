'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from './hooks/useReducedMotion'
import SafeImage from './SafeImage'
import QuantityStepper from './QuantityStepper'
import type { CartItem as CartItemType, StockStatus } from '@chinooz/types'

interface CartItemProps {
  item: CartItemType
  selected?: boolean
  stock?: StockStatus
  originalPrice?: number
  onQuantityChange?: (id: string, quantity: number) => void
  onRemove?: (id: string) => void
  onSaveForLater?: (id: string) => void
  onSelect?: (id: string) => void
  className?: string
}

export default function CartItem({
  item,
  selected = true,
  stock = 'in_stock',
  originalPrice,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  onSelect,
  className = '',
}: CartItemProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const lineTotal = item.price * item.quantity
  const isOOS = stock === 'out_of_stock'
  const isLow = stock === 'low_stock'
  const priceChanged = originalPrice && originalPrice !== item.price

  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, x: -40 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      className={`flex items-start gap-3 p-3 bg-surface rounded-xl shadow-sm ${className}`}
      aria-label={`${item.name}, ${formatNPR(lineTotal)}`}
    >
      {/* Checkbox */}
      {onSelect && (
        <button
          onClick={() => onSelect(item.id)}
          className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            selected
              ? 'border-primary bg-primary'
              : 'border-border bg-transparent'
          }`}
          aria-label={`Select item: ${item.name}`}
        >
          {selected && <span className="text-white text-xs font-bold">✓</span>}
        </button>
      )}

      {/* Image */}
      <div className="w-16 h-16 rounded-xl bg-shimmer overflow-hidden shrink-0">
        <SafeImage
          src={item.image}
          alt={item.name}
          className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-text truncate">{item.name}</p>
        {item.variantId && (
          <p className="text-xs font-medium text-text-muted">Variant selected</p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-text tabular-nums">{formatNPR(item.price)}</span>
          {priceChanged && (
            <span className="text-xs text-text-muted line-through">{formatNPR(originalPrice!)}</span>
          )}
        </div>

        {/* Warnings */}
        {isLow && (
          <p className="text-xs text-warning font-medium" role="alert">{t('cart.onlyAFew')}</p>
        )}
        {isOOS && (
          <p className="text-xs text-error font-semibold" role="alert">{t('product.outOfStock')}</p>
        )}
        {priceChanged && (
          <p className="text-xs text-warning font-medium" role="alert">
            {t('cart.priceChanged', { oldPrice: formatNPR(originalPrice!), newPrice: formatNPR(item.price) })}
          </p>
        )}

        {/* Quantity + Line total */}
        <div className="flex items-center justify-between mt-1">
          <QuantityStepper
            value={item.quantity}
            min={1}
            max={item.maxQuantity}
            onChange={(qty) => onQuantityChange?.(item.id, qty)}
            disabled={isOOS}
          />
          <span className="text-base font-semibold text-text tabular-nums">{formatNPR(lineTotal)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1">
          {onSaveForLater && (
            <button
              onClick={() => onSaveForLater(item.id)}
              className="text-xs text-primary font-medium hover:underline"
              aria-label={t('cart.saveForLater')}
            >
              {t('cart.saveForLater')}
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="text-xs text-error font-medium hover:underline"
              aria-label={t('cart.remove')}
            >
              {t('cart.remove')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
