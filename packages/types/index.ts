export interface Product {
  id: string
  slug: string
  name: string
  nameNe?: string
  description: string
  descriptionNe?: string
  price: number
  compareAtPrice?: number
  images: string[]
  categoryId: string
  categorySlug: string
  categoryName: string
  categoryNameNe?: string
  rating: number
  reviewCount: number
  inStock: boolean
  stockCount: number
  sellerId: string
  sellerName: string
  brand?: string
  tags: string[]
  isDeal?: boolean
  dealPercent?: number
  dealEndsAt?: string
  createdAt: string
}

export interface Category {
  id: string
  slug: string
  name: string
  nameNe?: string
  description?: string
  image: string
  parentId?: string
  productCount: number
}

export interface Deal {
  id: string
  productId: string
  title: string
  titleNe?: string
  description: string
  percentOff: number
  endsAt: string
  image: string
  type: 'flash' | 'daily' | 'weekly' | 'clearance'
}

export interface User {
  id: string
  phone: string
  name: string
  email?: string
  avatar?: string
  addresses: Address[]
  defaultAddressId?: string
}

export interface Address {
  id: string
  label: string
  fullName: string
  phone: string
  province: string
  district: string
  municipality: string
  wardNo: string
  street: string
  isDefault: boolean
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  status: OrderStatus
  total: number
  subtotal: number
  shipping: number
  discount: number
  addressId: string
  paymentMethod: PaymentMethod
  createdAt: string
  deliveredAt?: string
}

export interface OrderItem {
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned'

export type PaymentMethod = 'cod' | 'khalti' | 'esewa' | 'connectIPS' | 'card'

export interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  title?: string
  comment: string
  images?: string[]
  createdAt: string
}

export interface CartItem {
  productId: string
  product: Product
  quantity: number
}

export interface Notification {
  id: string
  type: 'order' | 'deal' | 'system' | 'message'
  title: string
  titleNe?: string
  body: string
  bodyNe?: string
  read: boolean
  createdAt: string
  data?: Record<string, string>
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  senderName: string
  text: string
  textNe?: string
  createdAt: string
  isUser: boolean
}

export interface Thread {
  id: string
  participants: { id: string; name: string; avatar?: string }[]
  lastMessage: string
  lastMessageAt: string
  unread: number
  isAI?: boolean
}

export type Locale = 'en' | 'ne'
