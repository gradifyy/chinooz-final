/**
 * Mock adapter — wraps the existing `@chinooz/mock-data` functions behind the
 * `BuyerApi` interface so hooks and pages can swap to the real HTTP adapter
 * without any code changes.
 */

import * as mock from '@chinooz/mock-data'
import { buyerCoupons } from '@chinooz/mock-data'
import type { BuyerApi } from './types'

export function createMockApi(): BuyerApi {
  return {
    // Products
    getProducts: (params) => mock.getProducts(params),
    getProductById: (id) => mock.getProductById(id),
    getProductsByIds: (ids) => mock.getProductsByIds(ids),
    getProductBySlug: (slug) => mock.getProductBySlug(slug),
    getTrendingProducts: () => mock.getTrendingProducts(),
    getNewestProducts: () => mock.getNewestProducts(),
    getNearbyProducts: () => mock.getNearbyProducts(),
    getPopularProducts: () => mock.getPopularProducts(),
    getRecommendedProducts: (userId) => mock.getRecommendedProducts(userId),
    getSimilarProducts: (categoryId, excludeId) => mock.getSimilarProducts(categoryId, excludeId),
    getFrequentlyBoughtTogether: (productId) => mock.getFrequentlyBoughtTogether(productId),

    // Categories
    getCategories: () => mock.getCategories(),

    // Deals & Banners
    getDeals: () => mock.getDeals(),
    getBanners: () => mock.getBanners(),
    getCoupons: async () => buyerCoupons,

    // Reviews & Q&A
    getReviews: (productId) => mock.getReviews(productId),
    submitReview: (data) => mock.submitReview(data),
    voteHelpful: (reviewId) => mock.voteHelpful(reviewId),
    getHelpfulVotes: () => mock.getHelpfulVotes(),
    getProductQuestions: (productId) => mock.getProductQuestions(productId),
    askProductQuestion: (data) => mock.askProductQuestion(data),

    // Search
    searchProducts: (query) => mock.searchProducts(query),
    searchProductsPaginated: (params) => mock.searchProductsPaginated(params.query ?? '', { limit: params.limit, offset: params.offset }),
    searchProductsFaceted: (params) => mock.searchProductsFaceted(params.query ?? '', {
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      minRating: params.minRating,
      brands: params.brands,
      inStock: params.inStock,
      onSale: params.onSale,
    }, (params.sort as 'relevance' | 'priceLow' | 'priceHigh' | 'rating' | 'newest' | 'popular') ?? 'relevance', { limit: params.limit, offset: params.offset }),
    searchCategories: (query) => mock.searchCategories(query),
    searchBrands: (query) => mock.searchBrands(query),

    // Orders
    getOrders: (params) => mock.getOrders(params),
    getOrderById: (id) => mock.getOrderById(id),
    cancelOrder: (data) => mock.cancelOrder(data.orderId, data.reason as 'changed_mind' | 'cheaper_elsewhere' | 'ordered_by_mistake' | 'other', data.detail),
    requestReturn: (data) => mock.requestReturn(data.orderId, data.itemIds, data.reason as 'changed_mind' | 'cheaper_elsewhere' | 'ordered_by_mistake' | 'other', data.reasonDetail, {
      resolution: data.resolution as 'refund' | 'exchange' | 'repair',
      refundMethod: data.refundMethod as 'original' | 'wallet' | 'bank',
      photoUrls: data.photos,
      pickupDate: data.pickupDate,
      pickupSlot: data.pickupSlot,
    }),
    reorder: (orderId) => mock.reorder(orderId),
    getOrderInvoice: (orderId) => mock.getOrderInvoice(orderId),
    getReturnRequests: (orderId) => mock.getReturnRequests(orderId),
    placeOrder: (input) => mock.placeOrder(input),

    // Notifications & Messages
    getNotifications: () => mock.getNotifications(),
    getUnreadNotificationCount: () => mock.getUnreadNotificationCount(),
    getUnreadMessageCount: () => mock.getUnreadMessageCount(),
    getAssistantUnreadCount: () => mock.getAssistantUnreadCount(),
    markNotificationRead: (id) => mock.markNotificationRead(id),
    markAllNotificationsRead: () => mock.markAllNotificationsRead(),
    deleteNotification: (id) => mock.deleteNotification(id),
    getConversations: () => mock.getConversations(),
    getMessages: (conversationId) => mock.getMessages(conversationId),
    sendMessage: (conversationId, body) => mock.sendMessage(conversationId, body),
    markConversationRead: (conversationId) => mock.markConversationRead(conversationId),

    // User
    getUserProfile: () => mock.getUserProfile(),
    getCartItems: () => mock.getCartItems(),

    // Seller storefront
    getSellerStorefront: (sellerId) => mock.getSellerStorefront(sellerId),

    // Promo
    applyPromoCode: (code, subtotal) => mock.applyPromoCode(code, subtotal),

    // Auth
    requestOtp: (phone) => mock.requestOtp(phone),
    verifyOtp: (phone, code) => mock.verifyOtp(phone, code),

    // Feedback
    submitFeedback: (data) => mock.submitFeedback(data),
  }
}
