import type {
  SellerStoreProfile,
  Payout,
  PayoutMethod,
  Transaction,
  StaffMember,
  StaffRole,
  SellerNotification,
  SellerStats,
  SellerStatsRange,
  SellerSubOrder,
  SellerOrderStatusKey,
  SellerProduct,
  StockStatus,
  StockEditMode,
  StockEditReason,
  StockHistoryEntry,
  Promotion,
  ExportReportType,
  ExportReportResult,
} from '@chinooz/types'
import {
  sellerStore,
  sellerPayouts,
  sellerTransactions,
  sellerStaff,
  sellerNotifications,
  buildSellerStats,
  SELLER_ID,
} from './sellerFixtures'
import { getSellerOrders, sellerDisplayName } from './sellerOrders'
import { getSellerProducts, getSellerInventory } from './api'
import type { SellerProductFilter, SellerInventoryFilter } from './api'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 300, max = 800): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

const ERROR_RATE = 0.07

function maybeError(): void {
  if (Math.random() < ERROR_RATE) {
    throw new Error('Mock API error — simulated failure for testing loading/error states')
  }
}

// --- Store ---

export async function getStore(sellerId: string = SELLER_ID): Promise<SellerStoreProfile> {
  await randomDelay(200, 500)
  maybeError()
  if (sellerId === SELLER_ID) return sellerStore
  return {
    ...sellerStore,
    sellerId,
    name: sellerDisplayName(sellerId),
    nameNe: undefined,
    slug: sellerId,
  }
}

export async function updateStore(
  sellerId: string,
  data: Partial<SellerStoreProfile>,
): Promise<SellerStoreProfile> {
  await randomDelay(300, 600)
  maybeError()
  Object.assign(sellerStore, data)
  return sellerStore
}

// --- Stats ---

export async function getSellerStats(
  range: SellerStatsRange = '30d',
): Promise<SellerStats> {
  await randomDelay(300, 700)
  maybeError()
  return buildSellerStats(range)
}

// --- Products (delegates to existing api + adds CRUD) ---

export async function getSellerProductsApi(filter: SellerProductFilter = {}) {
  return getSellerProducts(filter)
}

export async function getSellerInventoryApi(filter: SellerInventoryFilter = {}) {
  return getSellerInventory(filter)
}

export async function getSellerProductById(productId: string): Promise<SellerProduct | null> {
  await randomDelay(200, 400)
  maybeError()
  const result = await getSellerProducts({})
  return result.items.find(p => p.id === productId) ?? null
}

