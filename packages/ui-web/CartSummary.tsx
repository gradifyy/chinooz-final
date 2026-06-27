'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR, calcCartTotals } from '@chinooz/utils'
import { applyPromoCode, SHIPPING_CONFIG } from '@chinooz/mock-data'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { CartItem } from '@chinooz/types'

interface CartSummaryProps {
  items: CartItem[]
  sellerGroups?: Map<string, CartItem[]>
}

interface PromoState {
  code: string
  discount: number
  type: 'percentage' | 'fixed'
}

export default function CartSummary({ items, sellerGroups }: CartSummaryProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [promoCode, setPromoCode] = useState('')
  const [promo, setPromo] = useState<PromoState | null>(null)
  const [promoError, setPromoError] = useState('')
  const [applying, setApplying] = useState(false)
  const [showSellers, setShowSellers] = useState(false)

  const totals = calcCartTotals(items, promo)
  const { subtotal, vatAmount, discount: discountAmount, deliveryFee, grandTotal, freeShippingProgress, amountToFreeShipping, freeShippingUnlocked } = totals

  const handleApplyPromo = useCallback(async () => {
    if (!promoCode.trim()) return
    setApplying(true)
    setPromoError('')
    try {
      const result = await applyPromoCode(promoCode)
      if (result.success && result.discount && result.type) {
        setPromo({ code: promoCode.toUpperCase(), discount: result.discount, type: result.type })
        setPromoError('')
      } else {
        setPromoError(result.error || t('cart.invalidCode'))
      }
    } catch {} finally {
      setApplying(false)
    }
  }, [promoCode, t])

  const handleRemovePromo = useCallback(() => {
    setPromo(null)
    setPromoCode('')
  }, [])

  return (
    <div className="space-y-4">
      {/* Promo code */}
      <div className="flex gap-2">
        <motion.input
          type="text"
          value={promoCode}
          onChange={e => { setPromoCode(e.target.value); setPromoError('') }}
          placeholder={t('cart.promoCode')}
          disabled={!!promo}
          className="flex-1 h-11 bg-surface rounded-xl border-[1.5px] border-border px-3 text-sm text-text outline-none focus:border-primary transition-colors disabled:opacity-60"
          aria-label={t('cart.promoCode')}
        />
        {promo ? (
          <button
            onClick={handleRemovePromo}
            className="px-3 text-sm font-semibold text-error hover:underline"
          >
            {t('cart.removeCode')}
          </button>
        ) : (
          <button
            onClick={handleApplyPromo}
            disabled={!promoCode.trim() || applying}
            className="bg-primary text-white px-4 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-primary-dark transition-colors"
          >
            {applying ? '...' : t('cart.applyCode')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {promoError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-error font-medium"
          >
            {promoError}
          </motion.p>
        )}
      </AnimatePresence>

      {promo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 py-2 px-3 bg-success-light rounded-xl"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 400 }}
            className="text-sm text-success font-bold"
          >
            ✓
          </motion.span>
          <span className="text-sm text-success font-semibold">
            {t('cart.codeApplied')} — {promo.type === 'percentage' ? `${promo.discount}% off` : formatNPR(promo.discount)}
          </span>
        </motion.div>
      )}

      {/* Free shipping progress */}
      <div className="space-y-2 py-3 border-t border-border-light">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text">{t('cart.freeDelivery')}</span>
          {freeShippingUnlocked && (
            <span className="text-xs font-semibold text-gold">🎉 {t('cart.freeDeliveryUnlocked')}</span>
          )}
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${freeShippingProgress * 100}%` }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 200 }}
            className={`h-full rounded-full ${freeShippingUnlocked ? 'bg-gold' : 'bg-primary'}`}
          />
        </div>
        {!freeShippingUnlocked && (
          <p className="text-xs text-text-muted">
            {t('cart.addMoreForFree', { amount: formatNPR(amountToFreeShipping) })}
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <SummaryLine label={`${t('cart.subtotal')} (${items.length})`} value={subtotal} />
        <SummaryLine label={t('cart.vatNote')} value={vatAmount} muted />
        <SummaryLine
          label={t('cart.shipping')}
          value={deliveryFee}
          valueColor={deliveryFee === 0 ? 'text-success' : undefined}
          valueText={deliveryFee === 0 ? t('cart.freeShipping') : undefined}
        />
        {discountAmount > 0 && (
          <SummaryLine label={t('cart.discount')} value={-discountAmount} valueColor="text-success" />
        )}

        {/* Seller subtotals accordion */}
        {sellerGroups && sellerGroups.size > 1 && (
          <button
            onClick={() => setShowSellers(prev => !prev)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {showSellers ? 'Hide' : 'Show'} seller breakdown
          </button>
        )}
        {showSellers && sellerGroups && (
          <div className="pl-3 space-y-1">
            {Array.from(sellerGroups.entries()).map(([seller, sellerItems]) => {
              const sellerSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
              return (
                <SummaryLine
                  key={seller}
                  label={t('cart.sellerSubtotal', { seller })}
                  value={sellerSubtotal}
                  muted
                />
              )
            })}
          </div>
        )}

        <hr className="border-border-light my-2" />

        <motion.div
          key={grandTotal}
          initial={reduced ? false : { scale: 1.03 }}
          animate={{ scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="flex items-center justify-between"
        >
          <span className="text-base font-bold text-text">{t('cart.grandTotal')}</span>
          <span className="text-lg font-bold text-text tabular-nums">{formatNPR(grandTotal)}</span>
        </motion.div>
      </div>
    </div>
  )
}

function SummaryLine({
  label,
  value,
  muted,
  valueColor,
  valueText,
}: {
  label: string
  value: number
  muted?: boolean
  valueColor?: string
  valueText?: string
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? 'text-text-muted' : 'text-text'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${valueColor || 'text-text'}`}>
        {valueText || formatNPR(Math.abs(value))}
      </span>
    </div>
  )
}
