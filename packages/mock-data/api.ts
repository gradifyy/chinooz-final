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
  Coupon,
  CouponType,
  CancelReason,
  ReturnRequest,
  ReturnResolution,
  RefundMethod,
  OrderInvoice,
  SellerProduct,
  SellerProductStatus,
  SellerInventoryProduct,
  SellerInventoryVariant,
  StockStatus,
  StockEditReason,
  StockEditMode,
  StockHistoryEntry,
  BulkStockOperation,
  BulkStockResult,
  CsvStockRow,
  StockAlert,
  StockAlertSummary,
  SellerReview,
  SellerReviewResponse,
  ReviewFlagReason,
  ReviewModerationStatus,
  ProductQuestion,
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
      p =>
        p.categoryId === params.categoryId ||
        categories.some(
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

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  await randomDelay(150, 400)
  if (!ids.length) return []
  return products.filter(p => ids.includes(p.id))
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

// --- Product Q&A ---

const productQuestions: ProductQuestion[] = [
  {
    id: 'q-seed-1',
    productId: 'prod-1',
    body: 'Is this product covered by warranty?',
    author: 'Sita R.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    answers: [
      {
        id: 'a-seed-1',
        body: 'Yes, it comes with a 1-year seller warranty.',
        author: 'Seller',
        isSeller: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        helpful: 3,
      },
    ],
  },
  {
    id: 'q-seed-2',
    productId: 'prod-1',
    body: 'Does it support delivery outside Kathmandu valley?',
    author: 'Bikash T.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    answers: [],
  },
]

