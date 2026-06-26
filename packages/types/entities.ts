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

export type NotificationType = 'order' | 'promo' | 'system' | 'message'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  link?: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  createdAt: string
  read: boolean
}

export interface Conversation {
  id: string
  participantName: string
  participantAvatar?: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
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
