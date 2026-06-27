'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
import { useCartStore, useCheckoutStore } from '@chinooz/state'
import { placeOrder, SHIPPING_CONFIG } from '@chinooz/mock-data'
import OrderConfirmation from './OrderConfirmation'
import type { CartItem } from '@chinooz/types'

function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim().split(' ')[0] || 'Other'
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

interface ReviewStepProps {
  onStepChange?: (step: 'address' | 'delivery' | 'payment' | 'review') => void
}

export default function ReviewStep({ onStepChange }: ReviewStepProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const items = useCartStore(s => s.items)
  const clearCart = useCartStore(s => s.clearCart)
  const checkout = useCheckoutStore()
  const reset = useCheckoutStore(s => s.reset)

  const [agreed, setAgreed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['items']))

  const [orderIds, setOrderIds] = useState<string[]>([])
  const [subOrders, setSubOrders] = useState<{ sellerName: string; orderId: string; eta: string; total: number; itemCount: number }[]>([])

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const vat = Math.round(subtotal * SHIPPING_CONFIG.vatRate / (1 + SHIPPING_CONFIG.vatRate))
  const deliveryFee = checkout.deliveryMethod === 'sameDay' ? 250 : checkout.deliveryMethod === 'express' ? 150 : 100
  const grandTotal = subtotal + deliveryFee
  const sellerGroups = groupBySeller(items)

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handlePlaceOrder = useCallback(async () => {
    setPlacing(true)
    setError(null)
    try {
      const result = await placeOrder({
        items: items.map(i => ({ productId: i.productId, variantId: i.variantId, name: i.name, price: i.price, quantity: i.quantity })),
        address: checkout.address!,
        deliveryMethod: checkout.deliveryMethod,
        paymentMethod: checkout.paymentMethod,
      })
      if (result.success) {
        setSuccess(true)
        setOrderIds([result.orderId || `ORD-${Date.now()}`])
        setSubOrders(Array.from(sellerGroups.entries()).map(([seller, sellerItems], i) => ({
          sellerName: seller,
          orderId: `${result.orderId || 'ORD'}-${i + 1}`,
          eta: checkout.deliveryMethod === 'sameDay' ? 'Today' : checkout.deliveryMethod === 'express' ? 'Tomorrow' : '2-4 days',
          total: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          itemCount: sellerItems.length,
        })))
        clearCart()
        reset()
        setTimeout(() => router.push('/'), 2000)
      } else {
        setError(result.error || t('checkout.paymentFailed'))
      }
    } catch {
      setError(t('checkout.paymentFailed'))
    } finally {
      setPlacing(false)
    }
  }, [items, checkout, clearCart, reset, router, t])

  const handleSwitchToCod = useCallback(() => {
    checkout.setPaymentMethod('cod')
    setError(null)
  }, [checkout])

  if (success) {
    return (
      <OrderConfirmation
        orderIds={orderIds}
        subOrders={subOrders}
        total={grandTotal}
        paymentMethod={checkout.paymentMethod}
        deliveryMethod={checkout.deliveryMethod}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text">{t('checkout.reviewOrder')}</h2>

      {/* Items */}
      <SectionAccordion
        title={t('checkout.orderItems')}
        defaultOpen
        isOpen={openSections.has('items')}
        onToggle={() => toggleSection('items')}
      >
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-2 border-b border-border-light last:border-0">
            <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center shrink-0">
              <span>📦</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">{item.name}</p>
              <p className="text-xs text-text-muted">x{item.quantity}</p>
            </div>
            <span className="text-sm font-semibold text-text tabular-nums">{formatNPR(item.price * item.quantity)}</span>
          </div>
        ))}
      </SectionAccordion>

      {/* Address */}
      <SectionAccordion
        title={t('checkout.deliveryAddress')}
        onEdit={() => onStepChange?.('address')}
        isOpen={openSections.has('address')}
        onToggle={() => toggleSection('address')}
      >
        {checkout.address && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text">{checkout.address.fullName}</p>
            <p className="text-xs text-text-muted">{checkout.address.phone}</p>
            <p className="text-xs text-text-muted">
              {checkout.address.street}, {checkout.address.area}, {checkout.address.city}
            </p>
          </div>
        )}
      </SectionAccordion>

      {/* Delivery */}
      <SectionAccordion
        title={t('checkout.deliveryMethod')}
        onEdit={() => onStepChange?.('delivery')}
        isOpen={openSections.has('delivery')}
        onToggle={() => toggleSection('delivery')}
      >
        <p className="text-sm text-text">
          {t(`checkout.${checkout.deliveryMethod}Delivery`)} — {formatNPR(deliveryFee)}
        </p>
      </SectionAccordion>

      {/* Payment */}
      <SectionAccordion
        title={t('checkout.paymentMethod')}
        onEdit={() => onStepChange?.('payment')}
        isOpen={openSections.has('payment')}
        onToggle={() => toggleSection('payment')}
      >
        <p className="text-sm text-text">{t(`checkout.${checkout.paymentMethod}`)}</p>
      </SectionAccordion>

      {/* Price breakdown */}
      <div className="space-y-2 pt-2 border-t border-border-light">
        <SummaryLine label={`${t('cart.subtotal')} (${items.length})`} value={subtotal} />
        <SummaryLine label={t('cart.vatNote')} value={vat} muted />
        <SummaryLine label={t('cart.shipping')} value={deliveryFee} />
        <hr className="border-border-light" />
        <div className="flex justify-between">
          <span className="text-base font-bold text-text">{t('cart.grandTotal')}</span>
          <span className="text-lg font-bold text-text tabular-nums">{formatNPR(grandTotal)}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-light p-3 rounded-xl space-y-2">
          <p className="text-sm font-semibold text-error">{error}</p>
          <div className="flex gap-2">
            <button onClick={handlePlaceOrder} className="px-3 py-1.5 rounded-lg border border-error text-xs font-semibold text-error hover:bg-error/5 transition-colors">
              {t('common.retry')}
            </button>
            {checkout.paymentMethod !== 'cod' && (
              <button onClick={handleSwitchToCod} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors">
                {t('checkout.switchToCod')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terms */}
      <label className="flex items-center gap-2 cursor-pointer">
        <motion.button
          type="button"
          onClick={() => setAgreed(prev => !prev)}
          whileTap={reduced ? {} : { scale: 1.2 }}
          className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
            agreed ? 'border-primary bg-primary' : 'border-border'
          }`}
          aria-label={t('checkout.agreeTerms')}
          role="checkbox"
          aria-checked={agreed}
        >
          {agreed && <span className="text-white text-xs font-bold">✓</span>}
        </motion.button>
        <span className="text-sm text-text-muted">{t('checkout.agreeTerms')}</span>
      </label>

      {/* Place order */}
      <motion.button
        onClick={handlePlaceOrder}
        disabled={!agreed || placing || success}
        whileHover={reduced || !agreed ? {} : { scale: 1.02 }}
        whileTap={reduced || !agreed ? {} : { scale: 0.97 }}
        className="w-full bg-primary text-white h-13 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors flex items-center justify-center"
        aria-label={placing ? t('checkout.placingOrder') : t('checkout.placeOrder')}
        aria-busy={placing}
      >
        {placing ? t('checkout.placingOrder') : t('checkout.placeOrder')}
      </motion.button>
    </div>
  )
}

function SectionAccordion({
  title,
  defaultOpen = false,
  isOpen,
  onToggle,
  onEdit,
  children,
}: {
  title: string
  defaultOpen?: boolean
  isOpen: boolean
  onToggle: () => void
  onEdit?: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="border-t border-border-light">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 hover:bg-background/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-text">{title}</span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('checkout.editSection')} ›
            </button>
          )}
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-text-muted"
          >
            ›
          </motion.span>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SummaryLine({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className={`text-sm ${muted ? 'text-text-muted' : 'text-text'}`}>{label}</span>
      <span className="text-sm text-text tabular-nums">{formatNPR(value)}</span>
    </div>
  )
}
