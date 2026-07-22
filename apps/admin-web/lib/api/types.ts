/**
 * AdminApi interface — the I/O boundary for the Admin Dashboard.
 *
 * This module declares the `AdminApi` service interface: the thin layer
 * (design.md "Layering Rules" #2) that data fetching and persistence flow
 * through. It composes the {@link AuthService} and {@link AuditApi} together
 * with a per-module set of data/query/mutation methods. Every method returns a
 * typed domain object (reusing the domain types in
 * `lib/admin-core/types.ts`) and, where an operation can fail or be guarded,
 * a discriminated result so callers must handle each outcome explicitly.
 *
 * This is a PURE type declaration file: no runtime I/O, no implementation.
 * The mock implementation that wraps `@chinooz/mock-data` (simulated latency,
 * per-identifier lockout/rate-limit state, append-retry, append-only audit
 * with no mutators) lands in `lib/api/mock.ts` (task 16.2); a real HTTP
 * implementation can later be substituted behind this same interface without
 * touching the UI or the pure domain logic in `lib/admin-core`.
 *
 * Division of responsibility (see design.md "Layering Rules"):
 * - Guarded transition decisions, validation, pagination, aggregation, and
 *   audit-record construction are PURE and live in `lib/admin-core`.
 * - This interface owns I/O outcomes only: retrieval success/failure
 *   (Req 4.3, 7.6), persistence success/failure (Req 8.5), authentication
 *   outcomes that never reveal which field was wrong (Req 1.2), and the
 *   append-only, retry-on-failure audit log (Req 9.2, 9.9).
 *
 * See design.md "Components and Interfaces" (Auth_Service, AuditApi) and
 * "Data Models".
 *
 * _Requirements: 1.2, 9.2, 9.9_
 */

import type { AuditFilter } from '../admin-core/audit'
import type {
  AdminAccount,
  AdminListing,
  AdminOrder,
  AdminSession,
  AuditRecord,
  DateRange,
  MarketplaceUser,
  Metrics,
  ModerationStatus,
  OrderStatus,
  Page,
  PlatformSetting,
  Role,
  SettingChange,
  UserType,
  VerificationDocument,
  VerificationRequest,
} from '../admin-core/types'

// Re-exported so consumers of the API layer can refer to audit filtering
// without reaching into the pure core module.
export type { AuditFilter } from '../admin-core/audit'

// ---------------------------------------------------------------------------
// Generic discriminated I/O results
// ---------------------------------------------------------------------------

/**
 * Outcome of a read that may fail to locate or retrieve the requested data.
 *
 * - `ok: true` carries the retrieved `data`.
 * - `reason: 'not_found'` — the entity does not exist.
 * - `reason: 'retrieval_failed'` — retrieval failed (e.g. an upstream/document
 *   fetch error per Req 4.3, or a metrics-load error per Req 7.6); callers
 *   surface an error indication and leave domain state unchanged.
 */
export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not_found' | 'retrieval_failed' }

/**
 * Outcome of a write that persists an already-decided new domain state.
 *
 * The guarded transition decision (whether the change is even permitted) is
 * made by the pure `lib/admin-core` logic before this method is called; this
 * result reports only the persistence outcome.
 *
 * - `ok: true` carries the persisted `data`.
 * - `reason: 'not_found'` — the target entity no longer exists.
 * - `reason: 'persist_failed'` — persistence failed; the caller retains the
 *   previously persisted values unchanged and surfaces an error (Req 8.5).
 */
export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not_found' | 'persist_failed' }

// ---------------------------------------------------------------------------
// Auth_Service (Requirement 1 — Req 1.2)
// ---------------------------------------------------------------------------

/** Credentials submitted to {@link AuthService.authenticate}. */
export interface AuthCredentials {
  identifier: string
  password: string
}

/**
 * Result of an authentication attempt.
 *
 * On success it carries the established {@link AdminSession}. On failure it
 * carries a discriminated `reason` that is deliberately coarse for credential
 * problems: `'invalid_credentials'` is returned for BOTH an unknown identifier
 * AND a wrong password, so the outcome never reveals which field was wrong
 * (Req 1.2 / 1.3). `'account_locked'` reflects the lockout window after
 * repeated failures (Req 1.7); `'no_role'` reflects a zero-role, inactive
 * account (Req 2.2). Callers map every failure reason to a single generic
 * error message in the UI.
 */
export type AuthResult =
  | { ok: true; session: AdminSession }
  | {
      ok: false
      reason: 'invalid_credentials' | 'account_locked' | 'no_role'
    }

/**
 * Authenticates administrators and terminates sessions (Requirement 1).
 *
 * Per-identifier lockout and rate-limit state are tracked inside the
 * implementation (the `AdminApi` layer), not exposed here.
 */
