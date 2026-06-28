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
  SellerProduct,
  SellerProductStatus,
  SellerInventoryProduct,
  SellerInventoryVariant,
  StockStatus,
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
  sellerProducts,
  sellerConversations,
  sellerMessages,
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

export async function getSellerConversations(_sellerId?: string): Promise<Conversation[]> {
  await randomDelay(200, 500)
  return sellerConversations
}

export async function getSellerMessages(conversationId: string): Promise<Message[]> {
  await randomDelay(200, 400)
  return sellerMessages.filter(m => m.conversationId === conversationId)
}

export async function sendSellerMessage(conversationId: string, body: string): Promise<Message> {
  await randomDelay(200, 500)
  const msg: Message = {
    id: `smsg-${Date.now()}`,
    conversationId,
    senderId: 'seller-1',
    senderName: 'You',
    body,
    createdAt: new Date().toISOString(),
    read: false,
    status: 'sent',
  }
  sellerMessages.push(msg)
  const convo = sellerConversations.find(c => c.id === conversationId)
  if (convo) {
    convo.lastMessage = body
    convo.lastMessageAt = msg.createdAt
  }
  return msg
}

export async function markSellerConversationRead(conversationId: string): Promise<void> {
  await randomDelay(100, 200)
  const convo = sellerConversations.find(c => c.id === conversationId)
  if (convo) convo.unreadCount = 0
  for (const m of sellerMessages) {
    if (m.conversationId === conversationId && !m.read && m.senderId !== 'seller-1') {
      m.read = true
    }
  }
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

// --- Seller Products ---

export interface SellerProductFilter {
  status?: SellerProductStatus | 'all'
  search?: string
  categoryId?: string
  priceMin?: number
  priceMax?: number
  stockLevel?: StockStatus | 'all'
  sort?: 'newest' | 'best_selling' | 'price_asc' | 'price_desc' | 'stock'
}

export interface SellerProductResult {
  items: SellerProduct[]
  total: number
  counts: Record<SellerProductStatus | 'all', number>
}

export async function getSellerProducts(filter: SellerProductFilter = {}): Promise<SellerProductResult> {
  await randomDelay(200, 500)
  const status = filter.status ?? 'all'
  let list = [...sellerProducts]

  if (status !== 'all') {
    list = list.filter(p => p.status === status)
  }
  if (filter.search) {
    const q = filter.search.trim().toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }
  if (filter.categoryId) {
    list = list.filter(p => p.categoryId === filter.categoryId)
  }
  if (filter.priceMin != null) {
    list = list.filter(p => p.price >= filter.priceMin!)
  }
  if (filter.priceMax != null) {
    list = list.filter(p => p.price <= filter.priceMax!)
  }
  if (filter.stockLevel && filter.stockLevel !== 'all') {
    list = list.filter(p => p.stock === filter.stockLevel)
  }

  switch (filter.sort) {
    case 'best_selling':
      list.sort((a, b) => b.salesCount - a.salesCount)
      break
    case 'price_asc':
      list.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      list.sort((a, b) => b.price - a.price)
      break
    case 'stock':
      list.sort((a, b) => b.stockCount - a.stockCount)
      break
    case 'newest':
    default:
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      break
  }

  const counts: Record<SellerProductStatus | 'all', number> = {
    all: sellerProducts.length,
    active: sellerProducts.filter(p => p.status === 'active').length,
    draft: sellerProducts.filter(p => p.status === 'draft').length,
    out_of_stock: sellerProducts.filter(p => p.status === 'out_of_stock').length,
    archived: sellerProducts.filter(p => p.status === 'archived').length,
  }

  return { items: list, total: list.length, counts }
}

export async function getSellerCategories(): Promise<Pick<Category, 'id' | 'name' | 'slug'>[]> {
  await randomDelay(100, 250)
  const seen = new Map<string, Pick<Category, 'id' | 'name' | 'slug'>>()
  for (const p of sellerProducts) {
    if (!seen.has(p.categoryId)) {
      const cat = categories.find(c => c.id === p.categoryId)
      seen.set(p.categoryId, {
        id: p.categoryId,
        name: cat?.name ?? p.categoryName,
        slug: cat?.slug ?? p.categoryId,
      })
    }
  }
  return [...seen.values()]
}

// --- Seller Inventory (variant-level) ---

export const LOW_STOCK_THRESHOLD = 10

export function stockStatusFor(count: number): StockStatus {
  if (count <= 0) return 'out_of_stock'
  if (count < LOW_STOCK_THRESHOLD) return 'low_stock'
  return 'in_stock'
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const VARIANT_DESCRIPTORS: { label: string; attrs: Record<string, string> }[] = [
  { label: 'Standard', attrs: { variant: 'Standard' } },
  { label: 'Plus', attrs: { variant: 'Plus' } },
  { label: 'Pro', attrs: { variant: 'Pro' } },
]

function buildInventory(): SellerInventoryProduct[] {
  return sellerProducts.map(p => {
    const rng = mulberry32(hashSeed(p.sku))
    const variantCount = 1 + Math.floor(rng() * 3) // 1..3
    const descs = VARIANT_DESCRIPTORS.slice(0, variantCount)
    const splits: number[] = []
    let remaining = p.stockCount
    for (let i = 0; i < variantCount; i++) {
      if (i === variantCount - 1) {
        splits.push(remaining)
      } else {
        const portion = Math.floor(remaining * (0.25 + rng() * 0.5))
        splits.push(portion)
        remaining = Math.max(0, remaining - portion)
      }
    }
    const variants: SellerInventoryVariant[] = descs.map((d, i) => {
      const count = splits[i] ?? 0
      const suffix = variantCount > 1 ? `-${d.label.toUpperCase()}` : ''
      return {
        id: `${p.id}-v${i + 1}`,
        productId: p.id,
        name: variantCount > 1 ? `${p.name} — ${d.label}` : p.name,
        sku: `${p.sku}${suffix}`,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        currency: p.currency,
        stockCount: count,
        stock: stockStatusFor(count),
        attributes: d.attrs,
        image: p.image,
        salesCount: Math.round((p.salesCount / variantCount) * (0.6 + rng() * 0.8)),
      }
    })
    const aggregateStock = variants.reduce((s, v) => s + v.stockCount, 0)
    const salesSum = variants.reduce((s, v) => s + v.salesCount, 0)
    const stock: StockStatus =
      variants.every(v => v.stock === 'out_of_stock')
        ? 'out_of_stock'
        : variants.some(v => v.stock === 'low_stock' || v.stock === 'out_of_stock')
          ? 'low_stock'
          : 'in_stock'
    return {
      id: p.id,
      name: p.name,
      slug: p.id,
      image: p.image,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      currency: p.currency,
      aggregateStock,
      stock,
      variantCount: variants.length,
      salesCount: salesSum,
      variants,
    }
  })
}

const inventoryCache = buildInventory()

export type InventoryStatus = StockStatus | 'all'
export type InventorySort = 'stock_asc' | 'stock_desc' | 'name' | 'best_selling'

export interface SellerInventoryFilter {
  status?: InventoryStatus
  search?: string
  categoryId?: string
  stockMin?: number
  stockMax?: number
  sort?: InventorySort
}

export interface SellerInventoryResult {
  products: SellerInventoryProduct[]
  counts: Record<InventoryStatus, number>
  totalVariants: number
}

export async function getSellerInventory(
  filter: SellerInventoryFilter = {},
): Promise<SellerInventoryResult> {
  await randomDelay(200, 500)

  // Per-variant counts across the whole catalogue (for tab badges).
  let allVariants = inventoryCache.flatMap(p => p.variants)
  const counts: Record<InventoryStatus, number> = {
    all: allVariants.length,
    in_stock: allVariants.filter(v => v.stock === 'in_stock').length,
    low_stock: allVariants.filter(v => v.stock === 'low_stock').length,
    out_of_stock: allVariants.filter(v => v.stock === 'out_of_stock').length,
  }

  const q = filter.search?.trim().toLowerCase()
  const status = filter.status ?? 'all'

  let list = inventoryCache.map(p => {
    let variants = p.variants
    if (status !== 'all') variants = variants.filter(v => v.stock === status)
    if (q) {
      variants = variants.filter(
        v => v.name.toLowerCase().includes(q!) || v.sku.toLowerCase().includes(q!),
      )
    }
    if (filter.categoryId) {
      if (p.categoryId !== filter.categoryId) variants = []
    }
    if (filter.stockMin != null) variants = variants.filter(v => v.stockCount >= filter.stockMin!)
    if (filter.stockMax != null) variants = variants.filter(v => v.stockCount <= filter.stockMax!)
    return { ...p, variants }
  })

  // Product-level search match: keep product (all its variants) when name matches.
  if (q) {
    list = list.map(p =>
      p.name.toLowerCase().includes(q!) ? { ...p, variants: p.variants } : p,
    )
  }

  list = list.filter(p => p.variants.length > 0)

  switch (filter.sort) {
    case 'stock_asc':
      list.sort((a, b) => a.aggregateStock - b.aggregateStock)
      break
    case 'stock_desc':
      list.sort((a, b) => b.aggregateStock - a.aggregateStock)
      break
    case 'name':
      list.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'best_selling':
      list.sort((a, b) => b.salesCount - a.salesCount)
      break
  }

  const totalVariants = list.reduce((s, p) => s + p.variants.length, 0)
  return { products: list, counts, totalVariants }
}

// --- Seller Reviews ---

export interface SellerReview extends Review {
  productName: string
  productImage: string
  response?: { text: string; at: string }
  flagged?: boolean
}

export type SellerReviewStatus = 'all' | 'needs_response' | 'responded' | 'flagged'
export type SellerReviewSort = 'newest' | 'oldest' | 'lowest' | 'highest'
export type SellerReviewResponseFilter = 'all' | 'with' | 'without'

export interface SellerReviewFilter {
  status?: SellerReviewStatus
  rating?: number | 'all'
  hasResponse?: SellerReviewResponseFilter
  hasPhotos?: boolean
  productId?: string
  sort?: SellerReviewSort
}

export interface SellerReviewDistribution {
  5: number
  4: number
  3: number
  2: number
  1: number
}

export interface SellerReviewSummary {
  average: number
  total: number
  distribution: SellerReviewDistribution
  trendPct: number
  previousAverage: number
}

export interface SellerReviewCounts {
  all: number
  needs_response: number
  responded: number
  flagged: number
}

export interface SellerReviewResult {
  items: SellerReview[]
  total: number
  counts: SellerReviewCounts
  summary: SellerReviewSummary
}

const REVIEW_BODIES: { rating: number; title?: string; body: string }[] = [
  { rating: 5, title: 'Best purchase this year', body: 'Exceeded my expectations. Quality is top-notch and delivery was fast.' },
  { rating: 5, title: 'Highly recommend', body: 'Authentic and well-made. Will buy again from this store.' },
  { rating: 5, body: 'Loved it. Exactly as described. Five stars.' },
  { rating: 4, title: 'Great value', body: 'Really good product. Minor packaging issue but the item itself is perfect.' },
  { rating: 4, body: 'Works well and feels durable. A few scratches on arrival but nothing serious.' },
  { rating: 3, title: 'It’s okay', body: 'Does the job but the finish could be better. Expected more at this price.' },
  { rating: 3, body: 'Average. Nothing special but not bad either.' },
  { rating: 2, title: 'Disappointing', body: 'Item arrived later than promised and the color was off.' },
  { rating: 1, title: 'Not happy', body: 'Product stopped working after two days. Requesting a replacement.' },
]

const REVIEW_NAMES = [
  'Suman Shrestha', 'Anita Gurung', 'Ram Bahadur Thapa', 'Priya Maharjan',
  'Karma Lama', 'Deepa Tamang', 'Rajesh Shrestha', 'Sita Rai', 'Bishal Thapa',
  'Anjali K.C.', 'Rohan Tamang', 'Kiran Rai', 'Maya Gurung', 'Niraj Limbu',
  'Pooja Bhandari', 'Sandeep Koirala', 'Rita Shrestha', 'Aman Maharjan',
]

function seededReview(n: number): number {
  const x = Math.sin(n) * 10000
  return x - Math.floor(x)
}

function buildSellerReviews(): SellerReview[] {
  const list: SellerReview[] = []
  let seed = 1
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  // Seed a handful of "needs response" and "flagged" entries first so counts are stable.
  const activeProducts = sellerProducts.filter(p => p.reviewCount > 0)

  activeProducts.forEach((p, pi) => {
    // Deterministic number of reviews per product (2–5), biased to higher ratings.
    const count = 2 + Math.floor(seededReview(pi + 1) * 4)
    for (let i = 0; i < count; i++) {
      const s = seed++
      const roll = seededReview(s + pi * 7)
      // 60% 5-star, 22% 4-star, 10% 3-star, 5% 2-star, 3% 1-star
      const rating =
        roll < 0.6 ? 5 : roll < 0.82 ? 4 : roll < 0.92 ? 3 : roll < 0.97 ? 2 : 1
      const template = REVIEW_BODIES.find(b => b.rating === rating) ?? REVIEW_BODIES[0]
      const name = REVIEW_NAMES[(pi + i) % REVIEW_NAMES.length]
      const ageDays = Math.floor(seededReview(s + 11) * 90)
      const createdAt = new Date(now - ageDays * day).toISOString()
      const hasPhotos = seededReview(s + 23) > 0.7
      const photos = hasPhotos
        ? [
            `https://picsum.photos/seed/srev-${p.id}-${i}a/200/200`,
            `https://picsum.photos/seed/srev-${p.id}-${i}b/200/200`,
          ].slice(0, 1 + Math.floor(seededReview(s + 31) * 2))
        : undefined
      // Roughly 45% answered, 45% needs response, 10% flagged (flagged implies needs response).
      const stateRoll = seededReview(s + 41)
      const flagged = stateRoll > 0.9
      const responded = !flagged && stateRoll < 0.45
      const response = responded
        ? {
            text: 'Thank you for your review! We’re glad you’re happy with your purchase. 🙏',
            at: new Date(now - (ageDays - 1) * day).toISOString(),
          }
        : undefined

      list.push({
        id: `srev-${p.id}-${i}`,
        productId: p.id,
        productName: p.name,
        productImage: p.image,
        userId: `su-${pi}-${i}`,
        userName: name,
        rating,
        title: template.title,
        body: template.body,
        photos,
        createdAt,
        helpful: Math.floor(seededReview(s + 51) * 40),
        response,
        flagged,
      })
    }
  })

  return list
}

const sellerReviewsCache: SellerReview[] = buildSellerReviews()

function summarize(list: SellerReview[]): SellerReviewSummary {
  const total = list.length
  const sum = list.reduce((acc, r) => acc + r.rating, 0)
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0
  const distribution: SellerReviewDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  list.forEach(r => {
    distribution[ratingKey(r.rating)] += 1
  })
  // Deterministic "previous period" average derived from the current one.
  const previousAverage = Math.round((average - 0.2) * 10) / 10
  const trendPct =
    previousAverage > 0
      ? Math.round(((average - previousAverage) / previousAverage) * 1000) / 10
      : 0
  return { average, total, distribution, trendPct, previousAverage }
}

function ratingKey(r: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(r))) as 1 | 2 | 3 | 4 | 5
}