export async function getProductQuestions(productId: string): Promise<ProductQuestion[]> {
  await randomDelay(200, 500)
  return productQuestions
    .filter(q => q.productId === productId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export async function askProductQuestion(data: {
  productId: string
  body: string
}): Promise<{ success: boolean; question: ProductQuestion }> {
  await randomDelay(400, 800)
  const question: ProductQuestion = {
    id: `q-${Date.now()}`,
    productId: data.productId,
    body: data.body.trim(),
    author: 'You',
    createdAt: new Date().toISOString(),
    answers: [],
  }
  productQuestions.push(question)
  return { success: true, question }
}

export async function submitReview(data: {
  productId: string
  rating: number
  title?: string
  body: string
  photos?: string[]
  videos?: string[]
  verifiedPurchase?: boolean
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
    videos: data.videos,
    createdAt: new Date().toISOString(),
    helpful: 0,
    // Reviews written from the buyer's purchased-product flow are verified by
    // default; callers can override (e.g. an unverified standalone review).
    verifiedPurchase: data.verifiedPurchase ?? true,
  }
  reviews.push(newReview)
  return { success: true, review: newReview }
}

// Tracks which reviews the current user has marked helpful (mock session state).
const helpfulVotes = new Set<string>()

/**
 * Toggle a "helpful" vote on a review. Idempotent per session: voting again
 * removes the vote. Returns the new count and whether the user's vote is active.
 */
export async function voteHelpful(reviewId: string): Promise<{
  success: boolean
  helpful: number
  voted: boolean
  error?: string
}> {
  await randomDelay(150, 350)
  const review = reviews.find(r => r.id === reviewId)
  if (!review) return { success: false, helpful: 0, voted: false, error: 'Review not found' }
  const alreadyVoted = helpfulVotes.has(reviewId)
  if (alreadyVoted) {
    helpfulVotes.delete(reviewId)
    review.helpful = Math.max(0, review.helpful - 1)
  } else {
    helpfulVotes.add(reviewId)
    review.helpful += 1
  }
  return { success: true, helpful: review.helpful, voted: !alreadyVoted }
}

/** Review IDs the current user has marked helpful (for initial UI state). */
export async function getHelpfulVotes(): Promise<string[]> {
  return Array.from(helpfulVotes)
}

export async function getOrders(params?: { status?: string; search?: string }): Promise<Order[]> {
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
        o.id.toLowerCase().includes(q) || o.items.some(item => item.name.toLowerCase().includes(q)),
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

/** Filters applied server-side for faceted search. */
export interface SearchFilterInput {
  inStock?: boolean
  onSale?: boolean
  minRating?: number
  brands?: string[]
  priceMin?: number
  priceMax?: number
}

export type SearchSortKey = 'relevance' | 'priceLow' | 'priceHigh' | 'rating' | 'newest' | 'popular'

/**
 * Server-side faceted + paginated search. Filtering and sorting are applied on
 * the server (here, the mock catalog) before the page slice is returned, so the
 * client renders progressively via infinite scroll instead of fetching every
 * match and filtering in-memory.
 */
export async function searchProductsFaceted(
  query: string,
  filters: SearchFilterInput = {},
  sort: SearchSortKey = 'relevance',
  params?: { limit?: number; offset?: number },
): Promise<{ items: Product[]; total: number }> {
  await randomDelay(250, 600)
  const q = norm(query)
  let list = products.filter(
    p =>
      norm(p.name).includes(q) ||
      norm(p.description).includes(q) ||
      p.tags.some(t => norm(t).includes(q)),
  )

  if (filters.inStock) list = list.filter(p => p.stock !== 'out_of_stock')
  if (filters.onSale) list = list.filter(p => !!p.compareAtPrice && p.compareAtPrice > p.price)
  if (filters.minRating && filters.minRating > 0)
    list = list.filter(p => p.rating >= filters.minRating!)
  if (filters.brands && filters.brands.length > 0)
    list = list.filter(p => filters.brands!.includes(p.sellerName))
  if (filters.priceMin != null) list = list.filter(p => p.price >= filters.priceMin!)
  if (filters.priceMax != null) list = list.filter(p => p.price <= filters.priceMax!)

  switch (sort) {
    case 'priceLow':
      list.sort((a, b) => a.price - b.price)
      break
    case 'priceHigh':
      list.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      list.sort((a, b) => b.rating - a.rating)
      break
    case 'newest':
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      break
    case 'popular':
      list.sort((a, b) => b.reviewCount - a.reviewCount)
      break
    case 'relevance':
    default:
      break
  }

  const offset = params?.offset ?? 0
  const limit = params?.limit ?? 12
  return { items: list.slice(offset, offset + limit), total: list.length }
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

export async function getSimilarProducts(
  categoryId: string,
  excludeId?: string,
): Promise<Product[]> {
  await randomDelay(200, 500)
  return products.filter(p => p.categoryId === categoryId && p.id !== excludeId).slice(0, 10)
}

/**
 * "Frequently bought together" — the anchor product plus a couple of
 * complementary items (same category, then catalog fallback). Used to build a
 * bundle add-to-cart on the PDP and cart.
 */
export async function getFrequentlyBoughtTogether(
  productId: string,
): Promise<{ anchor: Product; companions: Product[] } | null> {
  await randomDelay(200, 500)
  const anchor = products.find(p => p.id === productId)
  if (!anchor) return null
  const sameCategory = products.filter(
    p => p.id !== productId && p.categoryId === anchor.categoryId && p.stock !== 'out_of_stock',
  )
  const fallback = products.filter(
    p => p.id !== productId && p.categoryId !== anchor.categoryId && p.stock !== 'out_of_stock',
  )
  const companions = [...sameCategory, ...fallback].slice(0, 2)
  return { anchor, companions }
}

/** Buyer-visible seller profile derived from the seller's catalog. */
export interface BuyerSellerProfile {
  id: string
  name: string
  productCount: number
  rating: number
  reviewCount: number
}

/**
 * Buyer-facing seller storefront: a lightweight public profile plus the
 * seller's products. Backs the clickable seller row on the PDP (previously a
 * no-op) and the `/seller/[id]` storefront page.
 */
export async function getSellerStorefront(
  sellerId: string,
): Promise<{ seller: BuyerSellerProfile; products: Product[] } | null> {
  await randomDelay(200, 500)
  const sellerProducts = products.filter(p => p.sellerId === sellerId)
  if (sellerProducts.length === 0) return null
  const reviewCount = sellerProducts.reduce((s, p) => s + p.reviewCount, 0)
  const ratingSum = sellerProducts.reduce((s, p) => s + p.rating, 0)
  return {
    seller: {
      id: sellerId,
      name: sellerProducts[0].sellerName,
      productCount: sellerProducts.length,
      rating: ratingSum / sellerProducts.length,
      reviewCount,
    },
    products: sellerProducts,
  }
}

// --- Promo / Voucher ---

/**
 * Single source of truth for buyer-facing coupons. The codes surfaced on the
 * Deals screen (CHINOOZ10 / FREESHIP / FLASH20) all resolve here, so a code the
 * buyer copies actually applies at checkout.
 */
export const PROMO_CODES: Record<string, Coupon> = {
  CHINOOZ10: {
    code: 'CHINOOZ10',
    type: 'percentage',
    discount: 10,
    maxDiscount: 1000,
    description: '10% off (up to NPR 1,000)',
  },
  WELCOME15: {
    code: 'WELCOME15',
    type: 'percentage',
    discount: 15,
    maxDiscount: 1500,
    description: '15% off your first order',
  },
  FLASH20: {
    code: 'FLASH20',
    type: 'percentage',
    discount: 20,
    minOrder: 1500,
    maxDiscount: 2000,
    description: '20% off flash deals (min NPR 1,500)',
  },
  FLAT500: {
    code: 'FLAT500',
    type: 'fixed',
    discount: 500,
    minOrder: 2500,
    description: 'NPR 500 off orders over NPR 2,500',
  },
  FREESHIP: {
    code: 'FREESHIP',
    type: 'free_shipping',
    discount: 0,
    minOrder: 1000,
    description: 'Free shipping on orders over NPR 1,000',
  },
}

export interface ApplyPromoResult {
  success: boolean
  code?: string
  discount?: number
  type?: CouponType
  minOrder?: number
  maxDiscount?: number
  description?: string
  error?: string
}

/**
 * Validate a promo code against the catalog and (optionally) the current
 * subtotal. Passing `subtotal` lets us reject min-order codes up front with a
 * clear message instead of silently applying a zero discount.
 */
export async function applyPromoCode(code: string, subtotal?: number): Promise<ApplyPromoResult> {
  await randomDelay(300, 600)
  const upper = code.toUpperCase().trim()
  const promo = PROMO_CODES[upper]
  if (!promo) {
    return { success: false, error: 'Invalid code. Please try again.' }
  }
  if (promo.minOrder != null && subtotal != null && subtotal < promo.minOrder) {
    return {
      success: false,
      error: `Add NPR ${(promo.minOrder - subtotal).toLocaleString()} more to use ${upper}.`,
    }
  }
  return {
    success: true,
    code: promo.code,
    discount: promo.discount,
    type: promo.type,
    minOrder: promo.minOrder,
    maxDiscount: promo.maxDiscount,
    description: promo.description,
  }
}

// --- Rider account lookup (RO3 branching) ---

/**
 * Mock rider account state for a verified phone number.
 *
 * Branching contract (same as buyer/seller auth boundary):
 * - "new":      no rider account for this phone → onboarding stepper (RO3).
 * - "approved": existing approved rider → Home / jobs board.
 * - "pending":  existing rider awaiting approval → pending state (RO6).
 *
 * Deterministic by phone suffix so the three branches are exercisable:
 * - 0: new rider, -1: approved, -2: pending.
 */
export type RiderAccountState = 'new' | 'approved' | 'pending'

const APPROVED_RIDER_PHONES = new Set<string>(['9800000001', '9700000002'])
const PENDING_RIDER_PHONES = new Set<string>(['9800000003', '9700000004'])

export async function lookupRiderAccount(
  phone: string,
): Promise<{ state: RiderAccountState; riderId?: string; name?: string }> {
  await randomDelay(300, 700)
  if (APPROVED_RIDER_PHONES.has(phone)) {
    return { state: 'approved', riderId: 'rider-1', name: 'Chinooz Rider' }
  }
  if (PENDING_RIDER_PHONES.has(phone)) {
    return { state: 'pending', riderId: 'rider-pending' }
  }
  return { state: 'new' }
}

// --- Rider onboarding submission / approval mock ---

export type RiderSubmissionState = 'pending' | 'approved' | 'rejected'

export interface RiderVerificationItem {
  key: string
  labelKey: string
  status: 'pending' | 'verified' | 'rejected'
  rejectionReasonKey?: string
}

export interface RiderApprovalResult {
  state: RiderSubmissionState
  items: RiderVerificationItem[]
  estimatedTimeHours: number
  rejectionReasonKey?: string
}

export async function submitRiderOnboarding(
  _data: Record<string, unknown>,
): Promise<{ success: boolean; submissionId: string }> {
  await randomDelay(500, 1000)
  void _data
  return { success: true, submissionId: 'sub-' + Date.now() }
}

export async function checkRiderApproval(_riderId: string): Promise<RiderApprovalResult> {
  await randomDelay(300, 600)
  void _riderId
  return {
    state: 'pending',
    estimatedTimeHours: 24,
    items: [
      { key: 'identity', labelKey: 'rider.pending.itemIdentity', status: 'verified' },
      { key: 'license', labelKey: 'rider.pending.itemLicense', status: 'pending' },
      { key: 'vehicle', labelKey: 'rider.pending.itemVehicle', status: 'pending' },
      { key: 'selfie', labelKey: 'rider.pending.itemSelfie', status: 'verified' },
    ],
  }
}

export interface GoOnlineCheckItem {
  key: string
  labelKey: string
  completed: boolean
  actionRoute?: string
}

export interface GoOnlineChecklist {
  allComplete: boolean
  items: GoOnlineCheckItem[]
}

export async function getGoOnlineChecklist(_riderId: string): Promise<GoOnlineChecklist> {
  await randomDelay(200, 400)
  void _riderId
  return {
    allComplete: false,
    items: [
      { key: 'profile', labelKey: 'rider.goOnline.itemProfile', completed: true },
      { key: 'docs', labelKey: 'rider.goOnline.itemDocs', completed: true },
      {
        key: 'payout',
        labelKey: 'rider.goOnline.itemPayout',
        completed: false,
        actionRoute: '/payout-methods',
      },
      { key: 'vehicle', labelKey: 'rider.goOnline.itemVehicle', completed: true },
    ],
  }
}

// --- Shipping Config ---
// Re-exported from @chinooz/utils/cartTotals for single-source-of-truth.
// Components should import SHIPPING_CONFIG from @chinooz/utils instead.

export { SHIPPING_CONFIG } from '@chinooz/utils'

// --- Place Order ---

export interface PlaceOrderInput {
  items: {
    id?: string
    productId: string
    variantId?: string
    name: string
    image?: string
    price: number
    quantity: number
    maxQuantity?: number
  }[]
  address: {
    fullName: string
    phone: string
    street: string
    area: string
    city: string
    label?: string
  }
  deliveryMethod: 'sameDay' | 'express' | 'scheduled' | 'standard'
  paymentMethod: 'cod' | 'esewa' | 'khalti'
  /** Applied coupon code, if any (for the order record / audit). */
  couponCode?: string
  /** Discount amount (NPR) applied to this order. */
  discount?: number
  /** Items subtotal (NPR). If omitted, computed from items. */
  subtotal?: number
  /** Delivery fee (NPR) for this order. */
  deliveryFee?: number
  /** Grand total (NPR) the buyer reviewed. If omitted, it is computed from items − discount. */
  total?: number
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

  // Persist the order so it appears in My Orders, the order detail screen,
  // and Track Order (previously placeOrder returned an id but saved nothing).
  const now = new Date().toISOString()
  const orderId = `ORD-${Date.now()}`
  const etaDays =
    input.deliveryMethod === 'sameDay' ? 0 : input.deliveryMethod === 'express' ? 1 : 3
  const subtotal = input.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const deliveryFee = input.deliveryFee ?? 0
  const discount = input.discount ?? 0
  const total = input.total ?? Math.max(0, subtotal + deliveryFee - discount)
  const newOrder: Order = {
    id: orderId,
    items: input.items.map((i, idx) => ({
      id: i.id ?? `ci-${Date.now()}-${idx}`,
      productId: i.productId,
      variantId: i.variantId,
      name: i.name,
      image: i.image ?? '',
      price: i.price,
      quantity: i.quantity,
      maxQuantity: i.maxQuantity ?? 10,
    })),
    total,
    subtotal: input.subtotal ?? subtotal,
    deliveryFee,
    discount,
    currency: 'NPR',
    status: 'pending',
    timeline: [{ status: 'pending', timestamp: now }],
    address: {
      id: `addr-${Date.now()}`,
      label: input.address.label ?? 'home',
      fullName: input.address.fullName,
      phone: input.address.phone,
      line1: input.address.street,
      line2: input.address.area,
      city: input.address.city,
      district: input.address.city,
      province: 'Bagmati',
      isDefault: false,
    },
    createdAt: now,
    estimatedDelivery: new Date(Date.now() + etaDays * 24 * 60 * 60 * 1000).toISOString(),
  }
  orders.unshift(newOrder)

  return { success: true, orderId }
}

export async function getTrendingProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8)
}

export async function getNewestProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
}

export async function getNearbyProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort(() => Math.random() - 0.5).slice(0, 8)
}

