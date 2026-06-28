export interface ProductImage {
  uri: string
  alt?: string
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  compareAtPrice?: number
  sku: string
  stock: StockStatus
  attributes: Record<string, string>
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  images: ProductImage[]
  price: number
  compareAtPrice?: number
  currency: 'NPR'
  rating: number
  reviewCount: number
  categoryId: string
  sellerId: string
  sellerName: string
  stock: StockStatus
  variants: ProductVariant[]
  tags: string[]
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  image?: string
  parentId: string | null
  children?: Category[]
  productCount: number
}

export interface Deal {
  id: string
  title: string
  description: string
  discount: number
  discountType: 'percentage' | 'fixed'
  productId: string
  startsAt: string
  endsAt: string
  image?: string
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  image: string
  link?: string
  active: boolean
}

export interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  title?: string
  body: string
  photos?: string[]
  createdAt: string
  helpful: number
}

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  name: string
  image: string
  price: number
  quantity: number
  maxQuantity: number
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'

export interface OrderStatusEntry {
  status: OrderStatus
  timestamp: string
  note?: string
}

export interface Order {
  id: string
  items: CartItem[]
  total: number
  currency: 'NPR'
  status: OrderStatus
  timeline: OrderStatusEntry[]
  address: Address
  createdAt: string
  estimatedDelivery?: string
}

export interface Address {
  id: string
  label: string
  fullName: string
  phone: string
  line1: string
  line2?: string
  city: string
  district: string
  province: string
  postalCode?: string
  isDefault: boolean
}

export type NotificationType = 'order' | 'promo' | 'system' | 'message' | 'price_drop'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  link?: string
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  createdAt: string
  read: boolean
  status?: MessageStatus
  productId?: string
  productName?: string
  productImage?: string
  productPrice?: number
}

export interface Conversation {
  id: string
  participantName: string
  participantAvatar?: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  contextType?: 'order' | 'product' | 'general'
  orderId?: string
  orderRef?: string
  productId?: string
  productName?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  defaultAddressId?: string
  addresses: Address[]
}

export type CancelReason = 'changed_mind' | 'cheaper_elsewhere' | 'ordered_by_mistake' | 'other'

export interface ReturnRequest {
  orderId: string
  itemIds: string[]
  reason: CancelReason
  reasonDetail?: string
  status: 'requested' | 'approved' | 'refund_processed'
  createdAt: string
}

export interface OrderInvoice {
  orderId: string
  invoiceNumber: string
  issuedAt: string
  companyName: string
  companyAddress: string
  companyPan: string
  customerName: string
  customerAddress: string
  items: { name: string; quantity: number; unitPrice: number; total: number }[]
  subtotal: number
  vat: number
  deliveryFee: number
  discount: number
  grandTotal: number
}

export type SellerOrderStatusKey =
  | 'new'
  | 'to_pack'
  | 'to_ship'
  | 'shipped'
  | 'completed'
  | 'cancelled_returned'
  | 'action_needed'

export type SellerPaymentType = 'cod' | 'prepaid'
export type SellerShippingMethod = 'standard' | 'express' | 'sameday' | 'pickup'
export type SellerOrderSortKey = 'newest' | 'oldest' | 'value'

export interface SellerSubOrderItem {
  id: string
  productId: string
  name: string
  image: string
  price: number
  quantity: number
  sku?: string
}

export interface SellerSubOrder {
  subOrderId: string
  orderId: string
  sellerId: string
  buyerName: string
  buyerPhone: string
  city: string
  district: string
  items: SellerSubOrderItem[]
  itemCount: number
  total: number
  currency: 'NPR'
  status: OrderStatus
  statusKey: SellerOrderStatusKey
  paymentType: SellerPaymentType
  shippingMethod: SellerShippingMethod
  createdAt: string
  estimatedDelivery?: string
  actionNeeded: boolean
  actionReason?: string
}

export type SellerProductStatus = 'active' | 'draft' | 'out_of_stock' | 'archived'

export interface SellerProduct {
  id: string
  name: string
  sku: string
  image: string
  price: number
  compareAtPrice?: number
  currency: 'NPR'
  categoryId: string
  categoryName: string
  stock: StockStatus
  stockCount: number
  status: SellerProductStatus
  salesCount: number
  viewsCount: number
  rating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
}

export interface SellerInventoryVariant {
  id: string
  productId: string
  name: string
  sku: string
  price: number
  compareAtPrice?: number
  currency: 'NPR'
  stockCount: number
  stock: StockStatus
  attributes: Record<string, string>
  image: string
  salesCount: number
}

export interface SellerInventoryProduct {
  id: string
  name: string
  slug: string
  image: string
  categoryId: string
  categoryName: string
  currency: 'NPR'
  aggregateStock: number
  stock: StockStatus
  variantCount: number
  salesCount: number
  variants: SellerInventoryVariant[]
}
