import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useCartStore, useCheckoutStore } from '@chinooz/state'
import { placeOrder } from '@chinooz/mock-data'
import { checkoutSchema } from '@chinooz/validation'
import { calcCartTotals } from '@chinooz/utils'
import type { CartItem } from '@chinooz/types'

export interface SubOrder {
  sellerName: string
  orderId: string
  eta: string
  total: number
  itemCount: number
}

export function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim().split(' ')[0] || 'Other'
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

interface UseReviewSubmissionOptions {
  onSuccess?: () => void
  onError?: () => void
}

export function useReviewSubmission({ onSuccess, onError }: UseReviewSubmissionOptions = {}) {
  const { t } = useTranslation()
  const cartItems = useCartStore(s => s.items)
  const removeItems = useCartStore(s => s.removeItems)
  const checkout = useCheckoutStore()
  const reset = useCheckoutStore(s => s.reset)
  const queryClient = useQueryClient()

  const items = useMemo(
    () => (checkout.selectedIds.length ? cartItems.filter(i => checkout.selectedIds.includes(i.id)) : cartItems),
    [cartItems, checkout.selectedIds],
  )

  const [agreed, setAgreed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [subOrders, setSubOrders] = useState<SubOrder[]>([])

  const totals = calcCartTotals(items, checkout.coupon, checkout.deliveryMethod === 'sameDay' ? 'sameDay' : checkout.deliveryMethod === 'express' ? 'express' : 'standard', checkout.paymentMethod)
  const { subtotal, vatAmount: vat, discount, deliveryFee, grandTotal } = totals
  const sellerGroups = groupBySeller(items)

  const handlePlaceOrder = useCallback(async () => {
    if (!checkout.address) {
      setError(t('checkout.selectAddress'))
      return
    }
    const validation = checkoutSchema.safeParse({
      addressId: 'current',
      paymentMethod: checkout.paymentMethod,
    })
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || t('checkout.validationError'))
      return
    }
    setPlacing(true)
    setError(null)
    try {
      const result = await placeOrder({
        items,
        address: checkout.address!,
        deliveryMethod: checkout.deliveryMethod,
        paymentMethod: checkout.paymentMethod,
        couponCode: checkout.coupon?.code,
        subtotal,
        deliveryFee,
        discount,
        total: grandTotal,
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
        removeItems(items.map(i => i.id))
        reset()
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['order'] })
        onSuccess?.()
      } else {
        setError(result.error || t('checkout.paymentFailed'))
        onError?.()
      }
    } catch {
      setError(t('checkout.paymentFailed'))
    } finally {
      setPlacing(false)
    }
  }, [items, checkout, removeItems, reset, t, subtotal, deliveryFee, discount, grandTotal, queryClient, sellerGroups, onSuccess, onError])

  const handleSwitchToCod = useCallback(() => {
    checkout.setPaymentMethod('cod')
    setError(null)
  }, [checkout])

  return {
    checkout,
    items,
    subtotal,
    vat,
    discount,
    deliveryFee,
    grandTotal,
    sellerGroups,
    agreed,
    setAgreed,
    placing,
    error,
    success,
    orderIds,
    subOrders,
    handlePlaceOrder,
    handleSwitchToCod,
  }
}
