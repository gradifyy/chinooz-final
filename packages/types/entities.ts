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

export interface SellerReviewResponse {
  text: string
  at: string
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
  sellerResponse?: SellerReviewResponse
}

export type ReviewFlagReason = 'spam' | 'abusive' | 'fake' | 'off_topic'
export type ReviewModerationStatus = 'pending' | 'removed' | 'dismissed'

export interface SellerReview extends Review {
  productName: string
  productImage: string
  response?: SellerReviewResponse
  flagged?: boolean
  flagReason?: ReviewFlagReason
  moderationStatus?: ReviewModerationStatus
  verifiedPurchase?: boolean
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

export type RichMessageType = 'product' | 'order' | 'tracking'

export interface RichProductPayload {
  productId: string
  name: string
  image: string
  price: number
}

export interface RichOrderPayload {
  orderId: string
  orderRef: string
  status: string
  total: number
  itemCount: number
}

export interface RichTrackingPayload {
  carrier: string
  trackingNumber: string
  url: string
}

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
  richType?: RichMessageType
  richProduct?: RichProductPayload
  richOrder?: RichOrderPayload
  richTracking?: RichTrackingPayload
}

export interface SellerMessageTemplate {
  id: string
  label: string
  body: string
  /** Placeholders like {order_id}, {tracking}, {buyer_name} */
  hasPlaceholders?: boolean
  isBuiltIn?: boolean
  createdAt: string
  updatedAt: string
}

