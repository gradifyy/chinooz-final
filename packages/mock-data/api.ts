import type {
  Product,
  Category,
  Deal,
  Banner,
  Review,
  Order,
  Notification,
  Conversation,
  Message,
  UserProfile,
  CartItem,
  CancelReason,
  ReturnRequest,
  OrderInvoice,
} from '@chinooz/types'
import {
  products,
  categories,
  deals,
  banners,
  reviews,
  orders,
  notifications,
  conversations,
  messages,
  userProfile,
  sampleCartItems,
} from './fixtures'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 200, max = 600): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

export async function getProducts(params?: {
  categoryId?: string
  limit?: number
  offset?: number
}): Promise<{ items: Product[]; total: number }> {
  await randomDelay()
  let filtered = products
  if (params?.categoryId) {
    filtered = products.filter(
      p => p.categoryId === params.categoryId || categories.some(
        c => c.id === params.categoryId && c.children?.some(ch => ch.id === p.categoryId),
      ),
    )
  }
  const offset = params?.offset ?? 0
  const limit = params?.limit ?? 20
  return { items: filtered.slice(offset, offset + limit), total: filtered.length }
}

export async function getProductById(id: string): Promise<Product | null> {
  await randomDelay(150, 400)
  return products.find(p => p.id === id) ?? null
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await randomDelay(150, 400)
  return products.find(p => p.slug === slug) ?? null
}

export async function getCategories(): Promise<Category[]> {
  await randomDelay(100, 300)
  return categories
}

export async function getDeals(): Promise<Deal[]> {
  await randomDelay(150, 400)
  return deals
}

export async function getBanners(): Promise<Banner[]> {
  await randomDelay(100, 250)
  return banners.filter(b => b.active)
}

export async function getReviews(productId: string): Promise<Review[]> {
  await randomDelay(200, 500)
  return reviews.filter(r => r.productId === productId)
}

export async function submitReview(data: {
  productId: string
  rating: number
  title?: string
  body: string
  photos?: string[]
}): Promise<{ success: boolean; review: Review }> {
  await randomDelay(400, 800)
  const newReview: Review = {
    id: `rev-${Date.now()}`,
    productId: data.productId,
    userId: 'user-1',
    userName: 'Ayush Chaudhary',
    rating: data.rating,
    title: data.title,
    body: data.body,
    photos: data.photos,
    createdAt: new Date().toISOString(),
    helpful: 0,
  }
  reviews.push(newReview)
  return { success: true, review: newReview }
}

export async function getOrders(params?: {
  status?: string
  search?: string
}): Promise<Order[]> {
  await randomDelay(300, 700)
  let filtered = orders

  if (params?.status && params.status !== 'all') {
    if (params.status === 'to_pay') {
      filtered = filtered.filter(o => o.status === 'pending' || o.status === 'confirmed')
    } else if (params.status === 'cancelled_returned') {
      filtered = filtered.filter(o => o.status === 'cancelled' || o.status === 'returned')
    } else {
      filtered = filtered.filter(o => o.status === params.status)
    }
  }

  if (params?.search) {
    const q = params.search.toLowerCase()
    filtered = filtered.filter(
      o =>
        o.id.toLowerCase().includes(q) ||
        o.items.some(item => item.name.toLowerCase().includes(q)),
    )
  }

  return filtered
}

export async function getOrderById(id: string): Promise<Order | null> {
  await randomDelay(200, 400)
  return orders.find(o => o.id === id) ?? null
}

export async function getNotifications(): Promise<Notification[]> {
  await randomDelay(150, 400)
  return notifications
}

export async function getUnreadNotificationCount(): Promise<number> {
  await randomDelay(50, 150)
  return notifications.filter(n => !n.read).length
}

export async function getUnreadMessageCount(): Promise<number> {
  await randomDelay(50, 150)
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0)
}

export async function getAssistantUnreadCount(): Promise<number> {
  await randomDelay(50, 150)
  return 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await randomDelay(100, 200)
  const notif = notifications.find(n => n.id === id)
  if (notif) notif.read = true
}

export async function markAllNotificationsRead(): Promise<void> {
  await randomDelay(200, 400)
  for (const n of notifications) n.read = true
}

export async function deleteNotification(id: string): Promise<void> {
  await randomDelay(100, 200)
  const idx = notifications.findIndex(n => n.id === id)
  if (idx >= 0) notifications.splice(idx, 1)
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  await randomDelay(200, 500)
  const msg: Message = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: 'user-1',
    senderName: 'You',
    body,
    createdAt: new Date().toISOString(),
    read: false,
    status: 'sent',
  }
  messages.push(msg)
  const convo = conversations.find(c => c.id === conversationId)
  if (convo) {
    convo.lastMessage = body
    convo.lastMessageAt = msg.createdAt
  }
  return msg
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await randomDelay(100, 200)
  const convo = conversations.find(c => c.id === conversationId)
  if (convo) convo.unreadCount = 0
  for (const m of messages) {
    if (m.conversationId === conversationId && !m.read && m.senderId !== 'user-1') {
      m.read = true
    }
  }
}

