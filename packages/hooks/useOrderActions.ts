import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useReorder, useOrderInvoice } from './useProducts'
import { useCartStore } from '@chinooz/state'
import type { Order } from '@chinooz/types'

export const CAN_CANCEL: Order['status'][] = ['pending', 'confirmed', 'processing']
export const CAN_RETURN: Order['status'][] = ['delivered']
export const CAN_TRACK: Order['status'][] = ['shipped', 'processing']
export const CAN_RATE: Order['status'][] = ['delivered']
export const CAN_BUY_AGAIN: Order['status'][] = ['delivered', 'cancelled', 'returned']

export interface OrderAction {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'text'
  isDestructive?: boolean
}

export interface UseOrderActionsOptions {
  onScrollToTimeline?: () => void
  navigate: (path: string) => void
  onBuyAgainStart?: () => void
  onBuyAgainSuccess?: () => void
  onCancelSuccess?: () => void
  onReturnSuccess?: () => void
}

export function useOrderActions(order: Order, options: UseOrderActionsOptions) {
  const { t } = useTranslation()
  const reorder = useReorder()
  const addItem = useCartStore(s => s.addItem)
  const { data: invoice } = useOrderInvoice(order.id)
  const {
    onScrollToTimeline,
    navigate,
    onBuyAgainStart,
    onBuyAgainSuccess,
    onCancelSuccess,
    onReturnSuccess,
  } = options

  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [returnModalVisible, setReturnModalVisible] = useState(false)
  const [invoiceVisible, setInvoiceVisible] = useState(false)
  const [snackVisible, setSnackVisible] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const [snackAction, setSnackAction] = useState<{ label: string; onPress: () => void } | undefined>()

  const showSnack = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      setSnackMessage(message)
      setSnackAction(action)
      setSnackVisible(true)
    },
    [],
  )

  const dismissSnack = useCallback(() => setSnackVisible(false), [])

  const handleBuyAgain = useCallback(async () => {
    onBuyAgainStart?.()
    try {
      const result = await reorder.mutateAsync(order.id)
      if (result.success && result.items) {
        for (const item of result.items) {
          addItem(item)
        }
        onBuyAgainSuccess?.()
        showSnack(t('orderActions.itemsAddedToCart'), {
          label: t('orderActions.viewCart'),
          onPress: () => navigate('/cart'),
        })
      }
    } catch (err) {
      console.error('Failed to reorder items', err)
    }
  }, [order.id, reorder, addItem, showSnack, t, navigate, onBuyAgainStart, onBuyAgainSuccess])

  const handleCancelSuccess = useCallback(() => {
    onCancelSuccess?.()
    showSnack(t('orderActions.orderCancelled'))
  }, [showSnack, t, onCancelSuccess])

  const handleReturnSuccess = useCallback(() => {
    onReturnSuccess?.()
    showSnack(t('orderActions.returnRequested'))
  }, [showSnack, t, onReturnSuccess])

  const handleContactSeller = useCallback(() => {
    const sellerName = order.items[0]?.name.split('—')[0]?.trim() || 'Seller'
    navigate(`/inbox?tab=messages&context=order&orderId=${order.id}&seller=${encodeURIComponent(sellerName)}`)
  }, [order, navigate])

  const handleGetHelp = useCallback(() => {
    navigate('/profile?section=support')
  }, [navigate])

  const handleRateReview = useCallback(() => {
    if (order.items.length > 0) {
      navigate(`/product/${order.items[0].productId}?review=true`)
    }
  }, [order, navigate])

  const handleTrackShipment = useCallback(() => {
    onScrollToTimeline?.()
  }, [onScrollToTimeline])

  const primaryActions: OrderAction[] = []
  const secondaryActions: OrderAction[] = []

  if (CAN_BUY_AGAIN.includes(order.status)) {
    primaryActions.push({
      label: t('orderActions.buyAgain'),
      onPress: handleBuyAgain,
      variant: 'primary',
    })
  }

  if (CAN_CANCEL.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.cancelOrder'),
      onPress: () => setCancelModalVisible(true),
      variant: 'outline',
      isDestructive: true,
    })
  }

  if (CAN_TRACK.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.trackShipment'),
      onPress: handleTrackShipment,
      variant: 'outline',
    })
  }

  if (CAN_RETURN.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.returnOrder'),
      onPress: () => setReturnModalVisible(true),
      variant: 'outline',
      isDestructive: true,
    })
  }

  if (CAN_RATE.includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.rateReview'),
      onPress: handleRateReview,
      variant: 'outline',
    })
  }

  secondaryActions.push({
    label: t('orderActions.contactSeller'),
    onPress: handleContactSeller,
    variant: 'text',
  })

  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    secondaryActions.push({
      label: t('orderActions.viewInvoice'),
      onPress: () => setInvoiceVisible(true),
      variant: 'text',
    })
  }

  secondaryActions.push({
    label: t('orderActions.getHelp'),
    onPress: handleGetHelp,
    variant: 'text',
  })

  return {
    primaryActions,
    secondaryActions,
    cancelModalVisible,
    setCancelModalVisible,
    returnModalVisible,
    setReturnModalVisible,
    invoiceVisible,
    setInvoiceVisible,
    snackVisible,
    snackMessage,
    snackAction,
    dismissSnack,
    invoice,
    handleCancelSuccess,
    handleReturnSuccess,
  }
}