export interface AuthService {
  /**
   * Verifies the submitted credentials and, on success, establishes a session.
   * Returns a discriminated {@link AuthResult}; credential failures are
   * reported generically so the caller cannot tell whether the identifier or
   * the password was wrong (Req 1.2 / 1.3).
   */
  authenticate(input: AuthCredentials): Promise<AuthResult>

  /** Terminates the given session (Req 1.4). Idempotent. */
  signOut(session: AdminSession): Promise<void>
}

// ---------------------------------------------------------------------------
// AuditApi (Requirement 9 — Req 9.2, 9.9)
// ---------------------------------------------------------------------------

/**
 * Outcome of appending an audit record.
 *
 * The implementation retries persistence up to three times (Req 9.2). On
 * success it carries the persisted `record`. On continued failure it returns
 * `reason: 'persist_failed'` together with the original `record` so the action
 * data is preserved for a later retry and an error indication can be surfaced
 * to the Administrator (Req 9.2).
 */
export type AppendResult =
  | { ok: true; record: AuditRecord }
  | { ok: false; reason: 'persist_failed'; record: AuditRecord }

/**
 * Append-only audit log (Requirement 9).
 *
 * The interface intentionally exposes only `append` and `query` — there is NO
 * update or delete method, enforcing append-only immutability at the type
 * level (Req 9.9): any attempt to modify or delete an existing entry is
 * unrepresentable through this API. Retention (≥365 days, Req 9.8) and the
 * retry-with-preservation behavior (Req 9.2) are properties of the
 * implementation/storage behind this interface.
 */
export interface AuditApi {
  /**
   * Appends a record to the audit log, retrying persistence up to three times
   * on failure and otherwise preserving the record for retry (Req 9.2).
   */
  append(record: AuditRecord): Promise<AppendResult>

  /**
   * Returns a most-recent-first page of audit records matching `filter`, 50
   * records per page (Req 9.3 / 9.5 / 9.7). An empty match yields a page with
   * zero items.
   */
  query(filter: AuditFilter, page: number): Promise<Page<AuditRecord>>
}

// ---------------------------------------------------------------------------
// Administrator accounts (Requirement 2 — Req 2.7)
// ---------------------------------------------------------------------------

/**
 * Read/mutate administrator accounts. Role-assignment changes flow through
 * here so the action layer can append the role-change audit record (Req 2.7).
 */
export interface AccountsApi {
  /** Retrieves a single administrator account by id. */
  get(id: string): Promise<QueryResult<AdminAccount>>

  /**
   * Persists a new role assignment for the administrator. The `active` flag is
   * derived from whether `roles` is non-empty (Req 2.1 / 2.2). The role-change
   * audit record (Req 2.7) is built by the pure core helper and appended via
   * {@link AuditApi.append} in the action layer.
   */
  changeRoles(id: string, roles: Role[]): Promise<MutationResult<AdminAccount>>
}

// ---------------------------------------------------------------------------
// Marketplace user management (Requirement 3)
// ---------------------------------------------------------------------------

/**
 * Query parameters for the marketplace-user list. `type` narrows by user type
 * (Req 3.2), `searchTerm` matches name/phone/email (Req 3.3), and `page`
 * selects the 1-based page (25 records per page, Req 3.1). The pure core
 * validates the search term length and performs the actual filtering/search;
 * the implementation may push these down or apply core helpers internally.
 */
export interface UserListQuery {
  type?: UserType
  searchTerm?: string
  page: number
}

/** Read/mutate marketplace user accounts (User_Management_Module). */
export interface UsersApi {
  /** Returns a page of marketplace users matching the query (Req 3.1–3.3). */
  list(query: UserListQuery): Promise<Page<MarketplaceUser>>

  /** Retrieves a single marketplace user's details (Req 3.6). */
  get(id: string): Promise<QueryResult<MarketplaceUser>>

  /**
   * Persists an already-decided status change. The guarded suspend/reactivate
   * transition (Req 3.7–3.9) is decided by `admin-core/users.applyStatusChange`
   * before this is called; `user` is the resulting record to persist.
   */
  save(user: MarketplaceUser): Promise<MutationResult<MarketplaceUser>>
}

// ---------------------------------------------------------------------------
// Verification approvals (Requirement 4)
// ---------------------------------------------------------------------------

/** Read/mutate verification requests (Approval_Module). */
export interface ApprovalsApi {
  /**
   * Returns a page of pending verification requests, each exposing requester
   * identity, requester type, and submission timestamp (Req 4.1 / 4.8).
   */
  listPending(page: number): Promise<Page<VerificationRequest>>

  /** Retrieves a single verification request's submitted details (Req 4.2). */
  get(id: string): Promise<QueryResult<VerificationRequest>>

  /**
   * Retrieves the documents attached to a verification request. A
   * `retrieval_failed` result lets the caller display an error indication and
   * preserve the request in its pending status (Req 4.3).
   */
  getDocuments(
    requestId: string,
  ): Promise<QueryResult<VerificationDocument[]>>

