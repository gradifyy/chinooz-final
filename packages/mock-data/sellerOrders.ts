import type {
  SellerSubOrder,
  SellerSubOrderItem,
  SellerOrderStatusKey,
  SellerPaymentType,
  SellerShippingMethod,
  OrderStatus,
} from '@chinooz/types'
import { orders, products } from './fixtures'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

const PRODUCT_SELLER = new Map<string, { sellerId: string; sellerName: string }>()
for (const p of products) {
  PRODUCT_SELLER.set(p.id, { sellerId: p.sellerId, sellerName: p.sellerName })
}

const SELLER_NAMES: Record<string, string> = {}
for (const p of products) SELLER_NAMES[p.sellerId] = p.sellerName

const BUYERS = [
  { name: 'Aarav Sharma', phone: '+977-9801112222', city: 'Kathmandu', district: 'Kathmandu' },
  { name: 'Sita Rai', phone: '+977-9812334455', city: 'Lalitpur', district: 'Lalitpur' },
  { name: 'Bishal Thapa', phone: '+977-9824455667', city: 'Bhaktapur', district: 'Bhaktapur' },
  { name: 'Gita Maharjan', phone: '+977-9845677889', city: 'Pokhara', district: 'Kaski' },
  { name: 'Rohan Tamang', phone: '+977-9861234567', city: 'Biratnagar', district: 'Morang' },
  { name: 'Nisha Gurung', phone: '+977-9809876543', city: 'Chitwan', district: 'Chitwan' },
  { name: 'Kabir Shrestha', phone: '+977-9815554433', city: 'Dharan', district: 'Sunsari' },
  { name: 'Maya Limbu', phone: '+977-9823332211', city: 'Butwal', district: 'Rupandehi' },
]

const ITEM_LIBRARY: { productId: string; name: string; image: string; price: number; sku: string }[] = [
  { productId: 'prod-1', name: 'Samsung Galaxy A55 5G — Ice Blue 128GB', image: 'https://picsum.photos/seed/a55/200/200', price: 45999, sku: 'SAM-A55-IB128' },
  { productId: 'prod-5', name: 'Daraz 10000mAh Power Bank', image: 'https://picsum.photos/seed/powerbank/200/200', price: 1299, sku: 'DRZ-PB10K' },
  { productId: 'prod-8', name: 'Redmi Note 13 Pro — Ocean Teal 256GB', image: 'https://picsum.photos/seed/redmi/200/200', price: 37999, sku: 'MI-N13P-OT256' },
  { productId: 'prod-1b', name: 'Samsung Galaxy A55 5G — Lavender 256GB', image: 'https://picsum.photos/seed/a55lav/200/200', price: 51999, sku: 'SAM-A55-LV256' },
  { productId: 'prod-8b', name: 'Redmi Note 13 Pro — Midnight Black 128GB', image: 'https://picsum.photos/seed/redmiblk/200/200', price: 34999, sku: 'MI-N13P-MB128' },
  { productId: 'prod-5b', name: 'Daraz 20000mAh Power Bank PD', image: 'https://picsum.photos/seed/powerbank20k/200/200', price: 2199, sku: 'DRZ-PB20K-PD' },
  { productId: 'prod-1c', name: 'Samsung Galaxy A35 5G — Awesome Navy 128GB', image: 'https://picsum.photos/seed/a35/200/200', price: 38999, sku: 'SAM-A35-AN128' },
]

function seeded(n: number, seed: number): number {
  const x = Math.sin(seed + n) * 10000
  return x - Math.floor(x)
}

function pick<T>(arr: T[], n: number, seed: number): T {
  return arr[Math.floor(seeded(n, seed) * arr.length)]
}

interface SeedSpec {
  key: SellerOrderStatusKey
  orderStatus: OrderStatus
  ageDays: number
  itemCount: number
  qty: number
  paymentType: SellerPaymentType
  shippingMethod: SellerShippingMethod
  actionNeeded: boolean
  actionReason?: string
  buyerIdx: number
  productIdx: number
}