function countByStatus(list: SellerReview[]): SellerReviewCounts {
  return {
    all: list.length,
    needs_response: list.filter(r => !r.response && !r.flagged).length,
    responded: list.filter(r => !!r.response).length,
    flagged: list.filter(r => !!r.flagged).length,
  }
}

export async function getSellerReviews(
  filter: SellerReviewFilter = {},
): Promise<SellerReviewResult> {
  await randomDelay(200, 500)

  const full = sellerReviewsCache
  const counts = countByStatus(full)
  const summary = summarize(full)

  let list = [...full]

  const status = filter.status ?? 'all'
  if (status === 'needs_response') list = list.filter(r => !r.response && !r.flagged)
  else if (status === 'responded') list = list.filter(r => !!r.response)
  else if (status === 'flagged') list = list.filter(r => !!r.flagged)

  if (filter.rating && filter.rating !== 'all') {
    list = list.filter(r => r.rating === filter.rating)
  }

  const hasResponse = filter.hasResponse ?? 'all'
  if (hasResponse === 'with') list = list.filter(r => !!r.response)
  else if (hasResponse === 'without') list = list.filter(r => !r.response)

  if (filter.hasPhotos) list = list.filter(r => !!r.photos && r.photos.length > 0)

  if (filter.productId) list = list.filter(r => r.productId === filter.productId)

  switch (filter.sort) {
    case 'oldest':
      list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      break
    case 'lowest':
      list.sort((a, b) => a.rating - b.rating || +new Date(a.createdAt) - +new Date(b.createdAt))
      break
    case 'highest':
      list.sort((a, b) => b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt))
      break
    case 'newest':
    default:
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      break
  }

  return { items: list, total: list.length, counts, summary }
}

export async function respondToSellerReview(
  reviewId: string,
  text: string,
): Promise<{ success: boolean; review?: SellerReview }> {
  await randomDelay(300, 700)
  const review = sellerReviewsCache.find(r => r.id === reviewId)
  if (!review) return { success: false }
  review.response = { text, at: new Date().toISOString() }
  review.flagged = false
  return { success: true, review }
}

export async function toggleSellerReviewFlag(
  reviewId: string,
): Promise<{ success: boolean; review?: SellerReview }> {
  await randomDelay(150, 350)
  const review = sellerReviewsCache.find(r => r.id === reviewId)
  if (!review) return { success: false }
  review.flagged = !review.flagged
  return { success: true, review }
}
