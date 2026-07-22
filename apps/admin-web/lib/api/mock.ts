/**
 * Mock implementation of the {@link AdminApi} interface (task 16.2).
 *
 * This is the concrete, in-memory data source the Admin Dashboard runs against
 * today. It satisfies the `AdminApi` contract declared in `./types` and is the
 * thin I/O layer described in design.md "Layering Rules" #2: data fetching and
 * persistence flow through here, while every correctness-critical decision
 * (filtering, pagination, search, aggregation, lockout, status transitions,
 * audit-record construction) is DELEGATED to the pure helpers in
 * `lib/admin-core`. A real HTTP implementation can later be substituted behind
 * the same interface without touching the UI or the pure domain logic.
 *
 * Relationship to `@chinooz/mock-data`: that package models the *marketplace*
 * (buyer/seller/rider) surface — products, buyer/seller orders, conversations,
 * rider jobs — with async functions that simulate latency. It does NOT contain
 * admin-domain data (administrator accounts and credentials, marketplace-user
 * directory, verification requests, the append-only audit log, or platform
 * settings), and its record shapes differ from the admin domain (for example,
 * monetary values are NPR rupees rather than the integer paisa used throughout
 * `lib/admin-core`). This module therefore seeds its own in-memory admin data
 * that conforms to `lib/admin-core/types.ts`, while mirroring `mock-data`'s
 * simulated-latency approach (a small randomized async delay per method).
 *
 * Behaviors implemented here (the I/O concerns the interface owns):
 * - Simulated latency on every async method (Req-aligned with the monorepo's
 *   `mock-data` layer).
 * - Per-identifier lockout / rate-limit state, enforced via the pure
 *   `registerFailure` / `isLocked` helpers (Req 1.2 / 1.7). Credential failures
 *   are reported generically as `invalid_credentials` for BOTH an unknown
 *   identifier and a wrong password, so the outcome never reveals which field
 *   was wrong; an active lock yields `account_locked`; a valid login against a
 *   zero-role account yields `no_role`.
 * - Append-only audit log with retry-on-persist (Req 9.2): `append` retries a
 *   simulated transient persistence failure up to three times, returning the
 *   persisted record on success or `{ ok: false, reason: 'persist_failed',
 *   record }` on continued failure, preserving the record for retry.
 * - No audit mutators (Req 9.9): the audit surface exposes only `append` and
 *   `query`; records are stored append-only in memory.
 *
 * Server-side module. TypeScript strict mode, no `any`.
 *
 * _Requirements: 1.2, 1.7, 9.2, 9.9_
 */

import {
  EMPTY_LOCKOUT_STATE,
  isLocked,
  registerFailure,
} from '../admin-core/auth'
import { pageAuditRecords } from '../admin-core/audit'
import { hasAnyRole } from '../admin-core/rbac'
import { paginate } from '../admin-core/shared'
import { filterByType, searchUsers } from '../admin-core/users'
import { pendingOnly } from '../admin-core/approvals'
import { filterByStatus, sortByCreatedDesc } from '../admin-core/orders'
import { filterByModerationStatus } from '../admin-core/listings'
import { aggregateMetrics } from '../admin-core/analytics'
import type {
  AdminAccount,
  AdminListing,
  AdminOrder,
  AdminSession,
  AuditRecord,
  LockoutState,
  MarketplaceUser,
  PlatformSetting,
  Role,
  VerificationRequest,
} from '../admin-core/types'
import type { AuditFilter } from '../admin-core/audit'
import type {
  AccountsApi,
  AdminApi,
  AnalyticsApi,
  ApprovalsApi,
  AppendResult,
  AuditApi,
  AuthCredentials,
  AuthResult,
  AuthService,
  ListingListQuery,
  ListingsApi,
  MutationResult,
  OrderListQuery,
  OrdersApi,
  QueryResult,
  SettingsApi,
  UserListQuery,
  UsersApi,
} from './types'

