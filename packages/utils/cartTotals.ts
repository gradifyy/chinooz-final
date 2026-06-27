import type { CartItem } from '@chinooz/types'

interface PromoCode {
  discount: number
  type: 'percentage' | 'fixed'
}

interface CartTotals {
  subtotal: number
  vatAmount: number
  discount: number
  deliveryFee: number
  codFee: number
  grandTotal: number
  itemCount: number
  freeShippingProgress: number
  amountToFreeShipping: number
  freeShippingUnlocked: boolean
}

const SHIPPING_CONFIG = {
  deliveryFee: 150,
  expressFee: 300,
  sameDayFee: 250,
  freeShippingThreshold: 2000,
  vatRate: 0.13,
  codFee: 0,
}

export function calcCartTotals(
  items: CartItem[],
  promo?: PromoCode | null,
  deliveryMethod: 'standard' | 'express' | 'sameDay' | 'scheduled' = 'standard',
  paymentMethod: 'cod' | 'esewa' | 'khalti' = 'cod',
): CartTotals {
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const vatAmount = Math.round(subtotal * SHIPPING_CONFIG.vatRate / (1 + SHIPPING_CONFIG.vatRate))

  let discount = 0
  if (promo) {
    discount = promo.type === 'percentage'
      ? Math.round(subtotal * promo.discount / 100)
      : promo.discount
  }

  let deliveryFee = SHIPPING_CONFIG.deliveryFee
  if (deliveryMethod === 'express') deliveryFee = SHIPPING_CONFIG.expressFee
  else if (deliveryMethod === 'sameDay') deliveryFee = SHIPPING_CONFIG.sameDayFee
  else if (deliveryMethod === 'scheduled') deliveryFee = SHIPPING_CONFIG.deliveryFee

  if (subtotal >= SHIPPING_CONFIG.freeShippingThreshold) {
    deliveryFee = 0
  }

  const codFee = paymentMethod === 'cod' ? SHIPPING_CONFIG.codFee : 0

  const grandTotal = Math.max(0, subtotal - discount + deliveryFee + codFee)

  const freeShippingProgress = Math.min(1, subtotal / SHIPPING_CONFIG.freeShippingThreshold)
  const amountToFreeShipping = Math.max(0, SHIPPING_CONFIG.freeShippingThreshold - subtotal)
  const freeShippingUnlocked = subtotal >= SHIPPING_CONFIG.freeShippingThreshold

  return {
    subtotal,
    vatAmount,
    discount,
    deliveryFee,
    codFee,
    grandTotal,
    itemCount,
    freeShippingProgress,
    amountToFreeShipping,
    freeShippingUnlocked,
  }
}
