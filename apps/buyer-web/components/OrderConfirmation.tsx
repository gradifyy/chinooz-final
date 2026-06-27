'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'

function ConfettiParticles({ reduced }: { reduced: boolean }) {
  if (reduced) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => {
        const isPlum = i % 2 === 0
        const left = Math.random() * 100
        const delay = Math.random() * 0.8
        const duration = 1.5 + Math.random() * 0.8
        const size = 6 + Math.random() * 4
        const rotate = Math.random() * 720 - 360

        return (
          <motion.div
            key={i}
            initial={{ y: -20, x: 0, opacity: 1, rotate: 0, scale: 0 }}
            animate={{
              y: 400 + Math.random() * 200,
              x: (Math.random() - 0.5) * 200,
              opacity: 0,
              rotate,
              scale: 1,
            }}
            transition={{
              duration,
              delay,
              ease: 'easeOut',
            }}
            className="absolute"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: isPlum ? '#8A1B57' : '#E0A93B',
            }}
          />
        )
      })}
    </div>
  )
}

function CheckDraw({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', damping: 12, stiffness: 200 }}
      className="w-18 h-18 rounded-full bg-success flex items-center justify-center mb-2"
    >
      <motion.span
        initial={reduced ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={reduced ? { duration: 0 } : { delay: 0.2, type: 'spring', damping: 8, stiffness: 300 }}
        className="text-white text-4xl font-bold"
      >
        ✓
      </motion.span>
    </motion.div>
  )
}

interface SubOrder {
  sellerName: string
  orderId: string
  eta: string
  total: number
  itemCount: number
}

interface OrderConfirmationProps {
  orderIds: string[]
  subOrders?: SubOrder[]
  total: number
  paymentMethod: string
  deliveryMethod: string
}

export default function OrderConfirmation({
  orderIds,
  subOrders = [],
  total,
  paymentMethod,
  deliveryMethod,
}: OrderConfirmationProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  return (
    <>
      <ConfettiParticles reduced={reduced} />

      <div
        className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6"
        role="status"
        aria-live="polite"
        aria-label={t('checkout.orderPlaced')}
      >
        <CheckDraw reduced={reduced} />

        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.3, duration: 0.3 }}
          className="text-2xl font-bold text-text"
        >
          {t('checkout.orderPlaced')}
        </motion.h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.4, duration: 0.3 }}
          className="text-sm text-text-muted"
        >
          {t('checkout.orderConfirmed')}
        </motion.p>

        {/* Sub-orders or single */}
        {subOrders.length > 1 ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.5, duration: 0.3 }}
            className="w-full max-w-sm space-y-2"
          >
            <p className="text-sm font-semibold text-text-secondary">{t('checkout.subOrders')}</p>
            {subOrders.map((so, i) => (
              <motion.div
                key={so.orderId}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.6 + i * 0.1, duration: 0.3 }}
                className="p-3 rounded-xl border border-border-light bg-surface space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text">{so.sellerName}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-light text-success">
                    Confirmed
                  </span>
                </div>
                <p className="text-xs text-text-muted tabular-nums">{t('checkout.orderNumber')}: {so.orderId}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{t('checkout.eta')}: {so.eta}</span>
                  <span className="text-xs font-semibold text-text tabular-nums">{formatNPR(so.total)}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : 0.5 }}
            className="text-sm text-text-muted tabular-nums"
          >
            {t('checkout.orderNumber')}: {orderIds[0]}
          </motion.p>
        )}

        {/* Summary */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.7, duration: 0.3 }}
          className="w-full max-w-sm pt-3 border-t border-border-light flex justify-between"
        >
          <span className="text-sm font-semibold text-text">{t('cart.total')}</span>
          <span className="text-base font-bold text-text tabular-nums">{formatNPR(total)}</span>
        </motion.div>

        {/* Notes */}
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.8, duration: 0.3 }}
          className="space-y-1"
        >
          <p className="text-xs text-text-muted">📄 {t('checkout.digitalReceipt')}</p>
          <p className="text-xs text-text-muted">🧾 {t('checkout.vatInvoice')}</p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.9, duration: 0.3 }}
          className="w-full max-w-sm space-y-2 pt-2"
        >
          <button
            onClick={() => router.push('/orders')}
            className="w-full bg-primary text-white h-12 rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors"
            aria-label={t('orders.trackOrder')}
          >
            {t('orders.trackOrder')}
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full text-sm font-semibold text-primary py-2 hover:underline"
            aria-label={t('checkout.continueShopping')}
          >
            {t('checkout.continueShopping')}
          </button>
        </motion.div>
      </div>
    </>
  )
}