const SEED_SPECS: SeedSpec[] = [
  // New (pending, fresh)
  { key: 'new', orderStatus: 'pending', ageDays: 0, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 0, productIdx: 0 },
  { key: 'new', orderStatus: 'pending', ageDays: 0, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: false, buyerIdx: 1, productIdx: 3 },
  { key: 'new', orderStatus: 'pending', ageDays: 1, itemCount: 2, qty: 2, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 2, productIdx: 5 },
  { key: 'new', orderStatus: 'pending', ageDays: 1, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'sameday', actionNeeded: false, buyerIdx: 3, productIdx: 1 },
  { key: 'new', orderStatus: 'pending', ageDays: 1, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'pickup', actionNeeded: false, buyerIdx: 4, productIdx: 6 },

  // To pack (confirmed)
  { key: 'to_pack', orderStatus: 'confirmed', ageDays: 2, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: false, buyerIdx: 5, productIdx: 2 },
  { key: 'to_pack', orderStatus: 'confirmed', ageDays: 2, itemCount: 2, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 6, productIdx: 0 },
  { key: 'to_pack', orderStatus: 'confirmed', ageDays: 3, itemCount: 1, qty: 2, paymentType: 'prepaid', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 7, productIdx: 4 },
  { key: 'to_pack', orderStatus: 'confirmed', ageDays: 3, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'sameday', actionNeeded: false, buyerIdx: 0, productIdx: 1 },

  // To ship (processing)
  { key: 'to_ship', orderStatus: 'processing', ageDays: 3, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: false, buyerIdx: 1, productIdx: 3 },
  { key: 'to_ship', orderStatus: 'processing', ageDays: 4, itemCount: 2, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 2, productIdx: 5 },
  { key: 'to_ship', orderStatus: 'processing', ageDays: 4, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 3, productIdx: 6 },

  // Shipped
  { key: 'shipped', orderStatus: 'shipped', ageDays: 5, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: false, buyerIdx: 4, productIdx: 0 },
  { key: 'shipped', orderStatus: 'shipped', ageDays: 6, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 5, productIdx: 2 },
  { key: 'shipped', orderStatus: 'shipped', ageDays: 6, itemCount: 2, qty: 2, paymentType: 'prepaid', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 6, productIdx: 1 },
  { key: 'shipped', orderStatus: 'shipped', ageDays: 7, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'sameday', actionNeeded: false, buyerIdx: 7, productIdx: 4 },

  // Completed (delivered)
  { key: 'completed', orderStatus: 'delivered', ageDays: 12, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: false, buyerIdx: 0, productIdx: 3 },
  { key: 'completed', orderStatus: 'delivered', ageDays: 15, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 1, productIdx: 6 },
  { key: 'completed', orderStatus: 'delivered', ageDays: 18, itemCount: 2, qty: 1, paymentType: 'prepaid', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 2, productIdx: 5 },
  { key: 'completed', orderStatus: 'delivered', ageDays: 22, itemCount: 1, qty: 2, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 3, productIdx: 0 },
  { key: 'completed', orderStatus: 'delivered', ageDays: 28, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'pickup', actionNeeded: false, buyerIdx: 4, productIdx: 1 },
  { key: 'completed', orderStatus: 'delivered', ageDays: 40, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 5, productIdx: 2 },

  // Cancelled / Returned
  { key: 'cancelled_returned', orderStatus: 'cancelled', ageDays: 9, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: false, buyerIdx: 6, productIdx: 4 },
  { key: 'cancelled_returned', orderStatus: 'returned', ageDays: 25, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'standard', actionNeeded: true, actionReason: 'Return request — approve refund', buyerIdx: 7, productIdx: 3 },
  { key: 'cancelled_returned', orderStatus: 'cancelled', ageDays: 14, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: false, buyerIdx: 0, productIdx: 6 },

  // Action needed (overlapping view)
  { key: 'to_pack', orderStatus: 'confirmed', ageDays: 2, itemCount: 1, qty: 1, paymentType: 'cod', shippingMethod: 'standard', actionNeeded: true, actionReason: 'Buyer address incomplete — confirm before packing', buyerIdx: 2, productIdx: 0 },
  { key: 'new', orderStatus: 'pending', ageDays: 0, itemCount: 1, qty: 1, paymentType: 'prepaid', shippingMethod: 'express', actionNeeded: true, actionReason: 'Payment verification pending', buyerIdx: 4, productIdx: 5 },
]

function buildItems(spec: SeedSpec): SellerSubOrderItem[] {
  const items: SellerSubOrderItem[] = []
  for (let i = 0; i < spec.itemCount; i++) {
    const lib = ITEM_LIBRARY[(spec.productIdx + i) % ITEM_LIBRARY.length]
    items.push({
      id: `si-${spec.productIdx}-${i}`,
      productId: lib.productId,
      name: lib.name,
      image: lib.image,
      price: lib.price,
      quantity: spec.qty,
      sku: lib.sku,
    })
  }
  return items
}