  /**
   * Persists an already-decided verification decision. The guarded
   * approve/reject transition and reason validation (Req 4.4–4.7) are decided
   * by `admin-core/approvals.decide`; `request` is the resulting record.
   */
  save(
    request: VerificationRequest,
  ): Promise<MutationResult<VerificationRequest>>
}

// ---------------------------------------------------------------------------
// Order management (Requirement 5)
// ---------------------------------------------------------------------------

/**
 * Query parameters for the order list. `status` narrows by order status
 * (Req 5.2); `page` selects the 1-based page (25 per page, created-descending,
 * Req 5.1). Ordering is applied by the pure core / implementation.
 */
export interface OrderListQuery {
  status?: OrderStatus
  page: number
}

/** Read/mutate orders (Order_Management_Module). */
export interface OrdersApi {
  /**
   * Returns a page of orders matching the query, ordered by creation timestamp
   * descending (Req 5.1 / 5.2).
   */
  list(query: OrderListQuery): Promise<Page<AdminOrder>>

  /**
   * Retrieves a single order's details (buyer, seller, rider, line items, and
   * total in paisa — formatted to NPR by the core view-model builder, Req 5.4).
   */
  get(id: string): Promise<QueryResult<AdminOrder>>

  /**
   * Persists an already-decided cancellation. The guarded cancellation
   * transition and reason validation (Req 5.6–5.8) are decided by
   * `admin-core/orders.cancelOrder`; `order` is the resulting record.
   */
  save(order: AdminOrder): Promise<MutationResult<AdminOrder>>
}

// ---------------------------------------------------------------------------
// Listing moderation (Requirement 6)
// ---------------------------------------------------------------------------

/**
 * Query parameters for the listing list. `moderationStatus` narrows by
 * moderation status (Req 6.2); `page` selects the 1-based page (≤50 per page,
 * Req 6.1).
 */
export interface ListingListQuery {
  moderationStatus?: ModerationStatus
  page: number
}

/** Read/mutate listings (Listing_Moderation_Module). */
export interface ListingsApi {
  /** Returns a page of listings matching the query (Req 6.1 / 6.2). */
  list(query: ListingListQuery): Promise<Page<AdminListing>>

  /**
   * Retrieves a single listing's details (title, description, price in paisa,
   * images, seller — formatted to NPR by the core view-model builder, Req 6.4).
   */
  get(id: string): Promise<QueryResult<AdminListing>>

  /**
   * Persists an already-decided moderation change. The guarded
   * remove/reinstate transition and removal-reason validation (Req 6.5–6.7)
   * are decided by `admin-core/listings.moderate`; `listing` is the result.
   */
  save(listing: AdminListing): Promise<MutationResult<AdminListing>>
}

// ---------------------------------------------------------------------------
// Operational analytics (Requirement 7)
// ---------------------------------------------------------------------------

/** Read aggregated operational metrics (Analytics_Module). */
export interface AnalyticsApi {
  /**
   * Retrieves aggregated metrics over the inclusive `range` (Req 7.1 / 7.2).
   * The date-range validity check (start ≤ end, Req 7.5) is performed by
   * `admin-core/analytics.validateDateRange` before this is called. A
   * `retrieval_failed` result lets the caller surface an error and present a
   * retry control while retaining the previously displayed metrics (Req 7.6).
   */
  getMetrics(range: DateRange): Promise<QueryResult<Metrics>>
}

// ---------------------------------------------------------------------------
// Platform settings (Requirement 8)
// ---------------------------------------------------------------------------

/** Read/mutate platform settings (Settings_Module, Super_Admin only). */
export interface SettingsApi {
  /** Retrieves the current persisted value of each platform setting (Req 8.1). */
  list(): Promise<QueryResult<PlatformSetting[]>>

  /**
   * Persists a validated, all-or-nothing settings change set and returns the
   * resulting persisted settings. The range validation (Req 8.2 / 8.4) is done
   * by `admin-core/settings.validateSettings` before this is called; a
   * `persist_failed` result leaves all previously persisted values unchanged
   * so the caller can surface an error (Req 8.5).
   */
  save(changes: SettingChange[]): Promise<MutationResult<PlatformSetting[]>>
}

// ---------------------------------------------------------------------------
// Composed AdminApi
// ---------------------------------------------------------------------------

/**
 * The complete Admin Dashboard service interface.
 *
 * Composes the authentication service, the append-only audit log, and the
 * per-module data/query/mutation services. The UI and server actions depend
 * only on this interface; the concrete data source (mock now, HTTP later) is
 * injected behind it. Sub-services are exposed as readonly fields so an
 * implementation is assembled once and not reassigned.
 */
export interface AdminApi {
  readonly auth: AuthService
  readonly audit: AuditApi
  readonly accounts: AccountsApi
  readonly users: UsersApi
  readonly approvals: ApprovalsApi
  readonly orders: OrdersApi
  readonly listings: ListingsApi
  readonly analytics: AnalyticsApi
  readonly settings: SettingsApi
}