// ---------------------------------------------------------------------------
// Page sizes (mirroring the per-module documentation in ./types)
// ---------------------------------------------------------------------------

/** Marketplace-user list page size (Req 3.1). */
const USER_PAGE_SIZE = 25
/** Verification-request pending-list page size (Req 4.1). */
const APPROVAL_PAGE_SIZE = 25
/** Order list page size (Req 5.1). */
const ORDER_PAGE_SIZE = 25
/** Listing list page size (≤50, Req 6.1). */
const LISTING_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Simulated latency (mirrors @chinooz/mock-data's randomized delay)
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Awaits a small randomized delay so callers exercise realistic async timing. */
function latency(min = 60, max = 180): Promise<void> {
  return delay(min + Math.random() * (max - min))
}

// ---------------------------------------------------------------------------
// Audit append retry (Req 9.2)
// ---------------------------------------------------------------------------

/** Maximum persistence attempts for an audit append before giving up (Req 9.2). */
const MAX_APPEND_ATTEMPTS = 3

/**
 * Per-attempt probability that a simulated transient persistence failure
 * occurs. With {@link MAX_APPEND_ATTEMPTS} attempts the chance of continued
 * failure is small, exercising both the retry path and the preserved-record
 * failure path of {@link AuditApi.append}.
 */
const TRANSIENT_FAILURE_RATE = 0.3

/** Returns true when a simulated persistence attempt succeeds. */
function persistAttemptSucceeds(): boolean {
  return Math.random() >= TRANSIENT_FAILURE_RATE
}

// ---------------------------------------------------------------------------
// Seed data — admin-domain records conforming to lib/admin-core/types.ts
// ---------------------------------------------------------------------------

/**
 * Seed administrator accounts together with their (mock) passwords. Passwords
 * are kept separate from {@link AdminAccount} because the domain type carries
 * no credential field. `zero-role-admin` exercises the `no_role` outcome
 * (valid credentials, no assigned role → inactive account, Req 2.2).
 */
interface SeedAdmin {
  account: AdminAccount
  password: string
}

function seedAdmins(): SeedAdmin[] {
  return [
    {
      account: {
        id: 'admin-super',
        identifier: 'super@chinooz.com',
        roles: ['Super_Admin'],
        active: true,
      },
      password: 'super-secret',
    },
    {
      account: {
        id: 'admin-ops',
        identifier: 'ops@chinooz.com',
        roles: ['Operations_Admin'],
        active: true,
      },
      password: 'ops-secret',
    },
    {
      account: {
        id: 'admin-support',
        identifier: 'support@chinooz.com',
        roles: ['Support_Admin'],
        active: true,
      },
      password: 'support-secret',
    },
    {
      account: {
        id: 'admin-readonly',
        identifier: 'readonly@chinooz.com',
        roles: ['Read_Only_Admin'],
        active: true,
      },
      password: 'readonly-secret',
    },
    {
      account: {
        id: 'admin-zero',
        identifier: 'norole@chinooz.com',
        roles: [],
        active: false,
      },
      password: 'norole-secret',
    },
  ]
}

function seedUsers(): MarketplaceUser[] {
  return [
    {
      id: 'user-buyer-1',
      type: 'buyer',
      name: 'Ayush Chaudhary',
      phone: '9800000010',
      email: 'ayush.buyer@example.com',
      status: 'active',
    },
    {
      id: 'user-buyer-2',
      type: 'buyer',
      name: 'Sita Rai',
      phone: '9800000011',
      email: 'sita.buyer@example.com',
      status: 'suspended',
    },
    {
      id: 'user-seller-1',
      type: 'seller',
      name: 'Himalaya Traders',
      phone: '9800000020',
      email: 'himalaya.seller@example.com',
      status: 'active',
    },
    {
      id: 'user-seller-2',
      type: 'seller',
      name: 'Everest Goods',
      phone: '9800000021',
      email: 'everest.seller@example.com',
      status: 'active',
    },
    {
      id: 'user-rider-1',
      type: 'rider',
      name: 'Bikash Tamang',
      phone: '9800000030',
      email: 'bikash.rider@example.com',
      status: 'active',
    },
    {
      id: 'user-rider-2',
      type: 'rider',
      name: 'Maya Gurung',
      phone: '9800000031',
      email: 'maya.rider@example.com',
      status: 'suspended',
    },
  ]
}

function seedVerificationRequests(): VerificationRequest[] {
  return [
    {
      id: 'vr-1',
      requesterId: 'user-seller-1',
      requesterType: 'seller',
      submittedAt: '2024-01-10T09:30:00Z',
      status: 'pending',
      documents: [
        { id: 'doc-1', label: 'Business registration', url: '/mock/docs/vr-1-reg.pdf' },
        { id: 'doc-2', label: 'PAN certificate', url: '/mock/docs/vr-1-pan.pdf' },
      ],
    },
    {
      id: 'vr-2',
      requesterId: 'user-rider-1',
      requesterType: 'rider',
      submittedAt: '2024-01-11T14:05:00Z',
      status: 'pending',
      documents: [
        { id: 'doc-3', label: 'Driving licence', url: '/mock/docs/vr-2-licence.pdf' },
        { id: 'doc-4', label: 'Vehicle registration', url: '/mock/docs/vr-2-vehicle.pdf' },
      ],
    },
    {
      id: 'vr-3',
      requesterId: 'user-seller-2',
      requesterType: 'seller',
      submittedAt: '2024-01-08T11:20:00Z',
      status: 'approved',
      documents: [
        { id: 'doc-5', label: 'Business registration', url: '/mock/docs/vr-3-reg.pdf' },
      ],
    },
    {
      id: 'vr-4',
      requesterId: 'user-rider-2',
      requesterType: 'rider',
      submittedAt: '2024-01-07T16:45:00Z',
      status: 'rejected',
      documents: [
        { id: 'doc-6', label: 'Driving licence', url: '/mock/docs/vr-4-licence.pdf' },
      ],
      rejectionReason: 'Submitted licence was expired.',
    },
  ]
}

function seedOrders(): AdminOrder[] {
  return [
    {
      id: 'order-1001',
      createdAt: '2024-01-12T08:15:00Z',
      status: 'completed',
      buyer: { id: 'user-buyer-1', name: 'Ayush Chaudhary' },
      seller: { id: 'user-seller-1', name: 'Himalaya Traders' },
      rider: { id: 'user-rider-1', name: 'Bikash Tamang' },
      lineItems: [
        { id: 'li-1', name: 'Wireless Earbuds', quantity: 1, unitPricePaisa: 350_000 },
        { id: 'li-2', name: 'Phone Case', quantity: 2, unitPricePaisa: 50_000 },
      ],
      totalPaisa: 450_000,
    },
    {
      id: 'order-1002',
      createdAt: '2024-01-13T10:40:00Z',
      status: 'shipped',
      buyer: { id: 'user-buyer-2', name: 'Sita Rai' },
      seller: { id: 'user-seller-2', name: 'Everest Goods' },
      rider: { id: 'user-rider-2', name: 'Maya Gurung' },
      lineItems: [
        { id: 'li-3', name: 'Trekking Backpack', quantity: 1, unitPricePaisa: 720_000 },
      ],
      totalPaisa: 720_000,
    },
    {
      id: 'order-1003',
      createdAt: '2024-01-14T13:05:00Z',
      status: 'pending',
      buyer: { id: 'user-buyer-1', name: 'Ayush Chaudhary' },
      seller: { id: 'user-seller-1', name: 'Himalaya Traders' },
      lineItems: [
        { id: 'li-4', name: 'Water Bottle', quantity: 3, unitPricePaisa: 30_000 },
      ],
      totalPaisa: 90_000,
    },
    {
      id: 'order-1004',
      createdAt: '2024-01-09T17:25:00Z',
      status: 'completed',
      buyer: { id: 'user-buyer-2', name: 'Sita Rai' },
      seller: { id: 'user-seller-2', name: 'Everest Goods' },
      rider: { id: 'user-rider-1', name: 'Bikash Tamang' },
      lineItems: [
        { id: 'li-5', name: 'Hiking Boots', quantity: 1, unitPricePaisa: 980_000 },
      ],
      totalPaisa: 980_000,
    },
    {
      id: 'order-1005',
      createdAt: '2024-01-06T07:50:00Z',
      status: 'cancelled',
      buyer: { id: 'user-buyer-1', name: 'Ayush Chaudhary' },
      seller: { id: 'user-seller-1', name: 'Himalaya Traders' },
      lineItems: [
        { id: 'li-6', name: 'Sleeping Bag', quantity: 1, unitPricePaisa: 540_000 },
      ],
      totalPaisa: 540_000,
      cancellationReason: 'Buyer requested cancellation before dispatch.',
    },
  ]
}

function seedListings(): AdminListing[] {
  return [
    {
      id: 'listing-1',
      title: 'Wireless Earbuds Pro',
      description: 'Noise-cancelling wireless earbuds with charging case.',
      pricePaisa: 350_000,
      images: ['/mock/listings/earbuds-1.jpg', '/mock/listings/earbuds-2.jpg'],
      sellerId: 'user-seller-1',
      sellerName: 'Himalaya Traders',
      moderationStatus: 'published',
    },
    {
      id: 'listing-2',
      title: 'Trekking Backpack 60L',
      description: 'Durable weatherproof backpack for multi-day treks.',
      pricePaisa: 720_000,
      images: ['/mock/listings/backpack-1.jpg'],
      sellerId: 'user-seller-2',
      sellerName: 'Everest Goods',
      moderationStatus: 'published',
    },
    {
      id: 'listing-3',
      title: 'Counterfeit Branded Watch',
      description: 'Listing flagged for counterfeit branding.',
      pricePaisa: 150_000,
      images: ['/mock/listings/watch-1.jpg'],
      sellerId: 'user-seller-1',
      sellerName: 'Himalaya Traders',
      moderationStatus: 'removed',
      removalReason: 'Counterfeit goods are not permitted on the marketplace.',
    },
  ]
}

function seedSettings(): PlatformSetting[] {
  return [
    { id: 'platform.commission_percent', value: 10 },
    { id: 'platform.min_order_paisa', value: 50_000 },
    { id: 'delivery.max_radius_km', value: 25 },
    { id: 'delivery.base_fee_paisa', value: 8_000 },
    { id: 'payout.hold_days', value: 7 },
    { id: 'order.cancellation_window_minutes', value: 60 },
  ]
}

function seedAuditRecords(): AuditRecord[] {
  return [
    {
      id: 'verification_approve:vr-3:2024-01-08T11:25:00Z',
      actorId: 'super@chinooz.com',
      actionType: 'verification_approve',
      entityId: 'vr-3',
      details: { affectedId: 'vr-3' },
      timestamp: '2024-01-08T11:25:00Z',
    },
    {
      id: 'order_cancel:order-1005:2024-01-06T07:55:00Z',
      actorId: 'ops@chinooz.com',
      actionType: 'order_cancel',
      entityId: 'order-1005',
      details: {
        affectedId: 'order-1005',
        cancellationReason: 'Buyer requested cancellation before dispatch.',
      },
      timestamp: '2024-01-06T07:55:00Z',
    },
  ]
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Builds a fresh, fully isolated mock {@link AdminApi}. All mutable state
 * (seed records, audit log, per-identifier lockout map) lives in this closure,
 * so each instance is independent — useful for tests that want a clean slate.
 */
export function createMockAdminApi(): AdminApi {
  const admins: SeedAdmin[] = seedAdmins()
  const users: MarketplaceUser[] = seedUsers()
  const verificationRequests: VerificationRequest[] = seedVerificationRequests()
  const orders: AdminOrder[] = seedOrders()
  const listings: AdminListing[] = seedListings()
  let settings: PlatformSetting[] = seedSettings()

  // Append-only audit storage (Req 9.9): only ever pushed to, never mutated.
  const auditRecords: AuditRecord[] = seedAuditRecords()

  // Per-identifier login-failure tracking (Req 1.2 / 1.7).
  const lockoutByIdentifier = new Map<string, LockoutState>()

  function lockoutFor(identifier: string): LockoutState {
    return lockoutByIdentifier.get(identifier) ?? EMPTY_LOCKOUT_STATE
  }

  // -------------------------------------------------------------------------
  // Auth_Service (Req 1.2 / 1.7)
  // -------------------------------------------------------------------------

  const auth: AuthService = {
    async authenticate(input: AuthCredentials): Promise<AuthResult> {
      await latency()
      const now = Date.now()
      const identifier = input.identifier

      // An active lock denies every attempt during the lock window (Req 1.7).
      if (isLocked(lockoutFor(identifier), now)) {
        return { ok: false, reason: 'account_locked' }
      }

      const match = admins.find((a) => a.account.identifier === identifier)

      // Unknown identifier AND wrong password are reported identically so the
      // outcome never reveals which field was wrong (Req 1.2). Both register a
      // failure against the submitted identifier, driving the lockout window.
      if (match === undefined || match.password !== input.password) {
        lockoutByIdentifier.set(
          identifier,
          registerFailure(lockoutFor(identifier), now),
        )
        return { ok: false, reason: 'invalid_credentials' }
      }

      // Valid credentials for a zero-role (inactive) account (Req 2.2).
      if (!hasAnyRole(match.account.roles)) {
        return { ok: false, reason: 'no_role' }
      }

      // Success: clear accumulated failures and establish a session.
      lockoutByIdentifier.delete(identifier)
      const issuedAt = new Date(now).toISOString()
      const session: AdminSession = {
        adminId: match.account.id,
        roles: [...match.account.roles],
        issuedAt,
        lastSeenAt: issuedAt,
      }
      return { ok: true, session }
    },

    async signOut(_session: AdminSession): Promise<void> {
      // Idempotent: the mock holds no server-side session registry, so there is
      // nothing to invalidate. The caller clears its own session cookie.
      await latency()
    },
  }

  // -------------------------------------------------------------------------
  // AuditApi (Req 9.2 append-retry, Req 9.9 append-only)
  // -------------------------------------------------------------------------

  const audit: AuditApi = {
    async append(record: AuditRecord): Promise<AppendResult> {
      await latency()
      // Retry simulated transient persistence failures up to three times
      // (Req 9.2). On any successful attempt the record is appended and
      // returned; if every attempt fails the record is preserved for retry.
      for (let attempt = 0; attempt < MAX_APPEND_ATTEMPTS; attempt++) {
        if (persistAttemptSucceeds()) {
          auditRecords.push(record)
          return { ok: true, record }
        }
      }
      return { ok: false, reason: 'persist_failed', record }
    },

    async query(filter: AuditFilter, page: number) {
      await latency()
      // Filtering, most-recent-first ordering, and 50-per-page pagination are
      // all delegated to the pure core helper (Req 9.3 / 9.5 / 9.7).
      return pageAuditRecords(auditRecords, page, filter)
    },
  }

  // -------------------------------------------------------------------------
  // AccountsApi (Req 2.7)
  // -------------------------------------------------------------------------

  const accounts: AccountsApi = {
    async get(id: string): Promise<QueryResult<AdminAccount>> {
      await latency()
      const found = admins.find((a) => a.account.id === id)
      if (found === undefined) return { ok: false, reason: 'not_found' }
      return { ok: true, data: { ...found.account, roles: [...found.account.roles] } }
    },

    async changeRoles(
      id: string,
      roles: Role[],
    ): Promise<MutationResult<AdminAccount>> {
      await latency()
      const found = admins.find((a) => a.account.id === id)
      if (found === undefined) return { ok: false, reason: 'not_found' }
      // `active` is derived from whether any role remains assigned (Req 2.1/2.2).
      const updated: AdminAccount = {
        ...found.account,
        roles: [...roles],
        active: hasAnyRole(roles),
      }
      found.account = updated
      return { ok: true, data: { ...updated, roles: [...updated.roles] } }
    },
  }

  // -------------------------------------------------------------------------
  // UsersApi (Req 3.1–3.3, 3.6)
  // -------------------------------------------------------------------------

  const usersApi: UsersApi = {
    async list(query: UserListQuery) {
      await latency()
      // Delegate type filtering and name/phone/email search to the pure core.
      let result = filterByType(users, query.type)
      if (query.searchTerm !== undefined && query.searchTerm.length > 0) {
        result = searchUsers(result, query.searchTerm)
      }
      return paginate(result, query.page, USER_PAGE_SIZE)
    },

    async get(id: string): Promise<QueryResult<MarketplaceUser>> {
      await latency()
      const found = users.find((u) => u.id === id)
      if (found === undefined) return { ok: false, reason: 'not_found' }
      return { ok: true, data: { ...found } }
    },

    async save(user: MarketplaceUser): Promise<MutationResult<MarketplaceUser>> {
      await latency()
      const index = users.findIndex((u) => u.id === user.id)
      if (index === -1) return { ok: false, reason: 'not_found' }
      users[index] = { ...user }
      return { ok: true, data: { ...users[index] } }
    },
  }

  // -------------------------------------------------------------------------
  // ApprovalsApi (Req 4.1–4.3, 4.8)
  // -------------------------------------------------------------------------

  const approvals: ApprovalsApi = {
    async listPending(page: number) {
      await latency()
      // Pending-only derivation is delegated to the pure core (Req 4.1 / 4.8).
      return paginate(pendingOnly(verificationRequests), page, APPROVAL_PAGE_SIZE)
    },

    async get(id: string): Promise<QueryResult<VerificationRequest>> {
      await latency()
      const found = verificationRequests.find((r) => r.id === id)
      if (found === undefined) return { ok: false, reason: 'not_found' }
      return { ok: true, data: cloneRequest(found) }
    },

    async getDocuments(requestId: string) {
      await latency()
      const found = verificationRequests.find((r) => r.id === requestId)
      if (found === undefined) return { ok: false, reason: 'not_found' as const }
      return {
        ok: true as const,
        data: found.documents.map((doc) => ({ ...doc })),
      }
    },

    async save(
      request: VerificationRequest,
    ): Promise<MutationResult<VerificationRequest>> {
      await latency()
      const index = verificationRequests.findIndex((r) => r.id === request.id)
      if (index === -1) return { ok: false, reason: 'not_found' }
      verificationRequests[index] = cloneRequest(request)
      return { ok: true, data: cloneRequest(verificationRequests[index]) }
    },
  }

  // -------------------------------------------------------------------------
  // OrdersApi (Req 5.1, 5.2, 5.4)
  // -------------------------------------------------------------------------

  const ordersApi: OrdersApi = {
    async list(query: OrderListQuery) {
      await latency()
      // Status filtering and created-descending ordering are delegated to the
      // pure core helpers (Req 5.1 / 5.2).
      const filtered = filterByStatus(orders, query.status)
      const ordered = sortByCreatedDesc(filtered)
      return paginate(ordered, query.page, ORDER_PAGE_SIZE)
    },

    async get(id: string): Promise<QueryResult<AdminOrder>> {
      await latency()
      const found = orders.find((o) => o.id === id)
      if (found === undefined) return { ok: false, reason: 'not_found' }
      return { ok: true, data: cloneOrder(found) }
    },

    async save(order: AdminOrder): Promise<MutationResult<AdminOrder>> {
      await latency()
      const index = orders.findIndex((o) => o.id === order.id)
      if (index === -1) return { ok: false, reason: 'not_found' }
      orders[index] = cloneOrder(order)
      return { ok: true, data: cloneOrder(orders[index]) }
    },
  }

  // -------------------------------------------------------------------------
  // ListingsApi (Req 6.1, 6.2, 6.4)
  // -------------------------------------------------------------------------

  const listingsApi: ListingsApi = {
    async list(query: ListingListQuery) {
      await latency()
      // Moderation-status filtering is delegated to the pure core (Req 6.2).
      const filtered = filterByModerationStatus(listings, query.moderationStatus)
      return paginate(filtered, query.page, LISTING_PAGE_SIZE)
    },

    async get(id: string): Promise<QueryResult<AdminListing>> {
      await latency()
      const found = listings.find((l) => l.id === id)
      if (found === undefined) return { ok: false, reason: 'not_found' }
      return { ok: true, data: cloneListing(found) }
    },

    async save(listing: AdminListing): Promise<MutationResult<AdminListing>> {
      await latency()
      const index = listings.findIndex((l) => l.id === listing.id)
      if (index === -1) return { ok: false, reason: 'not_found' }
      listings[index] = cloneListing(listing)
      return { ok: true, data: cloneListing(listings[index]) }
    },
  }

  // -------------------------------------------------------------------------
  // AnalyticsApi (Req 7.1, 7.2)
  // -------------------------------------------------------------------------

  const analytics: AnalyticsApi = {
    async getMetrics(range) {
      await latency()
      // Aggregation over completed-in-range orders is delegated to the pure
      // core helper (Req 7.1 / 7.2). The caller validates start ≤ end first.
      return { ok: true, data: aggregateMetrics(orders, range) }
    },
  }

  // -------------------------------------------------------------------------
  // SettingsApi (Req 8.1, 8.5)
  // -------------------------------------------------------------------------

  const settingsApi: SettingsApi = {
    async list(): Promise<QueryResult<PlatformSetting[]>> {
      await latency()
      return { ok: true, data: settings.map((s) => ({ ...s })) }
    },

    async save(changes) {
      await latency()
      // The change set has already been validated (admin-core/settings); apply
      // each change to the matching setting, all-or-nothing in this snapshot.
      const next = settings.map((setting) => {
        const change = changes.find((c) => c.id === setting.id)
        return change === undefined ? { ...setting } : { ...setting, value: change.next }
      })
      settings = next
      return { ok: true, data: settings.map((s) => ({ ...s })) }
    },
  }

  return {
    auth,
    audit,
    accounts,
    users: usersApi,
    approvals,
    orders: ordersApi,
    listings: listingsApi,
    analytics,
    settings: settingsApi,
  }
}

// ---------------------------------------------------------------------------
// Defensive clone helpers (keep seed/internal state isolated from callers)
// ---------------------------------------------------------------------------

function cloneRequest(request: VerificationRequest): VerificationRequest {
  return {
    ...request,
    documents: request.documents.map((doc) => ({ ...doc })),
  }
}

function cloneOrder(order: AdminOrder): AdminOrder {
  const clone: AdminOrder = {
    ...order,
    buyer: { ...order.buyer },
    seller: { ...order.seller },
    lineItems: order.lineItems.map((item) => ({ ...item })),
  }
  if (order.rider !== undefined) {
    clone.rider = { ...order.rider }
  }
  return clone
}

function cloneListing(listing: AdminListing): AdminListing {
  return { ...listing, images: [...listing.images] }
}

/**
 * Shared default mock instance for the app to depend on. Tests that need an
 * isolated, reset data set should call {@link createMockAdminApi} instead.
 */
export const mockAdminApi: AdminApi = createMockAdminApi()
