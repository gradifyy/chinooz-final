/**
 * Buyer API contract — the interface that both the mock adapter and the real
 * HTTP adapter implement. This is the single boundary that `@chinooz/hooks`
 * and server pages consume.
 *
 * When a real backend is ready, swap the mock adapter for the HTTP adapter
 * behind the `USE_REAL_API` flag (or just change the default). No hook or
 * page needs to change.
 */

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
  ProductQuestion,
  OrderInvoice,
  ReturnRequest,
  Coupon,
} from '@chinooz/types'
import type { BuyerCoupon, ApplyPromoResult, PlaceOrderInput } from '@chinooz/mock-data'

export interface PaginatedResult<T> {
  items: T[]
  total: number
}

export interface SearchParams {
  query?: string
  categoryId?: string
  sort?: string
  limit?: number
  offset?: number
  priceMin?: number
  priceMax?: number
  minRating?: number
  brands?: string[]
  inStock?: boolean
  onSale?: boolean
}

export interface FacetedSearchParams extends SearchParams {
  facet?: string
}

export interface SubmitReviewData {
  productId: string
  rating: number
  title?: string
  body: string
  photos?: string[]
  videos?: string[]
}

export interface CancelOrderData {
  orderId: string
  reason: string
  detail?: string
}

export interface ReturnRequestData {
  orderId: string
  itemIds: string[]
  reason: string
  reasonDetail?: string
  resolution: string
  refundMethod?: string
  photos?: string[]
  pickupDate?: string
  pickupSlot?: string
}

export interface OtpResult {
  success: boolean
  userId?: string
  error?: string
}

export interface OtpRequestResult {
  success: boolean
  message: string
  alreadySent?: boolean
}

export interface FeedbackData {
  subject: string
  category: string
  message: string
  screenshotUri?: string
}

export interface FeedbackResult {
  success: boolean
  error?: string
}

export interface FbtResult {
  anchor: Product
  companions: Product[]
}

export interface SellerStorefrontResult {
  seller: {
    id: string
    name: string
    productCount: number
    rating: number
    reviewCount: number
  }
  products: Product[]
}

export interface BuyerApi {
  // Products
  getProducts(params?: { categoryId?: string; limit?: number; offset?: number }): Promise<PaginatedResult<Product>>
  getProductById(id: string): Promise<Product | null>
  getProductsByIds(ids: string[]): Promise<Product[]>
  getProductBySlug(slug: string): Promise<Product | null>
  getTrendingProducts(): Promise<Product[]>
  getNewestProducts(): Promise<Product[]>
  getNearbyProducts(): Promise<Product[]>
  getPopularProducts(): Promise<Product[]>
  getRecommendedProducts(userId?: string): Promise<Product[]>
  getSimilarProducts(categoryId: string, excludeId?: string): Promise<Product[]>
  getFrequentlyBoughtTogether(productId: string): Promise<FbtResult | null>

  // Categories
  getCategories(): Promise<Category[]>

  // Deals & Banners
  getDeals(): Promise<Deal[]>
  getBanners(): Promise<Banner[]>
  getCoupons(): Promise<BuyerCoupon[]>

  // Reviews & Q&A
  getReviews(productId: string): Promise<Review[]>
  submitReview(data: SubmitReviewData): Promise<{ success: boolean; review?: Review; error?: string }>
  voteHelpful(reviewId: string): Promise<{ success: boolean; helpful: number; voted: boolean; error?: string }>
  getHelpfulVotes(): Promise<string[]>
  getProductQuestions(productId: string): Promise<ProductQuestion[]>
  askProductQuestion(data: { productId: string; body: string }): Promise<{ success: boolean; question?: ProductQuestion }>

  // Search
  searchProducts(query: string): Promise<Product[]>
  searchProductsPaginated(params: SearchParams): Promise<PaginatedResult<Product>>
  searchProductsFaceted(params: FacetedSearchParams): Promise<PaginatedResult<Product>>
  searchCategories(query: string): Promise<Category[]>
  searchBrands(query: string): Promise<{ id: string; name: string }[]>

  // Orders
  getOrders(params?: { status?: string; limit?: number; offset?: number }): Promise<Order[]>
  getOrderById(id: string): Promise<Order | null>
  cancelOrder(data: CancelOrderData): Promise<{ success: boolean; error?: string }>
  requestReturn(data: ReturnRequestData): Promise<{ success: boolean; error?: string }>
  reorder(orderId: string): Promise<{ success: boolean; items?: CartItem[]; error?: string }>
  getOrderInvoice(orderId: string): Promise<OrderInvoice | null>
  getReturnRequests(orderId?: string): Promise<ReturnRequest[]>
  placeOrder(input: PlaceOrderInput): Promise<{ success: boolean; orderId?: string; error?: string }>

  // Notifications & Messages
  getNotifications(): Promise<Notification[]>
  getUnreadNotificationCount(): Promise<number>
  getUnreadMessageCount(): Promise<number>
  getAssistantUnreadCount(): Promise<number>
  markNotificationRead(id: string): Promise<void>
  markAllNotificationsRead(): Promise<void>
  deleteNotification(id: string): Promise<void>
  getConversations(): Promise<Conversation[]>
  getMessages(conversationId: string): Promise<Message[]>
  sendMessage(conversationId: string, body: string): Promise<Message>
  markConversationRead(conversationId: string): Promise<void>

  // User
  getUserProfile(): Promise<UserProfile>
  getCartItems(): Promise<CartItem[]>

  // Seller storefront
  getSellerStorefront(sellerId: string): Promise<SellerStorefrontResult | null>

  // Promo
  applyPromoCode(code: string, subtotal?: number): Promise<ApplyPromoResult>

  // Auth
  requestOtp(phone: string): Promise<OtpRequestResult>
  verifyOtp(phone: string, code: string): Promise<OtpResult>

  // Feedback
  submitFeedback(data: FeedbackData): Promise<FeedbackResult>
}