export async function getConversations(): Promise<Conversation[]> {
  await randomDelay(200, 500)
  return conversations
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  await randomDelay(200, 400)
  return messages.filter(m => m.conversationId === conversationId)
}

export async function getUserProfile(): Promise<UserProfile> {
  await randomDelay(200, 400)
  return userProfile
}

export async function getCartItems(): Promise<CartItem[]> {
  await randomDelay(100, 300)
  return sampleCartItems
}

function norm(s: string): string {
  return s.normalize('NFC').toLowerCase()
}

export async function searchProducts(query: string): Promise<Product[]> {
  await randomDelay(300, 800)
  const q = norm(query)
  return products.filter(
    p =>
      norm(p.name).includes(q) ||
      norm(p.description).includes(q) ||
      p.tags.some(t => norm(t).includes(q)),
  )
}

export async function searchProductsPaginated(
  query: string,
  params?: { limit?: number; offset?: number },
): Promise<{ items: Product[]; total: number }> {
  await randomDelay(300, 800)
  const q = norm(query)
  const filtered = products.filter(
    p =>
      norm(p.name).includes(q) ||
      norm(p.description).includes(q) ||
      p.tags.some(t => norm(t).includes(q)),
  )
  const offset = params?.offset ?? 0
  const limit = params?.limit ?? 20
  return { items: filtered.slice(offset, offset + limit), total: filtered.length }
}

export async function searchCategories(query: string): Promise<Category[]> {
  await randomDelay(100, 300)
  const q = norm(query)
  const results: Category[] = []
  for (const cat of categories) {
    if (norm(cat.name).includes(q)) results.push(cat)
    if (cat.children) {
      for (const child of cat.children) {
        if (norm(child.name).includes(q)) results.push(child)
      }
    }
  }
  return results
}

export async function searchBrands(query: string): Promise<{ id: string; name: string }[]> {
  await randomDelay(100, 300)
  const q = norm(query)
  const brandMap = new Map<string, { id: string; name: string }>()
  for (const p of products) {
    if (!brandMap.has(p.sellerId)) {
      brandMap.set(p.sellerId, { id: p.sellerId, name: p.sellerName })
    }
  }
  return [...brandMap.values()].filter(b => norm(b.name).includes(q))
}

export async function getPopularProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 6)
}

export async function getRecommendedProducts(userId?: string): Promise<Product[]> {
  await randomDelay(250, 600)
  return [...products].sort(() => Math.random() - 0.5).slice(0, 6)
}

export async function getSimilarProducts(categoryId: string, excludeId?: string): Promise<Product[]> {
  await randomDelay(200, 500)
  return products
    .filter(p => p.categoryId === categoryId && p.id !== excludeId)
    .slice(0, 10)
}

// --- Promo / Voucher ---

const PROMO_CODES: Record<string, { discount: number; type: 'percentage' | 'fixed' }> = {
  CHINOOZ10: { discount: 10, type: 'percentage' },
  FLAT500: { discount: 500, type: 'fixed' },
  WELCOME15: { discount: 15, type: 'percentage' },
}

export async function applyPromoCode(code: string): Promise<{
  success: boolean
  discount?: number
  type?: 'percentage' | 'fixed'
  error?: string
}> {
  await randomDelay(300, 600)
  const upper = code.toUpperCase().trim()
  const promo = PROMO_CODES[upper]
  if (!promo) {
    return { success: false, error: 'Invalid code. Please try again.' }
  }
  return { success: true, discount: promo.discount, type: promo.type }
}

// --- Shipping Config ---

export const SHIPPING_CONFIG = {
  deliveryFee: 150,
  freeShippingThreshold: 2000,
  vatRate: 0.13,
} as const

// --- Place Order ---

export interface PlaceOrderInput {
  items: { productId: string; variantId?: string; name: string; price: number; quantity: number }[]
  address: { fullName: string; phone: string; street: string; area: string; city: string }
  deliveryMethod: 'sameDay' | 'express' | 'scheduled'
  paymentMethod: 'cod' | 'esewa' | 'khalti'
}