export interface SellerAwayMessage {
  enabled: boolean
  body: string
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
  /** Low-stock threshold (units). Defaults to platform constant when absent. */
  lowStockThreshold?: number
  /** Committed/reserved units (not available to sell). */
  committed?: number
  /** Incoming replenishment units. */
  incoming?: number
  /** Parent product name (for row display). */
  productName?: string
  /** Restock reminder enabled (mock, per variant). */
  restockReminder?: boolean
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

export type StockEditReason = 'restock' | 'correction' | 'damage' | 'loss' | 'return' | 'other'

export type StockEditMode = 'set' | 'adjust'

export interface StockHistoryEntry {
  id: string
  variantId: string
  sku: string
  previousStock: number
  newStock: number
  delta: number
  mode: StockEditMode
  reason: StockEditReason
  note?: string
  createdAt: string
}

export type BulkStockAction = 'set' | 'adjust' | 'threshold' | 'mark_out'

export interface BulkStockOperation {
  variantIds: string[]
  action: BulkStockAction
  value?: number
  reason?: StockEditReason
}

export interface BulkStockResult {
  success: boolean
  updated: number
  failed: number
  error?: string
}

export interface CsvStockRow {
  sku: string
  stockCount: number
  lowStockThreshold?: number
}

export interface StockAlert {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  image: string
  stockCount: number
  lowStockThreshold: number
  status: StockStatus
}

export interface StockAlertSummary {
  low: StockAlert[]
  out: StockAlert[]
  lowCount: number
  outCount: number
  total: number
}

// ---- RS3 map / trip simulator + rider delivery ----

// ---- Seller domain: store, payouts, transactions, staff, notifications, stats ----

export interface SellerStoreProfile {
  id: string
  sellerId: string
  name: string
  nameNe?: string
  slug: string
  logo: string
  banner: string
  description: string
  descriptionNe?: string
  rating: number
  reviewCount: number
  followerCount: number
  productCount: number
  joinedAt: string
  goLiveStatus: 'offline' | 'review' | 'live'
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected'
  pan: string
  email: string
  phone: string
  address: string
  city: string
  district: string
  province: string
  defaultPayoutMethod: 'esewa' | 'khalti' | 'bank'
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PayoutMethod = 'esewa' | 'khalti' | 'bank'

export interface Payout {
  id: string
  sellerId: string
  amount: number
  currency: 'NPR'
  status: PayoutStatus
  method: PayoutMethod
  reference: string
  requestedAt: string
  processedAt?: string
  estimatedAt?: string
  fee: number
  net: number
}

export type TransactionType = 'sale' | 'refund' | 'payout' | 'fee' | 'adjustment'
export type TransactionStatus = 'settled' | 'pending' | 'failed'

export interface Transaction {
  id: string
  sellerId: string
  type: TransactionType
  amount: number
  currency: 'NPR'
  status: TransactionStatus
  description: string
  reference: string
  orderId?: string
  payoutId?: string
  createdAt: string
  vatAmount?: number
  feeAmount?: number
}

export type StaffRole = 'owner' | 'admin' | 'manager' | 'staff'
export type StaffStatus = 'active' | 'invited' | 'suspended'

export interface StaffMember {
  id: string
  sellerId: string
  name: string
  email: string
  phone: string
  role: StaffRole
  status: StaffStatus
  avatar?: string
  permissions: string[]
  lastActiveAt?: string
  invitedAt: string
}

export type SellerNotificationType = 'order' | 'review' | 'payout' | 'stock' | 'promotion' | 'system' | 'message'

export interface SellerNotification {
  id: string
  sellerId: string
  type: SellerNotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  link?: string
  priority: 'low' | 'normal' | 'high'
}

export type SellerStatsRange = 'today' | '7d' | '30d' | '90d' | 'custom'

export interface SellerStatsKpi {
  key: string
  label: string
  value: number
  formattedValue: string
  deltaPct: number
  trend: 'up' | 'down' | 'flat'
  hint: string
}

export interface SellerStatsChartPoint {
  label: string
  value: number
  previous?: number
}

export interface SellerStats {
  range: SellerStatsRange
  kpis: SellerStatsKpi[]
  chart: SellerStatsChartPoint[]
  topProducts: { id: string; name: string; revenue: number; units: number }[]
  recentOrders: { id: string; buyer: string; total: number; status: string; at: string }[]
}

export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'draft'
export type PromotionType = 'percentage' | 'fixed' | 'flash_sale' | 'bogo' | 'free_shipping'

export interface Promotion {
  id: string
  name: string
  type: PromotionType
  status: PromotionStatus
  discountValue: number
  code: string
  startsAt: string
  endsAt: string
  redemptions: number
  revenue: number
  budget?: number
  productsCount: number
  createdAt: string
}

export type ExportReportType = 'sales' | 'orders' | 'payouts' | 'products' | 'reviews'

export interface ExportReportResult {
  id: string
  type: ExportReportType
  range: SellerStatsRange
  status: 'processing' | 'ready' | 'failed'
  downloadUrl?: string
  requestedAt: string
  completedAt?: string
}

// ---- RS3 map / trip simulator + rider delivery (below) ----

export interface GeoPoint {
  lat: number
  lng: number
}

export interface MapBoundary {
  id: string
  label: string
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface RouteStop extends GeoPoint {
  label: string
  address: string
  contactName: string
  contactPhone: string
  /** Items to collect at this stop (pickup only); empty for drop-off. */
  items?: string[]
  /** Optional prep note from the seller (pickup only). */
  prepNote?: string
  /** Optional area / locality label shown under the stop name. */
  area?: string
  /** Optional delivery note from the buyer (drop-off only). */
  deliveryNote?: string
}

export interface DeliveryLeg {
  /** Ordered points from the start of the leg to its end (inclusive). */
  points: GeoPoint[]
  distanceMeters: number
  etaSeconds: number
}

export type DeliveryStatus =
  | 'assigned'
  | 'heading_to_pickup'
  | 'at_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'at_dropoff'
  | 'delivered'
  | 'cancelled'
  | 'failed'

export interface RiderJob {
  id: string
  orderRef: string
  customerName: string
  pickup: RouteStop
  dropoff: RouteStop
  legToPickup: DeliveryLeg
  legToDropoff: DeliveryLeg
  payout: number
  isCod: boolean
  codAmount: number
  currency: 'NPR'
  createdAt: string
  /** Proof-of-delivery config: which proofs are required for this order. */
  proof?: ProofOfDeliveryConfig
}

/** Configurable proof-of-delivery options per order. */
export interface ProofOfDeliveryConfig {
  /** Require an OTP code from the buyer to confirm delivery. */
  otpRequired?: boolean
  /** Require a delivery photo (package handed over). */
  photoRequired?: boolean
  /** Require a signature capture. */
  signatureRequired?: boolean
}

export interface ActiveDelivery {
  jobId: string
  orderRef: string
  customerName: string
  pickup: RouteStop
  dropoff: RouteStop
  legToPickup: DeliveryLeg
  legToDropoff: DeliveryLeg
  payout: number
  isCod: boolean
  codAmount: number
  currency: 'NPR'
  status: DeliveryStatus
  /** 0..1 progress within the currently active leg. */
  legProgress: number
  currentPoint: GeoPoint
  etaSeconds: number
  distanceMeters: number
  minimized: boolean
  startedAt: number
  updatedAt: number
  cancelReason?: string
  failureReason?: string
  /** Proof-of-delivery config for this order. */
  proof?: ProofOfDeliveryConfig
  /** Epoch ms when delivery was completed (delivered/failed). */
  completedAt?: number
  /** Pickup label (store / seller name) — RJ5 Jobs tab compat. */
  pickupLabel: string
  /** Drop-off label (buyer area / tole) — RJ5 Jobs tab compat. */
  dropoffLabel: string
  /** Epoch ms when the job was accepted — RJ5 Jobs tab compat. */
  acceptedAt: number
  /** Epoch ms of the ETA at drop-off, if known — RJ5 Jobs tab compat. */
  etaDropoffMs: number | null
  /** True when the delivery was cancelled by seller/system mid-trip. */
  cancelledBySystem?: boolean
  /** Compensation note for mid-trip system cancellation. */
  compensationNote?: string
}

/** A queued status update waiting for reconnect (offline-tolerant). */
export interface QueuedStatusUpdate {
  /** The status to transition to. */
  status: DeliveryStatus
  /** Epoch ms when the update was queued. */
  queuedAt: number
  /** Optional reason (for cancel/fail). */
  reason?: string
  /** Optional proof payload (for delivered). */
  proofPayload?: {
    otpVerified?: boolean
    photoCaptured?: boolean
    signatureCaptured?: boolean
  }
}

/** Active delivery error types for retry surfaces. */
export type ActiveDeliveryError =
  | 'status_update_failed'
  | 'proof_submit_failed'
  | 'cod_record_failed'
  | 'map_gps_failed'
  | 'offline'
  | 'system_cancel'
  | 'restore'
