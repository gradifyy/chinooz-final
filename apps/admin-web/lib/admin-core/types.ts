/**
 * Admin-core domain types.
 *
 * Pure types module for the Admin Dashboard domain logic. No I/O, no React.
 * Monetary values are always represented as integer paisa (e.g. `totalPaisa`,
 * `unitPricePaisa`, `pricePaisa`, `totalSalesPaisa`) to avoid floating-point drift.
 *
 * See design.md "Data Models" and "Components and Interfaces" sections.
 */

// ---------------------------------------------------------------------------
// Access control (Requirement 2)
// ---------------------------------------------------------------------------

export type Role =
  | 'Super_Admin'
  | 'Operations_Admin'
  | 'Support_Admin'
  | 'Read_Only_Admin'

export type Permission =
  | 'users.view'
  | 'users.manage'
  | 'approvals.view'
  | 'approvals.decide'
  | 'orders.view'
  | 'orders.cancel'
  | 'listings.view'
  | 'listings.moderate'
  | 'analytics.view'
  | 'settings.view'
  | 'settings.manage'
  | 'audit.view'

export interface AdminAccount {
  id: string
  /** email/username */
  identifier: string
  /** must be non-empty to be active */
  roles: Role[]
  /** false when roles is empty */
  active: boolean
}

/**
 * An authenticated administrator session. `lastSeenAt` drives idle-timeout
 * expiry (Req 1.5). Timestamps are ISO UTC strings.
 */
export interface AdminSession {
  adminId: string
  roles: Role[]
  /** ISO UTC — when the session was established */
  issuedAt: string
  /** ISO UTC — last activity, used for idle timeout */
  lastSeenAt: string
}

/**
 * Per-account login-failure tracking used to enforce lockout (Req 1.7).
 * `failures` holds epoch-millisecond timestamps of recent failed
 * authentication attempts in ascending order.
 */
export interface LockoutState {
  failures: number[]
}

// ---------------------------------------------------------------------------
// Marketplace users (Requirement 3)
// ---------------------------------------------------------------------------

export type UserType = 'buyer' | 'seller' | 'rider'
export type AccountStatus = 'active' | 'suspended'

export interface MarketplaceUser {
  id: string
  type: UserType
  name: string
  phone: string
  email: string
  status: AccountStatus
}

// ---------------------------------------------------------------------------
// Verification approvals (Requirement 4)
// ---------------------------------------------------------------------------

export type RequesterType = 'seller' | 'rider'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export interface VerificationDocument {
  id: string
  label: string
  url: string
}

export interface VerificationRequest {
  id: string
  requesterId: string
  requesterType: RequesterType
  /** ISO UTC */
  submittedAt: string
  status: VerificationStatus
  documents: VerificationDocument[]
  /** 1..500 when rejected */
  rejectionReason?: string
}

// ---------------------------------------------------------------------------
// Orders (Requirement 5)
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface PartyRef {
  id: string
  name: string
}

export interface OrderLineItem {
  id: string
  name: string
  quantity: number
  /** integer paisa */
  unitPricePaisa: number
}

export interface AdminOrder {
  id: string
  /** ISO UTC, sort key */
  createdAt: string
  status: OrderStatus
  buyer: PartyRef
  seller: PartyRef
  rider?: PartyRef
  lineItems: OrderLineItem[]
  /** integer paisa */
  totalPaisa: number
  cancellationReason?: string
}

// ---------------------------------------------------------------------------
// Listings (Requirement 6)
// ---------------------------------------------------------------------------

export type ModerationStatus = 'published' | 'removed'

export interface AdminListing {
  id: string
  title: string
  description: string
  /** integer paisa */
  pricePaisa: number
  images: string[]
  sellerId: string
  sellerName: string
  moderationStatus: ModerationStatus
  /** 10..500 when removed */
  removalReason?: string
}

// ---------------------------------------------------------------------------
// Analytics (Requirement 7)
// ---------------------------------------------------------------------------

/** inclusive, ISO dates */
export interface DateRange {
  start: string
  end: string
}

export interface Metrics {
  totalOrders: number
  /** integer paisa */
  totalSalesPaisa: number
  /** ≥1 completed order in range */
  activeSellers: number
  activeRiders: number
}

// ---------------------------------------------------------------------------
// Platform settings (Requirement 8)
// ---------------------------------------------------------------------------

export interface PlatformSetting {
  id: string
  value: number
}

export interface SettingChange {
  id: string
  previous: number
  next: number
}

// ---------------------------------------------------------------------------
// Audit log (Requirement 9)
// ---------------------------------------------------------------------------

export interface AuditRecord {
  id: string
  actorId: string
  actionType: string
  entityId: string
  details?: Record<string, string>
  /** ISO UTC, second precision */
  timestamp: string
}

// ---------------------------------------------------------------------------
// Shared utility types
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type ValidationResult = { ok: true } | { ok: false; reason: string }
