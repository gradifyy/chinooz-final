'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import { motion } from 'framer-motion'
import { useReorder, useOrderInvoice } from '@chinooz/hooks'
import { useCartStore, useUIStore } from '@chinooz/state'
import Snackbar from './Snackbar'
import type { Order } from '@chinooz/types'

const CancelOrderModal = dynamic(() => import('./CancelOrderModal'), { ssr: false }) as React.ComponentType<{ visible: boolean; orderId: string; onClose: () => void; onSuccess: () => void }>
const ReturnRequestModal = dynamic(() => import('./ReturnRequestModal'), { ssr: false }) as React.ComponentType<{ visible: boolean; orderId: string; items: any[]; onClose: () => void; onSuccess: () => void }>
const InvoiceView = dynamic(() => import('./InvoiceView'), { ssr: false }) as React.ComponentType<{ visible: boolean; invoice: any; onClose: () => void }>

interface OrderActionsProps {
  order: Order
  onScrollToTimeline?: () => void
}

const CAN_CANCEL: Order['status'][] = ['pending', 'confirmed', 'processing']
const CAN_RETURN: Order['status'][] = ['delivered']
const CAN_TRACK: Order['status'][] = ['shipped', 'processing']
const CAN_RATE: Order['status'][] = ['delivered']
const CAN_BUY_AGAIN: Order['status'][] = ['delivered', 'cancelled', 'returned']

export default function OrderActions({ order, onScrollToTimeline }: OrderActionsProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const reorder = useReorder()
  const addItem = useCartStore(s => s.addItem)
  const addToast = useUIStore(s => s.addToast)
  const { data: invoice } = useOrderInvoice(order.id)

  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [returnModalVisible, setReturnModalVisible] = useState(false)
  const [invoiceVisible, setInvoiceVisible] = useState(false)
  const [snackVisible, setSnackVisible] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const [snackAction, setSnackAction] = useState<{ label: string; onPress: () => void } | undefined>()

  const showSnack = useCallback((message: string, action?: { label: string; onPress: () => void }) => {
    setSnackMessage(message)
    setSnackAction(action)
    setSnackVisible(true)
  }, [])

  const handleBuyAgain = useCallback(async () => {
    try {
      const result = await reorder.mutateAsync(order.id)
      if (result.success && result.items) {
        for (const item of result.items) {
          addItem(item)
        }
        showSnack(t('orderActions.itemsAddedToCart'), {
          label: t('orderActions.viewCart'),
          onPress: () => router.push('/cart'),
        })
      }
    } catch {}
  }, [order.id, reorder, addItem, showSnack, t, router])

  const handleCancelSuccess = useCallback(() => {
    showSnack(t('orderActions.orderCancelled'))
  }, [showSnack, t])

  const handleReturnSuccess = useCallback(() => {
    showSnack(t('orderActions.returnRequested'))
  }, [showSnack, t])

  const handleContactSeller = useCallback(() => {
    const sellerName = order.items[0]?.name.split('—')[0]?.trim() || 'Seller'
    router.push(`/inbox?tab=messages&context=order&orderId=${order.id}&seller=${encodeURIComponent(sellerName)}`)
  }, [order, router])

  const handleGetHelp = useCallback(() => {
    router.push('/profile?section=support')
  }, [router])

  const handleRateReview = useCallback(() => {
    if (order.items.length > 0) {
      router.push(`/product/${order.items[0].productId}?review=true`)
    }
  }, [order, router])

  const handleTrackShipment = useCallback(() => {
    onScrollToTimeline?.()
  }, [onScrollToTimeline])

  const primaryActions: { label: string; onPress: () => void }[] = []
  const secondaryActions: { label: string; onPress: () => void; isDestructive?: boolean; isText?: boolean }[] = []

  // Buy again (primary for delivered/cancelled/returned)
  if (CAN_BUY_AGAIN.includes(order.status)) {
    primaryActions.push({
      label: t('orderActions.buyAgain'),
      onPress: handleBuyAgain,
    })
  }

  // Cancel (secondary destructive for pending/confirmed/processing)
  if (CAN_CANCEL.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.cancelOrder'),
      onPress: () => setCancelModalVisible(true),
      isDestructive: true,
    })
  }

  // Track shipment
  if (CAN_TRACK.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.trackShipment'),
      onPress: handleTrackShipment,
    })
  }

  // Return/Refund
  if (CAN_RETURN.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.returnOrder'),
      onPress: () => setReturnModalVisible(true),
      isDestructive: true,
    })
  }

  // Rate & review
  if (CAN_RATE.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.rateReview'),
      onPress: handleRateReview,
    })
  }

  // Contact seller
  secondaryActions.push({
    label: t('orderActions.contactSeller'),
    onPress: handleContactSeller,
    isText: true,
  })

  // View invoice
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.viewInvoice'),
      onPress: () => setInvoiceVisible(true),
      isText: true,
    })
  }

  // Get help
  secondaryActions.push({
    label: t('orderActions.getHelp'),
    onPress: handleGetHelp,
    isText: true,
  })

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-text">{t('orderActions.actions')}</h3>
        <div className="h-px bg-border" />
      </div>

      {/* Primary action (full-width) */}
      {primaryActions.map((action, index) => (
        <motion.button
          key={`primary-${index}`}
          onClick={action.onPress}
          whileHover={reduced ? {} : { scale: 1.01 }}
          whileTap={reduced ? {} : { scale: 0.98 }}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
          aria-label={`${action.label}, ${order.id}`}
        >
          {action.label}
        </motion.button>
      ))}

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-2">
        {secondaryActions.map((action, index) => {
          if (action.isText) {
            return (
              <button
                key={`secondary-${index}`}
                onClick={action.onPress}
                className="text-sm font-semibold text-primary hover:underline"
                aria-label={`${action.label}, ${order.id}`}
              >
                {action.label}
              </button>
            )
          }

          return (
            <motion.button
              key={`secondary-${index}`}
              onClick={action.onPress}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className={`h-10 px-4 rounded-lg border-[1.5px] font-semibold text-sm transition-colors ${
                action.isDestructive
                  ? 'border-error text-error hover:bg-error-light'
                  : 'border-primary text-primary hover:bg-primary-50'
              }`}
              aria-label={`${action.label}, ${order.id}`}
            >
              {action.label}
            </motion.button>
          )
        })}
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        visible={cancelModalVisible}
        orderId={order.id}
        onClose={() => setCancelModalVisible(false)}
        onSuccess={handleCancelSuccess}
      />

      {/* Return Request Modal */}
      <ReturnRequestModal
        visible={returnModalVisible}
        orderId={order.id}
        items={order.items}
        onClose={() => setReturnModalVisible(false)}
        onSuccess={handleReturnSuccess}
      />

      {/* Invoice View */}
      <InvoiceView
        visible={invoiceVisible}
        invoice={invoice || null}
        onClose={() => setInvoiceVisible(false)}
      />

      {/* Snackbar */}
      <Snackbar
        visible={snackVisible}
        message={snackMessage}
        actionLabel={snackAction?.label}
        onAction={snackAction?.onPress}
        onDismiss={() => setSnackVisible(false)}
        autoHideMs={3000}
      />
    </div>
  )
}
