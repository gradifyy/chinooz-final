import type { Product, Category, Deal, Order, Review, User } from '@chinooz/types'
import { products, getProductById, getProductBySlug, getProductsByCategory, getDealProducts, searchProducts } from './products'
import { categories, getCategoryBySlug, getCategoryById } from './categories'
import { deals } from './deals'
import { users, getUserById } from './users'
import { orders } from './orders'
import { reviews, getReviewsByProduct } from './reviews'

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const api = {
  // Products
  async getProducts(): Promise<Product[]> {
    await delay()
    return products
  },

  async getProductById(id: string): Promise<Product | null> {
    await delay()
    return getProductById(id) ?? null
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    await delay()
    return getProductBySlug(slug) ?? null
  },

  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    await delay()
    return getProductsByCategory(categorySlug)
  },

  async searchProducts(query: string): Promise<Product[]> {
    await delay(500)
    return searchProducts(query)
  },

  async getDealProducts(): Promise<Product[]> {
    await delay()
    return getDealProducts()
  },

  async getFeaturedProducts(): Promise<Product[]> {
    await delay()
    return products.filter(p => p.rating >= 4.5).slice(0, 6)
  },

  async getNewArrivals(): Promise<Product[]> {
    await delay()
    return [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6)
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    await delay()
    return categories
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    await delay()
    return getCategoryBySlug(slug) ?? null
  },

  // Deals
  async getDeals(): Promise<Deal[]> {
    await delay()
    return deals
  },

  // Reviews
  async getReviewsForProduct(productId: string): Promise<Review[]> {
    await delay()
    return getReviewsByProduct(productId)
  },

  // Users
  async getUser(id: string): Promise<User | null> {
    await delay()
    return getUserById(id) ?? null
  },

  // Orders
  async getUserOrders(userId: string): Promise<Order[]> {
    await delay()
    return orders.filter(o => o.userId === userId)
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    await delay()
    return orders.find(o => o.id === orderId) ?? null
  },

  // Placeholder mutations
  async addReview(_review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    await delay(500)
    return { ..._review, id: `rev-${Date.now()}`, createdAt: new Date().toISOString() }
  },

  async placeOrder(_order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    await delay(800)
    return { ..._order, id: `ord-${Date.now()}`, createdAt: new Date().toISOString() }
  },
}
