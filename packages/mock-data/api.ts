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

export async function getOrders(): Promise<Order[]> {
  await randomDelay(300, 700)
  return orders
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

export async function searchProducts(query: string): Promise<Product[]> {
  await randomDelay(300, 800)
  const q = query.toLowerCase()
  return products.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)),
  )
}

export async function getPopularProducts(): Promise<Product[]> {
  await randomDelay(200, 500)
  return [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 6)
}

export async function getRecommendedProducts(userId?: string): Promise<Product[]> {
  await randomDelay(250, 600)
  return [...products].sort(() => Math.random() - 0.5).slice(0, 6)
}

// --- Auth ---

const otpStore = new Map<string, { sentAt: number; code: string }>()

export async function requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
  await randomDelay(600, 1200)
  const existing = otpStore.get(phone)
  if (existing && Date.now() - existing.sentAt < 60_000) {
    return { success: true, message: 'Code already sent — check your messages' }
  }
  otpStore.set(phone, { sentAt: Date.now(), code: '123456' })
  return { success: true, message: 'OTP sent' }
}

export async function verifyOtp(phone: string, code: string): Promise<{ success: boolean; userId?: string }> {
  await randomDelay(400, 800)
  const entry = otpStore.get(phone)
  if (entry && entry.code === code) {
    otpStore.delete(phone)
    return { success: true, userId: 'user-1' }
  }
  return { success: false }
}
