import type { CartItem, OrderStatus } from '@chinooz/types'

/**
 * Group cart/order items by seller.
 *
 * Uses `sellerId` if available, otherwise falls back to parsing the seller name
 * from the item name (legacy compatibility with mock data that encodes the
 * seller name in the product name as "SellerName — Variant").
 */
export function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const sellerId = (item as CartItem & { sellerId?: string }).sellerId
    const seller =
      sellerId ||
      item.name.split('—')[0]?.trim() ||
      item.name
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

interface StatusColor {
  bg: string
  text: string
}

const ORDER_STATUS_COLORS: Record<OrderStatus, StatusColor> = {
  pending: { bg: 'bg-warning-light', text: 'text-warning' },
  confirmed: { bg: 'bg-info-light', text: 'text-info' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-600' },
  shipped: { bg: 'bg-sky-100', text: 'text-sky-600' },
  delivered: { bg: 'bg-success-light', text: 'text-success' },
  cancelled: { bg: 'bg-error-light', text: 'text-error' },
  returned: { bg: 'bg-warning-light', text: 'text-warning' },
}

export function getStatusColors(status: OrderStatus): StatusColor {
  return ORDER_STATUS_COLORS[status]
}

export { ORDER_STATUS_COLORS }
