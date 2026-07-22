/**
 * HTTP adapter — implements the `BuyerApi` interface using the shared `ApiClient`.
 *
 * When a real backend is ready, set the `USE_REAL_API` flag (or change the
 * default in `index.ts`) and this adapter takes over. No hook or page changes.
 *
 * Endpoint paths follow a conventional REST layout; adjust them to match the
 * actual backend when it's available.
 */

import { ApiClient } from './client'
import type { ApiClientConfig } from './client'
import type { BuyerApi } from './types'

export function createHttpApi(config: ApiClientConfig): BuyerApi {
  const client = new ApiClient(config)

  return {
    // Products
    getProducts: (params) => client.get('/products', params),
    getProductById: (id) => client.get(`/products/${id}`),
    getProductsByIds: (ids) => client.post('/products/batch', { ids }),
    getProductBySlug: (slug) => client.get(`/products/slug/${slug}`),
    getTrendingProducts: () => client.get('/products/trending'),
    getNewestProducts: () => client.get('/products/newest'),
    getNearbyProducts: () => client.get('/products/nearby'),
    getPopularProducts: () => client.get('/products/popular'),
    getRecommendedProducts: (userId) => client.get('/products/recommended', { userId }),
    getSimilarProducts: (categoryId, excludeId) => client.get('/products/similar', { categoryId, excludeId }),
    getFrequentlyBoughtTogether: (productId) => client.get(`/products/${productId}/frequently-bought`),

    // Categories
    getCategories: () => client.get('/categories'),

    // Deals & Banners
    getDeals: () => client.get('/deals'),
    getBanners: () => client.get('/banners'),
    getCoupons: () => client.get('/coupons'),

    // Reviews & Q&A
    getReviews: (productId) => client.get(`/products/${productId}/reviews`),
    submitReview: (data) => client.post('/reviews', data),
    voteHelpful: (reviewId) => client.post(`/reviews/${reviewId}/vote-helpful`),
    getHelpfulVotes: () => client.get('/reviews/helpful-votes'),
    getProductQuestions: (productId) => client.get(`/products/${productId}/questions`),
    askProductQuestion: (data) => client.post('/products/questions', data),

    // Search
    searchProducts: (query) => client.get('/search/products', { query }),
    searchProductsPaginated: (params) => client.get('/search/products', params as Record<string, string | number | boolean | undefined>),
    searchProductsFaceted: (params) => client.get('/search/products/faceted', params as Record<string, string | number | boolean | undefined>),
    searchCategories: (query) => client.get('/search/categories', { query }),
    searchBrands: (query) => client.get('/search/brands', { query }),

    // Orders
    getOrders: (params) => client.get('/orders', params),
    getOrderById: (id) => client.get(`/orders/${id}`),
    cancelOrder: (data) => client.post(`/orders/${data.orderId}/cancel`, data),
    requestReturn: (data) => client.post(`/orders/${data.orderId}/return`, data),
    reorder: (orderId) => client.post(`/orders/${orderId}/reorder`),
    getOrderInvoice: (orderId) => client.get(`/orders/${orderId}/invoice`),
    getReturnRequests: (orderId) => client.get('/orders/returns', { orderId }),
    placeOrder: (data) => client.post('/orders', data),

    // Notifications & Messages
    getNotifications: () => client.get('/notifications'),
    getUnreadNotificationCount: () => client.get('/notifications/unread-count'),
    getUnreadMessageCount: () => client.get('/messages/unread-count'),
    getAssistantUnreadCount: () => client.get('/assistant/unread-count'),
    markNotificationRead: (id) => client.patch(`/notifications/${id}/read`),
    markAllNotificationsRead: () => client.patch('/notifications/read-all'),
    deleteNotification: (id) => client.delete(`/notifications/${id}`),
    getConversations: () => client.get('/conversations'),
    getMessages: (conversationId) => client.get(`/conversations/${conversationId}/messages`),
    sendMessage: (conversationId, body) => client.post(`/conversations/${conversationId}/messages`, { body }),
    markConversationRead: (conversationId) => client.patch(`/conversations/${conversationId}/read`),

    // User
    getUserProfile: () => client.get('/user/profile'),
    getCartItems: () => client.get('/user/cart'),

    // Seller storefront
    getSellerStorefront: (sellerId) => client.get(`/sellers/${sellerId}/storefront`),

    // Promo
    applyPromoCode: (code, subtotal) => client.post('/promos/apply', { code, subtotal }),

    // Auth
    requestOtp: (phone) => client.post('/auth/request-otp', { phone }),
    verifyOtp: (phone, code) => client.post('/auth/verify-otp', { phone, code }),

    // Feedback
    submitFeedback: (data) => client.post('/feedback', data),
  }
}
