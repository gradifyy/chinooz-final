import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { useReorder, useOrderInvoice } from '@chinooz/hooks'
import { useCartStore, useUIStore } from '@chinooz/state'
import CancelOrderSheet from './CancelOrderSheet'
import ReturnRequestSheet from './ReturnRequestSheet'
import InvoiceView from './InvoiceView'
import Snackbar from './Snackbar'
import type { Order } from '@chinooz/types'

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
  const reorder = useReorder()
  const addItem = useCartStore(s => s.addItem)
  const addToast = useUIStore(s => s.addToast)
  const { data: invoice } = useOrderInvoice(order.id)

  const [cancelSheetVisible, setCancelSheetVisible] = useState(false)
  const [returnSheetVisible, setReturnSheetVisible] = useState(false)
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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch {}
    try {
      const result = await reorder.mutateAsync(order.id)
      if (result.success && result.items) {
        for (const item of result.items) {
          addItem(item)
        }
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
        showSnack(t('orderActions.itemsAddedToCart'), {
          label: t('orderActions.viewCart'),
          onPress: () => router.push('/cart'),
        })
      }
    } catch {}
  }, [order.id, reorder, addItem, showSnack, t, router])

  const handleCancelSuccess = useCallback(() => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
    showSnack(t('orderActions.orderCancelled'))
  }, [showSnack, t])

  const handleReturnSuccess = useCallback(() => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
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

  const primaryActions: { label: string; onPress: () => void; variant: 'primary' | 'outline' | 'text' }[] = []
  const secondaryActions: { label: string; onPress: () => void; variant: 'outline' | 'text' }[] = []

  // Buy again (primary for delivered/cancelled/returned)
  if (CAN_BUY_AGAIN.includes(order.status)) {
    primaryActions.push({
      label: t('orderActions.buyAgain'),
      onPress: handleBuyAgain,
      variant: 'primary',
    })
  }

  // Cancel (primary destructive for pending/confirmed/processing)
  if (CAN_CANCEL.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.cancelOrder'),
      onPress: () => setCancelSheetVisible(true),
      variant: 'outline',
    })
  }

  // Track shipment
  if (CAN_TRACK.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.trackShipment'),
      onPress: handleTrackShipment,
      variant: 'outline',
    })
  }

  // Return/Refund
  if (CAN_RETURN.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.returnOrder'),
      onPress: () => setReturnSheetVisible(true),
      variant: 'outline',
    })
  }

  // Rate & review
  if (CAN_RATE.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.rateReview'),
      onPress: handleRateReview,
      variant: 'outline',
    })
  }

  // Contact seller (always available)
  secondaryActions.push({
    label: t('orderActions.contactSeller'),
    onPress: handleContactSeller,
    variant: 'text',
  })

  // View invoice (available for confirmed+)
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.viewInvoice'),
      onPress: () => setInvoiceVisible(true),
      variant: 'text',
    })
  }

  // Get help (always available)
  secondaryActions.push({
    label: t('orderActions.getHelp'),
    onPress: handleGetHelp,
    variant: 'text',
  })

  return (
    <View style={{ gap: spacing[3] }}>
      {/* Section header */}
      <View style={{ gap: spacing[2] }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
          {t('orderActions.actions')}
        </Text>
        <View style={{ height: 1, backgroundColor: colors.border }} />
      </View>

      {/* Primary action (full-width) */}
      {primaryActions.length > 0 && primaryActions.map((action, index) => (
        <TouchableOpacity
          key={`primary-${index}`}
          onPress={action.onPress}
          style={{
            backgroundColor: colors.primary,
            height: 48,
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.85}
          accessibilityLabel={`${action.label}, ${order.id}`}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Secondary actions (horizontal row) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {secondaryActions.map((action, index) => {
          const isOutline = action.variant === 'outline'
          const isCancelAction = action.label === t('orderActions.cancelOrder')
          const isReturnAction = action.label === t('orderActions.returnOrder')

          return (
            <TouchableOpacity
              key={`secondary-${index}`}
              onPress={action.onPress}
              style={{
                height: 40,
                borderRadius: radii.md,
                paddingHorizontal: spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isOutline ? 1.5 : 0,
                borderColor: isCancelAction || isReturnAction ? colors.error : colors.primary,
                backgroundColor: isOutline ? 'transparent' : 'transparent',
              }}
              activeOpacity={0.85}
              accessibilityLabel={`${action.label}, ${order.id}`}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isCancelAction || isReturnAction ? colors.error : colors.primary,
                }}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Cancel Order Sheet */}
      <CancelOrderSheet
        visible={cancelSheetVisible}
        orderId={order.id}
        onClose={() => setCancelSheetVisible(false)}
        onSuccess={handleCancelSuccess}
      />

      {/* Return Request Sheet */}
      <ReturnRequestSheet
        visible={returnSheetVisible}
        orderId={order.id}
        items={order.items}
        onClose={() => setReturnSheetVisible(false)}
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
    </View>
  )
}