// --- Auth ---

export const __DEV_OTP__ = '123456'
export const __IS_DEV__ = process.env.NODE_ENV !== 'production'

const otpStore = new Map<string, { sentAt: number; code: string }>()

export async function requestOtp(
  phone: string,
): Promise<{ success: boolean; message: string; alreadySent?: boolean }> {
  await randomDelay(600, 1200)
  const existing = otpStore.get(phone)
  if (existing && Date.now() - existing.sentAt < 60_000) {
    return { success: true, message: 'Code already sent — check your messages', alreadySent: true }
  }
  otpStore.set(phone, { sentAt: Date.now(), code: __DEV_OTP__ })
  return { success: true, message: 'OTP sent' }
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  await randomDelay(400, 800)
  const entry = otpStore.get(phone)
  // The static dev code only logs in when actually running in dev. In any other
  // environment the user must supply the code that requestOtp issued for this phone,
  // so 123456 is no longer a standalone backdoor into user-1.
  const devMatch = __IS_DEV__ && code === __DEV_OTP__
  const storedMatch = !!entry && entry.code === code
  if (devMatch || storedMatch) {
    if (entry) otpStore.delete(phone)
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
  if (
    order.status === 'shipped' ||
    order.status === 'delivered' ||
    order.status === 'cancelled' ||
    order.status === 'returned'
  ) {
    return { success: false, error: 'Order cannot be cancelled at this stage' }
  }
  order.status = 'cancelled'
  order.timeline.push({
    status: 'cancelled',
    timestamp: new Date().toISOString(),
    note: reasonDetail || `Reason: ${reason}`,
  })
  return { success: true, order: { ...order } }
}

export async function requestReturn(
  orderId: string,
  itemIds: string[],
  reason: CancelReason,
  reasonDetail?: string,
  extra?: {
    resolution?: ReturnResolution
    refundMethod?: RefundMethod
    photoUrls?: string[]
    pickupDate?: string
    pickupSlot?: string
  },
): Promise<{ success: boolean; returnRequest?: ReturnRequest; error?: string }> {
  await randomDelay(500, 1000)
  const order = orders.find(o => o.id === orderId)
  if (!order) return { success: false, error: 'Order not found' }
  if (order.status !== 'delivered')
    return { success: false, error: 'Only delivered orders can be returned' }
  if (itemIds.length === 0) return { success: false, error: 'Select at least one item' }
  const returnRequest: ReturnRequest = {
    orderId,
    itemIds,
    reason,
    reasonDetail,
    resolution: extra?.resolution ?? 'refund',
    refundMethod: extra?.refundMethod,
    photoUrls: extra?.photoUrls,
    pickupDate: extra?.pickupDate,
    pickupSlot: extra?.pickupSlot,
    status: 'requested',
    createdAt: new Date().toISOString(),
  }
  const noteParts = [`Return requested: ${reason}`]
  if (extra?.resolution) noteParts.push(`resolution: ${extra.resolution}`)
  order.status = 'returned'
  order.timeline.push({
    status: 'returned',
    timestamp: new Date().toISOString(),
    note: noteParts.join(' · '),
  })
  return { success: true, returnRequest }
}

export async function reorder(
  orderId: string,
): Promise<{ success: boolean; items?: CartItem[]; error?: string }> {
  await randomDelay(300, 600)
  const order = orders.find(o => o.id === orderId)
  if (!order) return { success: false, error: 'Order not found' }
  return { success: true, items: [...order.items] }
}

export async function getOrderInvoice(orderId: string): Promise<OrderInvoice | null> {
  await randomDelay(200, 500)
  const order = orders.find(o => o.id === orderId)
  if (!order) return null
  const subtotal =
    order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vat = Math.round((subtotal * 0.13) / 1.13)
  const deliveryFee = order.deliveryFee ?? (order.total > subtotal ? order.total - subtotal : 0)
  const discount =
    order.discount ??
    (subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0)
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

// --- Feedback ---

export interface FeedbackInput {
  subject: string
  /** Category key from the form (e.g. 'categoryBug' | 'categoryFeature' | …). */
  category: string
  message: string
  /** Optional screenshot/attachment: a data URL on web, a file URI on native. */
  screenshotUri?: string
}

export interface FeedbackRecord extends FeedbackInput {
  id: string
  createdAt: string
}

const feedbackSubmissions: FeedbackRecord[] = []

/**
 * Submit buyer feedback. Mirrors `placeOrder`: validates, simulates latency, and
 * records the submission in an in-memory store so the flow is wired end-to-end for
 * a future backend (previously the form faked success with a setTimeout and sent
 * nothing).
 */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  await randomDelay(400, 900)
  if (!input.subject.trim() || input.message.trim().length < 10) {
    return { success: false, error: 'Please complete the form before submitting.' }
  }
  const record: FeedbackRecord = {
    ...input,
    id: `fb-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  feedbackSubmissions.push(record)
  return { success: true, id: record.id }
}

export async function getFeedbackSubmissions(): Promise<FeedbackRecord[]> {
  await randomDelay(100, 200)
  return feedbackSubmissions
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

export async function getSellerProducts(
  filter: SellerProductFilter = {},
): Promise<SellerProductResult> {
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
    const stock: StockStatus = variants.every(v => v.stock === 'out_of_stock')
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
  const allVariants = inventoryCache.flatMap(p => p.variants)
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
    list = list.map(p => (p.name.toLowerCase().includes(q!) ? { ...p, variants: p.variants } : p))
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

export type { SellerReview, SellerReviewResponse } from '@chinooz/types'

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
  {
    rating: 5,
    title: 'Best purchase this year',
    body: 'Exceeded my expectations. Quality is top-notch and delivery was fast.',
  },
  {
    rating: 5,
    title: 'Highly recommend',
    body: 'Authentic and well-made. Will buy again from this store.',
  },
  { rating: 5, body: 'Loved it. Exactly as described. Five stars.' },
  {
    rating: 4,
    title: 'Great value',
    body: 'Really good product. Minor packaging issue but the item itself is perfect.',
  },
  {
    rating: 4,
    body: 'Works well and feels durable. A few scratches on arrival but nothing serious.',
  },
  {
    rating: 3,
    title: 'It’s okay',
    body: 'Does the job but the finish could be better. Expected more at this price.',
  },
  { rating: 3, body: 'Average. Nothing special but not bad either.' },
  {
    rating: 2,
    title: 'Disappointing',
    body: 'Item arrived later than promised and the color was off.',
  },
  {
    rating: 1,
    title: 'Not happy',
    body: 'Product stopped working after two days. Requesting a replacement.',
  },
]

const REVIEW_NAMES = [
  'Suman Shrestha',
  'Anita Gurung',
  'Ram Bahadur Thapa',
  'Priya Maharjan',
  'Karma Lama',
  'Deepa Tamang',
  'Rajesh Shrestha',
  'Sita Rai',
  'Bishal Thapa',
  'Anjali K.C.',
  'Rohan Tamang',
  'Kiran Rai',
  'Maya Gurung',
  'Niraj Limbu',
  'Pooja Bhandari',
  'Sandeep Koirala',
  'Rita Shrestha',
  'Aman Maharjan',
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
      const rating = roll < 0.6 ? 5 : roll < 0.82 ? 4 : roll < 0.92 ? 3 : roll < 0.97 ? 2 : 1
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
      const response: SellerReviewResponse | undefined = responded
        ? {
            text: 'Thank you for your review! We’re glad you’re happy with your purchase. 🙏',
            at: new Date(now - (ageDays - 1) * day).toISOString(),
          }
        : undefined
      // 90% of reviews are verified purchases.
      const verifiedPurchase = seededReview(s + 61) < 0.9

      // Seed moderation status for flagged reviews: mostly pending, some dismissed.
      const flagReason: ReviewFlagReason | undefined = flagged
        ? (['spam', 'abusive', 'fake', 'off_topic'][
            Math.floor(seededReview(s + 71) * 4)
          ] as ReviewFlagReason)
        : undefined
      const moderationStatus: ReviewModerationStatus | undefined = flagged
        ? seededReview(s + 81) < 0.8
          ? 'pending'
          : 'dismissed'
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
        flagReason,
        moderationStatus,
        verifiedPurchase,
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

export async function editSellerReviewResponse(
  reviewId: string,
  text: string,
): Promise<{ success: boolean; review?: SellerReview }> {
  await randomDelay(300, 700)
  const review = sellerReviewsCache.find(r => r.id === reviewId)
  if (!review || !review.response) return { success: false }
  review.response = { text, at: new Date().toISOString() }
  return { success: true, review }
}

export async function deleteSellerReviewResponse(
  reviewId: string,
): Promise<{ success: boolean; review?: SellerReview }> {
  await randomDelay(200, 500)
  const review = sellerReviewsCache.find(r => r.id === reviewId)
  if (!review) return { success: false }
  review.response = undefined
  return { success: true, review }
}

export async function flagSellerReview(
  reviewId: string,
  reason: ReviewFlagReason,
): Promise<{ success: boolean; review?: SellerReview }> {
  await randomDelay(200, 500)
  const review = sellerReviewsCache.find(r => r.id === reviewId)
  if (!review) return { success: false }
  review.flagged = true
  review.flagReason = reason
  review.moderationStatus = 'pending'
  return { success: true, review }
}

export async function unflagSellerReview(
  reviewId: string,
): Promise<{ success: boolean; review?: SellerReview }> {
  await randomDelay(150, 350)
  const review = sellerReviewsCache.find(r => r.id === reviewId)
  if (!review) return { success: false }
  review.flagged = false
  review.flagReason = undefined
  review.moderationStatus = undefined
  return { success: true, review }
}

export type BulkReviewAction = 'mark_responded_not_needed' | 'flag'

export async function bulkUpdateSellerReviews(
  reviewIds: string[],
  action: BulkReviewAction,
  reason?: ReviewFlagReason,
): Promise<{ success: boolean; updated: SellerReview[] }> {
  await randomDelay(300, 600)
  const updated: SellerReview[] = []
  for (const id of reviewIds) {
    const review = sellerReviewsCache.find(r => r.id === id)
    if (!review) continue
    if (action === 'mark_responded_not_needed') {
      review.flagged = false
    } else if (action === 'flag') {
      review.flagged = true
      review.flagReason = reason ?? 'spam'
      review.moderationStatus = 'pending'
    }
    updated.push(review)
  }
  return { success: true, updated }
}

// --- Stock editing (SI5/SS3) ---

const stockHistoryStore: StockHistoryEntry[] = []

function findVariantInCache(variantId: string): SellerInventoryVariant | undefined {
  for (const p of inventoryCache) {
    const v = p.variants.find(vv => vv.id === variantId)
    if (v) return v
  }
  return undefined
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function recalcProductAggregates(productId: string): void {
  const p = inventoryCache.find(pp => pp.id === productId)
  if (!p) return
  p.aggregateStock = p.variants.reduce((s, v) => s + v.stockCount, 0)
  p.stock = p.variants.every(v => v.stock === 'out_of_stock')
    ? 'out_of_stock'
    : p.variants.some(v => v.stock === 'low_stock' || v.stock === 'out_of_stock')
      ? 'low_stock'
      : 'in_stock'
}

export interface UpdateStockInput {
  variantId: string
  newStock: number
  mode: StockEditMode
  reason: StockEditReason
  note?: string
}

/** Synchronous record — used by sellerApi.updateStock to log history. */
export function recordStockHistoryEntry(
  variantId: string,
  mode: StockEditMode,
  reason: StockEditReason,
  note: string | undefined,
  newStock: number,
): StockHistoryEntry | undefined {
  const variant = findVariantInCache(variantId)
  const previous = variant?.stockCount ?? 0
  const entry: StockHistoryEntry = {
    id: `she-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variantId,
    sku: variant?.sku ?? '',
    previousStock: previous,
    newStock,
    delta: newStock - previous,
    mode,
    reason,
    note,
    createdAt: new Date().toISOString(),
  }
  stockHistoryStore.unshift(entry)
  return entry
}

export async function getStockHistory(
  variantId?: string,
  limit = 50,
): Promise<StockHistoryEntry[]> {
  await randomDelay(100, 250)
  const list = variantId
    ? stockHistoryStore.filter(e => e.variantId === variantId)
    : stockHistoryStore
  return list.slice(0, limit)
}

// --- Bulk stock updates (SI4/SS3) ---

export async function bulkUpdateStock(op: BulkStockOperation): Promise<BulkStockResult> {
  await randomDelay(400, 900)
  let updated = 0
  let failed = 0

  for (const variantId of op.variantIds) {
    const variant = findVariantInCache(variantId)
    if (!variant) {
      failed++
      continue
    }

    const previous = variant.stockCount
    let newStock = previous

    switch (op.action) {
      case 'set':
        newStock = Math.max(0, op.value ?? 0)
        break
      case 'adjust':
        newStock = Math.max(0, previous + (op.value ?? 0))
        break
      case 'threshold':
        variant.lowStockThreshold = Math.max(0, op.value ?? 0)
        break
      case 'mark_out':
        newStock = 0
        break
    }

    if (op.action !== 'threshold') {
      variant.stockCount = newStock
      variant.stock = stockStatusFor(newStock)
    }
    recalcProductAggregates(variant.productId)

    recordStockHistoryEntry(
      variantId,
      op.action === 'adjust' ? 'adjust' : 'set',
      op.reason ?? 'restock',
      undefined,
      newStock,
    )
    updated++
  }

  return { success: true, updated, failed }
}

export async function exportStockCsv(): Promise<string> {
  await randomDelay(200, 500)
  const rows: string[] = ['SKU,StockCount,LowStockThreshold']
  for (const p of inventoryCache) {
    for (const v of p.variants) {
      rows.push(`${v.sku},${v.stockCount},${v.lowStockThreshold ?? LOW_STOCK_THRESHOLD}`)
    }
  }
  return rows.join('\n')
}

export async function importStockCsv(rows: CsvStockRow[]): Promise<BulkStockResult> {
  await randomDelay(400, 800)
  let updated = 0
  let failed = 0
  for (const row of rows) {
    const variant = inventoryCache.flatMap(p => p.variants).find(v => v.sku === row.sku)
    if (!variant) {
      failed++
      continue
    }
    const previous = variant.stockCount
    variant.stockCount = Math.max(0, row.stockCount)
    variant.stock = stockStatusFor(variant.stockCount)
    if (row.lowStockThreshold != null) variant.lowStockThreshold = row.lowStockThreshold
    recalcProductAggregates(variant.productId)
    recordStockHistoryEntry(variant.id, 'set', 'correction', undefined, variant.stockCount)
    updated++
  }
  return { success: true, updated, failed }
}

// --- Low-stock alerts + threshold editing + restock reminders (SI5) ---

export async function getLowStockAlerts(): Promise<StockAlertSummary> {
  await randomDelay(150, 350)
  const low: StockAlert[] = []
  const out: StockAlert[] = []
  for (const p of inventoryCache) {
    for (const v of p.variants) {
      const threshold = v.lowStockThreshold ?? LOW_STOCK_THRESHOLD
      const alert: StockAlert = {
        variantId: v.id,
        productId: p.id,
        productName: p.name,
        variantName: v.name,
        sku: v.sku,
        image: v.image,
        stockCount: v.stockCount,
        lowStockThreshold: threshold,
        status: v.stock,
      }
      if (v.stock === 'out_of_stock') out.push(alert)
      else if (v.stock === 'low_stock') low.push(alert)
    }
  }
  return { low, out, lowCount: low.length, outCount: out.length, total: low.length + out.length }
}

export async function updateThreshold(
  variantId: string,
  threshold: number,
): Promise<{ success: boolean; variant?: SellerInventoryVariant }> {
  await randomDelay(150, 350)
  const variant = findVariantInCache(variantId)
  if (!variant) return { success: false }
  variant.lowStockThreshold = Math.max(0, threshold)
  variant.stock = stockStatusFor(variant.stockCount)
  recalcProductAggregates(variant.productId)
  return { success: true, variant }
}

export async function setRestockReminder(
  variantId: string,
  enabled: boolean,
): Promise<{ success: boolean; variant?: SellerInventoryVariant }> {
  await randomDelay(100, 250)
  const variant = findVariantInCache(variantId)
  if (!variant) return { success: false }
  variant.restockReminder = enabled
  return { success: true, variant }
}

// Seed some initial stock history for demo realism
function seedStockHistory(): void {
  if (stockHistoryStore.length > 0) return
  const reasons: StockEditReason[] = ['restock', 'correction', 'damage', 'loss']
  for (const p of inventoryCache.slice(0, 6)) {
    for (const v of p.variants.slice(0, 2)) {
      for (let i = 0; i < 3; i++) {
        const delta = Math.floor(Math.random() * 40) - 10
        const prev = v.stockCount - delta
        stockHistoryStore.push({
          id: `she-seed-${v.id}-${i}`,
          variantId: v.id,
          sku: v.sku,
          previousStock: Math.max(0, prev),
          newStock: v.stockCount,
          delta,
          mode: delta > 0 ? 'set' : 'adjust',
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          createdAt: new Date(
            Date.now() - (i + 1) * 86400000 * (Math.floor(Math.random() * 5) + 1),
          ).toISOString(),
        })
      }
    }
  }
  stockHistoryStore.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}
seedStockHistory()