function buildSeededSubOrders(sellerId: string): SellerSubOrder[] {
  return SEED_SPECS.map((spec, i) => {
    const items = buildItems(spec)
    const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
    const buyer = BUYERS[spec.buyerIdx % BUYERS.length]
    const orderNum = 2050 + i
    return {
      subOrderId: `SUB-${sellerId}-${orderNum}`,
      orderId: `ORD-${orderNum}`,
      sellerId,
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
      city: buyer.city,
      district: buyer.district,
      items,
      itemCount: items.reduce((s, it) => s + it.quantity, 0),
      total,
      currency: 'NPR',
      status: spec.orderStatus,
      statusKey: spec.key,
      paymentType: spec.paymentType,
      shippingMethod: spec.shippingMethod,
      createdAt: daysAgo(spec.ageDays),
      estimatedDelivery:
        spec.key === 'shipped' || spec.key === 'to_ship'
          ? daysAhead(Math.max(1, 4 - Math.floor(spec.ageDays / 2)))
          : spec.key === 'completed'
            ? daysAgo(spec.ageDays - 6)
            : daysAhead(3),
      actionNeeded: spec.actionNeeded,
      actionReason: spec.actionReason,
    } satisfies SellerSubOrder
  })
}

function fromFixtureOrders(sellerId: string): SellerSubOrder[] {
  const out: SellerSubOrder[] = []
  for (const order of orders) {
    const sellerItems = order.items.filter(it => PRODUCT_SELLER.get(it.productId)?.sellerId === sellerId)
    if (sellerItems.length === 0) continue
    let statusKey: SellerOrderStatusKey
    switch (order.status) {
      case 'pending':
      case 'confirmed':
        statusKey = order.status === 'pending' ? 'new' : 'to_pack'
        break
      case 'processing':
        statusKey = 'to_ship'
        break
      case 'shipped':
        statusKey = 'shipped'
        break
      case 'delivered':
        statusKey = 'completed'
        break
      case 'cancelled':
      case 'returned':
      default:
        statusKey = 'cancelled_returned'
        break
    }
    out.push({
      subOrderId: `SUB-${sellerId}-${order.id}`,
      orderId: order.id.toUpperCase(),
      sellerId,
      buyerName: order.address.fullName,
      buyerPhone: order.address.phone,
      city: order.address.city,
      district: order.address.district,
      items: sellerItems.map(it => ({
        id: it.id,
        productId: it.productId,
        name: it.name,
        image: it.image,
        price: it.price,
        quantity: it.quantity,
        sku: it.variantId,
      })),
      itemCount: sellerItems.reduce((s, it) => s + it.quantity, 0),
      total: sellerItems.reduce((s, it) => s + it.price * it.quantity, 0),
      currency: order.currency,
      status: order.status,
      statusKey,
      paymentType: (order.id === 'ord-4' ? 'prepaid' : 'cod') as SellerPaymentType,
      shippingMethod: (order.status === 'shipped' || order.status === 'processing' ? 'express' : 'standard') as SellerShippingMethod,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      actionNeeded: false,
    } satisfies SellerSubOrder)
  }
  return out
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 220, max = 520): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

export async function getSellerOrders(
  sellerId: string,
  status?: SellerOrderStatusKey,
): Promise<SellerSubOrder[]> {
  await randomDelay()
  const all = [...fromFixtureOrders(sellerId), ...buildSeededSubOrders(sellerId)]
  if (status && status !== 'action_needed') {
    if (status === 'cancelled_returned') {
      return all.filter(o => o.statusKey === 'cancelled_returned')
    }
    return all.filter(o => o.statusKey === status)
  }
  if (status === 'action_needed') {
    return all.filter(o => o.actionNeeded)
  }
  return all
}

export const SELLER_ORDER_STATUS_KEYS: SellerOrderStatusKey[] = [
  'new',
  'to_pack',
  'to_ship',
  'shipped',
  'completed',
  'cancelled_returned',
  'action_needed',
]

export function sellerDisplayName(sellerId: string): string {
  return SELLER_NAMES[sellerId] ?? 'Chinooz Seller'
}