export async function placeOrder(input: PlaceOrderInput): Promise<{
  success: boolean
  orderId?: string
  error?: string
}> {
  await randomDelay(600, 1200)
  // Simulate 10% failure rate for non-COD payments
  if (input.paymentMethod !== 'cod' && Math.random() < 0.1) {
    return { success: false, error: 'Payment failed — try again or pay with cash' }
  }
  return { success: true, orderId: `ORD-${Date.now()}` }
}

export async function getTrendingProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8)
}

export async function getNewestProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8)
}

export async function getNearbyProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort(() => Math.random() - 0.5).slice(0, 8)
}

// --- Auth ---

export const __DEV_OTP__ = '123456'
export const __IS_DEV__ = process.env.NODE_ENV !== 'production'

const otpStore = new Map<string, { sentAt: number; code: string }>()

export async function requestOtp(phone: string): Promise<{ success: boolean; message: string; alreadySent?: boolean }> {
  await randomDelay(600, 1200)
  const existing = otpStore.get(phone)
  if (existing && Date.now() - existing.sentAt < 60_000) {
    return { success: true, message: 'Code already sent — check your messages', alreadySent: true }
  }
  otpStore.set(phone, { sentAt: Date.now(), code: __DEV_OTP__ })
  return { success: true, message: 'OTP sent' }
}

export async function verifyOtp(phone: string, code: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  await randomDelay(400, 800)
  if (code === __DEV_OTP__) {
    otpStore.delete(phone)
    return { success: true, userId: 'user-1' }
  }
  return { success: false, error: 'Invalid code. Try again.' }
}

// --- Order Actions ---

export async function cancelOrder(
  orderId: string,
  reason: CancelReason,
  reasonDetail?: string,
): Promise<{ success: boolean; order?: Order; error?: string }> {
  await randomDelay(400, 800)
  const order = orders.find(o => o.id === orderId)
  if (!order) return { success: false, error: 'Order not found' }
  if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled' || order.status === 'returned') {
    return { success: false, error: 'Order cannot be cancelled at this stage' }
  }
  order.status = 'cancelled'
  order.timeline.push({ status: 'cancelled', timestamp: new Date().toISOString(), note: reasonDetail || `Reason: ${reason}` })
  return { success: true, order: { ...order } }
}

export async function requestReturn(
  orderId: string,
  itemIds: string[],
  reason: CancelReason,
  reasonDetail?: string,
): Promise<{ success: boolean; returnRequest?: ReturnRequest; error?: string }> {
  await randomDelay(500, 1000)
  const order = orders.find(o => o.id === orderId)
  if (!order) return { success: false, error: 'Order not found' }
  if (order.status !== 'delivered') return { success: false, error: 'Only delivered orders can be returned' }
  if (itemIds.length === 0) return { success: false, error: 'Select at least one item' }
  const returnRequest: ReturnRequest = {
    orderId,
    itemIds,
    reason,
    reasonDetail,
    status: 'requested',
    createdAt: new Date().toISOString(),
  }
  order.status = 'returned'
  order.timeline.push({ status: 'returned', timestamp: new Date().toISOString(), note: `Return requested: ${reason}` })
  return { success: true, returnRequest }
}

export async function reorder(orderId: string): Promise<{ success: boolean; items?: CartItem[]; error?: string }> {
  await randomDelay(300, 600)
  const order = orders.find(o => o.id === orderId)
  if (!order) return { success: false, error: 'Order not found' }
  return { success: true, items: [...order.items] }
}

export async function getOrderInvoice(orderId: string): Promise<OrderInvoice | null> {
  await randomDelay(200, 500)
  const order = orders.find(o => o.id === orderId)
  if (!order) return null
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vat = Math.round(subtotal * 0.13 / 1.13)
  const deliveryFee = order.total > subtotal ? order.total - subtotal : 0
  const discount = subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0
  return {
    orderId: order.id,
    invoiceNumber: `INV-${order.id.toUpperCase().replace('ORD-', '')}`,
    issuedAt: order.createdAt,
    companyName: 'Chinooz Marketplace Pvt. Ltd.',
    companyAddress: 'Baneshwor-10, Kathmandu, Nepal',
    companyPan: 'PAN: 601234567',
    customerName: order.address.fullName,
    customerAddress: `${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ''}, ${order.address.city}, ${order.address.district}`,
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity,
    })),
    subtotal,
    vat,
    deliveryFee,
    discount,
    grandTotal: order.total,
  }
}

// --- Return Requests Store ---

const returnRequests: ReturnRequest[] = []

export async function getReturnRequests(orderId?: string): Promise<ReturnRequest[]> {
  await randomDelay(150, 300)
  if (orderId) return returnRequests.filter(r => r.orderId === orderId)
  return returnRequests
}