export async function createProduct(input: {
  name: string
  price: number
  categoryId: string
  stockCount: number
  sku?: string
  image?: string
}): Promise<SellerProduct> {
  await randomDelay(400, 800)
  maybeError()
  const nowIso = new Date().toISOString()
  const stock: StockStatus =
    input.stockCount <= 0 ? 'out_of_stock' : input.stockCount < 10 ? 'low_stock' : 'in_stock'
  const product: SellerProduct = {
    id: `prod-${Date.now()}`,
    name: input.name,
    sku: input.sku ?? `SKU-${Date.now()}`,
    image: input.image ?? `https://picsum.photos/seed/${Date.now()}/200/200`,
    price: input.price,
    currency: 'NPR',
    categoryId: input.categoryId,
    categoryName: 'New Category',
    stock,
    stockCount: input.stockCount,
    status: 'draft',
    salesCount: 0,
    viewsCount: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  return product
}

export async function updateProduct(
  productId: string,
  data: Partial<SellerProduct>,
): Promise<SellerProduct | null> {
  await randomDelay(300, 600)
  maybeError()
  return await getSellerProductById(productId).then(p => (p ? { ...p, ...data, updatedAt: new Date().toISOString() } : null))
}

export async function deleteProduct(productId: string): Promise<{ success: boolean }> {
  await randomDelay(300, 500)
  maybeError()
  return { success: true }
}

export async function updateStock(
  productId: string,
  variantId: string | undefined,
  newCount: number,
  mode: StockEditMode = 'set',
  reason: StockEditReason = 'restock',
  note?: string,
): Promise<{ productId: string; variantId?: string; stockCount: number; stock: StockStatus }> {
  await randomDelay(200, 500)
  maybeError()
  const stock: StockStatus =
    newCount <= 0 ? 'out_of_stock' : newCount < 10 ? 'low_stock' : 'in_stock'

  // Record to stock history (SI5).
  if (variantId) {
    const { recordStockHistoryEntry } = await import('./api')
    recordStockHistoryEntry(variantId, mode, reason, note, newCount)
  }

  return { productId, variantId, stockCount: newCount, stock }
}

export async function getStockHistoryApi(
  variantId?: string,
  limit = 50,
): Promise<StockHistoryEntry[]> {
  const { getStockHistory } = await import('./api')
  return getStockHistory(variantId, limit)
}

// --- Orders ---

export async function getSellerOrdersApi(
  sellerId: string,
  status?: SellerOrderStatusKey,
): Promise<SellerSubOrder[]> {
  return getSellerOrders(sellerId, status)
}

export async function getSellerOrderById(
  sellerId: string,
  subOrderId: string,
): Promise<SellerSubOrder | null> {
  await randomDelay(200, 500)
  maybeError()
  const all = await getSellerOrders(sellerId)
  return all.find(o => o.subOrderId === subOrderId) ?? null
}

export async function updateOrderStatus(
  subOrderId: string,
  newStatusKey: SellerOrderStatusKey,
): Promise<{ subOrderId: string; statusKey: SellerOrderStatusKey; success: boolean }> {
  await randomDelay(300, 700)
  maybeError()
  return { subOrderId, statusKey: newStatusKey, success: true }
}

export async function fulfillOrder(
  subOrderId: string,
  trackingNumber?: string,
  carrier?: string,
): Promise<{ subOrderId: string; success: boolean; trackingNumber?: string }> {
  await randomDelay(400, 800)
  maybeError()
  return {
    subOrderId,
    success: true,
    trackingNumber: trackingNumber ?? `TRK-${Math.floor(Math.random() * 1000000)}`,
  }
}

export async function rejectOrder(
  subOrderId: string,
  reason: string,
  reasonDetail?: string,
): Promise<{ subOrderId: string; success: boolean; reason: string }> {
  await randomDelay(400, 800)
  maybeError()
  return { subOrderId, success: true, reason }
}

export async function partialShipOrder(
  subOrderId: string,
  itemIds: string[],
  trackingNumber: string,
  carrier: string,
  shipDate?: string,
): Promise<{ subOrderId: string; success: boolean; trackingNumber: string; shippedCount: number }> {
  await randomDelay(400, 800)
  maybeError()
  return {
    subOrderId,
    success: true,
    trackingNumber: trackingNumber || `TRK-${Math.floor(Math.random() * 1000000)}`,
    shippedCount: itemIds.length,
  }
}

export async function bulkUpdateStatus(
  subOrderIds: string[],
  newStatusKey: SellerOrderStatusKey,
): Promise<{ results: { subOrderId: string; success: boolean; statusKey: SellerOrderStatusKey }[]; succeeded: number; failed: number }> {
  await randomDelay(500, 1000)
  maybeError()
  const results = subOrderIds.map(id => ({ subOrderId: id, success: true, statusKey: newStatusKey }))
  return { results, succeeded: results.length, failed: 0 }
}

export async function bulkFulfillOrders(
  shipments: { subOrderId: string; trackingNumber: string; carrier: string }[],
): Promise<{ results: { subOrderId: string; success: boolean; trackingNumber: string }[]; succeeded: number; failed: number }> {
  await randomDelay(600, 1200)
  maybeError()
  const results = shipments.map(s => ({
    subOrderId: s.subOrderId,
    success: true,
    trackingNumber: s.trackingNumber || `TRK-${Math.floor(Math.random() * 1000000)}`,
  }))
  return { results, succeeded: results.length, failed: 0 }
}

// --- Promotions ---

export async function getPromotionsApi(
  params?: Parameters<typeof import('./promotions').getPromotions>[0],
): Promise<Promotion[]> {
  const { getPromotions } = await import('./promotions')
  return getPromotions(params)
}

export async function createPromotion(input: {
  name: string
  type: Promotion['type']
  discountValue: number
  code: string
  startsAt: string
  endsAt: string
  budget?: number
  productsCount?: number
}): Promise<Promotion> {
  await randomDelay(400, 800)
  maybeError()
  const promo: Promotion = {
    id: `promo-${Date.now()}`,
    name: input.name,
    type: input.type,
    status: 'draft',
    discountValue: input.discountValue,
    code: input.code,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    redemptions: 0,
    revenue: 0,
    budget: input.budget,
    productsCount: input.productsCount ?? 0,
    createdAt: new Date().toISOString(),
  }
  return promo
}

export async function updatePromotion(
  promoId: string,
  data: Partial<Promotion>,
): Promise<Promotion | null> {
  await randomDelay(300, 600)
  maybeError()
  return null
}

export async function deletePromotion(promoId: string): Promise<{ success: boolean }> {
  await randomDelay(200, 400)
  maybeError()
  return { success: true }
}

// --- Payouts / Transactions ---

export async function getPayouts(sellerId: string = SELLER_ID): Promise<Payout[]> {
  await randomDelay(300, 600)
  maybeError()
  return sellerPayouts.filter(p => p.sellerId === sellerId)
}

export async function getSellerTransactions(sellerId: string = SELLER_ID): Promise<Transaction[]> {
  await randomDelay(300, 600)
  maybeError()
  return sellerTransactions.filter(t => t.sellerId === sellerId)
}

export async function requestSellerWithdrawal(input: {
  amount: number
  method: PayoutMethod
}): Promise<Payout> {
  await randomDelay(500, 800)
  maybeError()
  const payout: Payout = {
    id: `pay-${Date.now()}`,
    sellerId: SELLER_ID,
    amount: input.amount,
    currency: 'NPR',
    status: 'pending',
    method: input.method,
    reference: `${input.method.toUpperCase()}-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    estimatedAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    fee: Math.round(input.amount * 0.01),
    net: Math.round(input.amount * 0.99),
  }
  return payout
}

// --- Staff ---

export async function getStaff(sellerId: string = SELLER_ID): Promise<StaffMember[]> {
  await randomDelay(200, 500)
  maybeError()
  return sellerStaff.filter(s => s.sellerId === sellerId)
}

export async function updateStaffRole(
  staffId: string,
  role: StaffRole,
): Promise<{ staffId: string; role: StaffRole; success: boolean }> {
  await randomDelay(300, 500)
  maybeError()
  return { staffId, role, success: true }
}

// --- Notifications ---

export async function getSellerNotifications(
  sellerId: string = SELLER_ID,
): Promise<SellerNotification[]> {
  await randomDelay(200, 500)
  maybeError()
  return sellerNotifications.filter(n => n.sellerId === sellerId)
}

export async function markSellerNotificationRead(id: string): Promise<void> {
  await randomDelay(100, 250)
  maybeError()
  const n = sellerNotifications.find(n => n.id === id)
  if (n) n.read = true
}

export async function markAllSellerNotificationsRead(sellerId: string = SELLER_ID): Promise<void> {
  await randomDelay(200, 400)
  maybeError()
  for (const n of sellerNotifications) {
    if (n.sellerId === sellerId) n.read = true
  }
}

export async function getUnreadSellerNotificationCount(sellerId: string = SELLER_ID): Promise<number> {
  await randomDelay(100, 250)
  return sellerNotifications.filter(n => n.sellerId === sellerId && !n.read).length
}

// --- Export Report ---

export async function exportReport(
  range: SellerStatsRange,
  type: ExportReportType,
): Promise<ExportReportResult> {
  await randomDelay(500, 800)
  maybeError()
  return {
    id: `exp-${Date.now()}`,
    type,
    range,
    status: 'processing',
    requestedAt: new Date().toISOString(),
  }
}

// --- Handle availability check (mock) ---

const TAKEN_HANDLES = new Set([
  'chinooz-store',
  'electronics',
  'fashion',
  'himalayan-crafts',
  'kathmandu-grocery',
  'test-store',
])

export async function checkHandleAvailability(handle: string): Promise<boolean> {
  await delay(300 + Math.random() * 200)
  if (!handle || handle.length < 3) return false
  return !TAKEN_HANDLES.has(handle.toLowerCase())
}

// --- Chat context panel (SC3) ---

export interface ChatOrderContext {
  orderId: string
  orderRef: string
  status: string
  statusKey: SellerOrderStatusKey
  items: { id: string; name: string; image: string; price: number; quantity: number }[]
  total: number
  currency: 'NPR'
  paymentType: 'cod' | 'prepaid'
  estimatedDelivery?: string
}

export async function getChatOrderContext(
  sellerId: string,
  orderId: string,
): Promise<ChatOrderContext | null> {
  await randomDelay(200, 400)
  maybeError()
  const all = await getSellerOrders(sellerId)
  const norm = orderId.replace('#', '').toUpperCase()
  const match = all.find(o => o.orderId.toUpperCase() === norm || o.subOrderId.toUpperCase() === norm)
  if (!match) return null
  return {
    orderId: match.orderId,
    orderRef: `#${match.orderId}`,
    status: match.status,
    statusKey: match.statusKey,
    items: match.items.map(it => ({
      id: it.id,
      name: it.name,
      image: it.image,
      price: it.price,
      quantity: it.quantity,
    })),
    total: match.total,
    currency: match.currency,
    paymentType: match.paymentType,
    estimatedDelivery: match.estimatedDelivery,
  }
}

export interface ChatProductContext {
  id: string
  name: string
  image: string
  price: number
  compareAtPrice?: number
  currency: 'NPR'
  stock: StockStatus
  status: SellerProduct['status']
}

export async function getChatProductContext(
  productId: string,
): Promise<ChatProductContext | null> {
  await randomDelay(200, 400)
  maybeError()
  const res = await getSellerProducts()
  const p = res.items.find(sp => sp.id === productId)
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    image: p.image,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    stock: p.stock,
    status: p.status,
  }
}

export interface TrackingInfo {
  carrier: string
  trackingNumber: string
  url: string
}

export async function generateTrackingInfo(
  orderId: string,
): Promise<TrackingInfo> {
  await randomDelay(300, 600)
  maybeError()
  const num = Math.floor(100000 + Math.random() * 900000)
  return {
    carrier: 'Pathao Express',
    trackingNumber: `PH-${num}`,
    url: `https://pathao.com/track/${num}`,
  }
}

export async function attachConversationContext(
  conversationId: string,
  context: { type: 'order' | 'product'; id: string },
): Promise<{ success: boolean }> {
  await randomDelay(200, 400)
  maybeError()
  return { success: true }
}

