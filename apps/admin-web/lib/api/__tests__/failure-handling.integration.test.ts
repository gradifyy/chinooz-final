import { describe, it, expect } from 'vitest'

import { decide } from '../../admin-core/approvals'
import { validateDateRange } from '../../admin-core/analytics'
import {
  SETTING_DEFS,
  diffSettings,
  validateSettings,
} from '../../admin-core/settings'
import { aggregateMetrics } from '../../admin-core/analytics'
import type {
  AdminAccount,
  AdminListing,
  AdminOrder,
  AdminSession,
  AuditRecord,
  DateRange,
  MarketplaceUser,
  Metrics,
  Page,
  PlatformSetting,
  Role,
  SettingChange,
  VerificationDocument,
  VerificationRequest,
  VerificationStatus,
} from '../../admin-core/types'
import type { AuditFilter } from '../../admin-core/audit'
import type {
  AdminApi,
  AppendResult,
  AuthCredentials,
  AuthResult,
  ListingListQuery,
  MutationResult,
  OrderListQuery,
  QueryResult,
  UserListQuery,
} from '../types'

/**
 * Integration tests for the {@link AdminApi} retrieval/persistence failure
 * paths (task 16.3), run against a single controllable {@link AdminApi} double.
 *
 * These are example/integration tests (not property tests) per the design's
 * Testing Strategy, and follow the same pattern as `audit.integration.test.ts`:
 * a fully self-contained test double whose per-method success/failure can be
 * configured deterministically, so each failure mode can be reproduced without
 * relying on the randomized behavior of the production `mock.ts`.
 *
 * Each test mirrors the orchestration of the corresponding production
 * consumer (the approval detail page / the analytics + settings server
 * actions) by reusing the real pure `lib/admin-core` helpers (`decide`,
 * `validateDateRange`, `validateSettings`/`diffSettings`) over the controllable
 * double's I/O. This exercises the actual failure-handling combination — error
 * surfaced + domain state preserved — that each requirement mandates.
 *
 * Validates:
 * - Requirement 4.3 — when documents for a selected Verification_Request cannot
 *   be retrieved, an error indication is surfaced AND the request is preserved
 *   in its pending status.
 * - Requirement 7.6 — when metrics retrieval fails, an error is surfaced AND a
 *   retry path is available that succeeds once retrieval recovers.
 * - Requirement 8.5 — when persisting a valid settings change fails, all
 *   previously persisted setting values are left unchanged AND an error is
 *   surfaced.
 */

// ---------------------------------------------------------------------------
// Controllable AdminApi double
// ---------------------------------------------------------------------------

/** Imperative controls a test uses to drive the double's failure behavior. */
interface AdminApiControls {
  /** When true, `approvals.getDocuments` reports a retrieval failure (Req 4.3). */
  setDocumentRetrievalFails(fails: boolean): void
  /**
   * Queue `count` consecutive `analytics.getMetrics` retrieval failures; each
   * call consumes one queued failure, after which retrieval succeeds (Req 7.6).
   */
  queueMetricsFailures(count: number): void
  /** When true, `settings.save` reports a persistence failure (Req 8.5). */
  setSettingsPersistFails(fails: boolean): void
  /** Snapshot of the currently persisted settings (for unchanged assertions). */
  currentSettings(): PlatformSetting[]
  /** Current persisted status of a verification request, or undefined. */
  currentRequestStatus(id: string): VerificationStatus | undefined
}

/** A controllable {@link AdminApi} double plus its imperative {@link controls}. */
interface ControllableAdminApi extends AdminApi {
  readonly controls: AdminApiControls
}

/** Builds the (small) fixture data the relevant sub-services read from. */
function seedRequests(): VerificationRequest[] {
  return [
    {
      id: 'vr-1',
      requesterId: 'user-seller-1',
      requesterType: 'seller',
      submittedAt: '2024-01-10T09:30:00Z',
      status: 'pending',
      documents: [
        { id: 'doc-1', label: 'Business registration', url: '/mock/vr-1.pdf' },
      ],
    },
  ]
}

function seedSettings(): PlatformSetting[] {
  return [
    { id: 'platform.commission_percent', value: 10 },
    { id: 'delivery.max_radius_km', value: 25 },
    { id: 'payout.hold_days', value: 7 },
  ]
}

function seedCompletedOrders(): AdminOrder[] {
  return [
    {
      id: 'order-1',
      createdAt: '2024-01-12T08:15:00Z',
      status: 'completed',
      buyer: { id: 'user-buyer-1', name: 'Buyer One' },
      seller: { id: 'user-seller-1', name: 'Seller One' },
      rider: { id: 'user-rider-1', name: 'Rider One' },
      lineItems: [
        { id: 'li-1', name: 'Item', quantity: 1, unitPricePaisa: 450_000 },
      ],
      totalPaisa: 450_000,
    },
  ]
}

/** A clone helper keeping the double's internal state isolated from callers. */
function cloneRequest(request: VerificationRequest): VerificationRequest {
  return { ...request, documents: request.documents.map((d) => ({ ...d })) }
}

/**
 * Creates a fresh, fully isolated controllable {@link AdminApi}.
 *
 * The three sub-services exercised by task 16.3 (`approvals`, `analytics`,
 * `settings`) carry controllable failure state; the remaining sub-services are
 * implemented as minimal, type-safe stubs so the object is a complete `AdminApi`
 * without using `any`. All mutable state lives in this closure, so each
 * instance is independent.
 */
function createControllableAdminApi(): ControllableAdminApi {
  const requests: VerificationRequest[] = seedRequests()
  let settings: PlatformSetting[] = seedSettings()
  const orders: AdminOrder[] = seedCompletedOrders()

  let documentRetrievalFails = false
  let queuedMetricsFailures = 0
  let settingsPersistFails = false

  const emptyPage = <T>(page: number): Page<T> => ({
    items: [],
    page,
    pageSize: 0,
    total: 0,
  })

  const api: AdminApi = {
    auth: {
      async authenticate(_input: AuthCredentials): Promise<AuthResult> {
        return { ok: false, reason: 'invalid_credentials' }
      },
      async signOut(_session: AdminSession): Promise<void> {},
    },
    audit: {
      async append(record: AuditRecord): Promise<AppendResult> {
        return { ok: true, record }
      },
      async query(_filter: AuditFilter, page: number): Promise<Page<AuditRecord>> {
        return emptyPage<AuditRecord>(page)
      },
    },
    accounts: {
      async get(_id: string): Promise<QueryResult<AdminAccount>> {
        return { ok: false, reason: 'not_found' }
      },
      async changeRoles(
        _id: string,
        _roles: Role[],
      ): Promise<MutationResult<AdminAccount>> {
        return { ok: false, reason: 'not_found' }
      },
    },
    users: {
      async list(_query: UserListQuery): Promise<Page<MarketplaceUser>> {
        return emptyPage<MarketplaceUser>(_query.page)
      },
      async get(_id: string): Promise<QueryResult<MarketplaceUser>> {
        return { ok: false, reason: 'not_found' }
      },
      async save(
        user: MarketplaceUser,
      ): Promise<MutationResult<MarketplaceUser>> {
        return { ok: true, data: { ...user } }
      },
    },
    approvals: {
      async listPending(page: number): Promise<Page<VerificationRequest>> {
        const items = requests
          .filter((r) => r.status === 'pending')
          .map(cloneRequest)
        return { items, page, pageSize: 25, total: items.length }
      },
      async get(id: string): Promise<QueryResult<VerificationRequest>> {
        const found = requests.find((r) => r.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: cloneRequest(found) }
      },
      async getDocuments(
        requestId: string,
      ): Promise<QueryResult<VerificationDocument[]>> {
        // Simulated retrieval failure (Req 4.3): surface a failure without
        // touching the request's stored status.
        if (documentRetrievalFails) {
          return { ok: false, reason: 'retrieval_failed' }
        }
        const found = requests.find((r) => r.id === requestId)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: found.documents.map((d) => ({ ...d })) }
      },
      async save(
        request: VerificationRequest,
      ): Promise<MutationResult<VerificationRequest>> {
        const index = requests.findIndex((r) => r.id === request.id)
        if (index === -1) return { ok: false, reason: 'not_found' }
        requests[index] = cloneRequest(request)
        return { ok: true, data: cloneRequest(requests[index]) }
      },
    },
    orders: {
      async list(_query: OrderListQuery): Promise<Page<AdminOrder>> {
        return emptyPage<AdminOrder>(_query.page)
      },
      async get(_id: string): Promise<QueryResult<AdminOrder>> {
        return { ok: false, reason: 'not_found' }
      },
      async save(order: AdminOrder): Promise<MutationResult<AdminOrder>> {
        return { ok: true, data: order }
      },
    },
    listings: {
      async list(_query: ListingListQuery): Promise<Page<AdminListing>> {
        return emptyPage<AdminListing>(_query.page)
      },
      async get(_id: string): Promise<QueryResult<AdminListing>> {
        return { ok: false, reason: 'not_found' }
      },
      async save(listing: AdminListing): Promise<MutationResult<AdminListing>> {
        return { ok: true, data: listing }
      },
    },
    analytics: {
      async getMetrics(range: DateRange): Promise<QueryResult<Metrics>> {
        // Consume one queued failure per call (Req 7.6): retrieval recovers
        // once the queue drains, so a retry can succeed.
        if (queuedMetricsFailures > 0) {
          queuedMetricsFailures--
          return { ok: false, reason: 'retrieval_failed' }
        }
        return { ok: true, data: aggregateMetrics(orders, range) }
      },
    },
    settings: {
      async list(): Promise<QueryResult<PlatformSetting[]>> {
        return { ok: true, data: settings.map((s) => ({ ...s })) }
      },
      async save(
        changes: SettingChange[],
      ): Promise<MutationResult<PlatformSetting[]>> {
        // Simulated persistence failure (Req 8.5): leave the persisted snapshot
        // entirely unchanged and report the failure.
        if (settingsPersistFails) {
          return { ok: false, reason: 'persist_failed' }
        }
        settings = settings.map((setting) => {
          const change = changes.find((c) => c.id === setting.id)
          return change === undefined
            ? { ...setting }
            : { ...setting, value: change.next }
        })
        return { ok: true, data: settings.map((s) => ({ ...s })) }
      },
    },
  }

  const controls: AdminApiControls = {
    setDocumentRetrievalFails(fails: boolean): void {
      documentRetrievalFails = fails
    },
    queueMetricsFailures(count: number): void {
      queuedMetricsFailures = count
    },
    setSettingsPersistFails(fails: boolean): void {
      settingsPersistFails = fails
    },
    currentSettings(): PlatformSetting[] {
      return settings.map((s) => ({ ...s }))
    },
    currentRequestStatus(id: string): VerificationStatus | undefined {
      return requests.find((r) => r.id === id)?.status
    },
  }

  return { ...api, controls }
}

// ---------------------------------------------------------------------------
// Orchestration mirrors — reuse the real pure helpers over the double's I/O,
// matching the production approval detail page / analytics + settings actions.
// ---------------------------------------------------------------------------

/** Outcome of loading an approval detail view (mirrors the detail page). */
interface ApprovalDetailView {
  request: VerificationRequest
  /** True when the document list could not be retrieved (Req 4.3 error state). */
  documentsError: boolean
}

/**
 * Mirrors the approval detail page (Req 4.1–4.3): retrieve the request, then
 * fetch its documents separately. A document-retrieval failure becomes an
 * error indication and leaves the request untouched (no decision is made).
 */
async function loadApprovalDetail(
  api: AdminApi,
  id: string,
): Promise<{ ok: false; reason: string } | { ok: true; view: ApprovalDetailView }> {
  const found = await api.approvals.get(id)
  if (!found.ok) return { ok: false, reason: found.reason }
  const docs = await api.approvals.getDocuments(id)
  return { ok: true, view: { request: found.data, documentsError: !docs.ok } }
}

/** Mirror of the analytics action result (Req 7.6). */
type FetchMetricsOutcome =
  | { ok: true; metrics: Metrics }
  | { ok: false; reason: 'invalid_range' | 'load_failed' }

/**
 * Mirrors `fetchMetricsAction` (Req 7.5 / 7.6): validate the range, then
 * retrieve metrics. A retrieval failure is surfaced as `load_failed` so the
 * caller can present a retry control.
 */
async function fetchMetrics(
  api: AdminApi,
  start: string,
  end: string,
): Promise<FetchMetricsOutcome> {
  if (!validateDateRange(start, end).ok) {
    return { ok: false, reason: 'invalid_range' }
  }
  const range: DateRange = {
    start: `${start}T00:00:00.000Z`,
    end: `${end}T23:59:59.999Z`,
  }
  const result = await api.analytics.getMetrics(range)
  if (!result.ok) return { ok: false, reason: 'load_failed' }
  return { ok: true, metrics: result.data }
}

/** Mirror of the settings action result (Req 8.4 / 8.5). */
type SaveSettingsOutcome =
  | { ok: true; settings: PlatformSetting[] }
  | { ok: false; reason: 'retrieval_failed' | 'invalid' | 'persist_failed' }

/**
 * Mirrors `saveSettings` (Req 8.4 / 8.5): load current values, build and
 * all-or-nothing validate the change set, then persist. A persistence failure
 * is surfaced and leaves previously persisted values unchanged.
 */
async function persistSettings(
  api: AdminApi,
  proposed: ReadonlyMap<string, number>,
): Promise<SaveSettingsOutcome> {
  const current = await api.settings.list()
  if (!current.ok) return { ok: false, reason: 'retrieval_failed' }

  const submitted: SettingChange[] = current.data.map((setting) => ({
    id: setting.id,
    previous: setting.value,
    next: proposed.get(setting.id) ?? setting.value,
  }))

  const validation = validateSettings(SETTING_DEFS, submitted)
  if (!validation.ok) return { ok: false, reason: 'invalid' }
  if (validation.changed.length === 0) return { ok: true, settings: current.data }

  const saved = await api.settings.save(validation.changed)
  if (!saved.ok) return { ok: false, reason: 'persist_failed' }

  // (diffSettings would build audit records here in production; computed to
  // mirror the real flow even though the audit append is out of scope here.)
  diffSettings(current.data, saved.data)
  return { ok: true, settings: saved.data }
}

// ---------------------------------------------------------------------------
// Req 4.3 — document-retrieval failure keeps the request pending + shows error
// ---------------------------------------------------------------------------

describe('Approval_Module document-retrieval failure (Req 4.3)', () => {
  it('surfaces an error indication while keeping the request pending', async () => {
    const api = createControllableAdminApi()
    api.controls.setDocumentRetrievalFails(true)

    const loaded = await loadApprovalDetail(api, 'vr-1')

    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      // Error indication is surfaced for the documents...
      expect(loaded.view.documentsError).toBe(true)
      // ...and the request itself is still pending (no decision was made).
      expect(loaded.view.request.status).toBe('pending')
    }
    // The persisted request status is preserved as pending after the failure.
    expect(api.controls.currentRequestStatus('vr-1')).toBe('pending')
  })

  it('still allows a decision to succeed once retrieval recovers', async () => {
    const api = createControllableAdminApi()

    // A failed document retrieval must not have blocked the pending request:
    // a subsequent approve decision still persists.
    api.controls.setDocumentRetrievalFails(true)
    await loadApprovalDetail(api, 'vr-1')
    expect(api.controls.currentRequestStatus('vr-1')).toBe('pending')

    const found = await api.approvals.get('vr-1')
    expect(found.ok).toBe(true)
    if (found.ok) {
      const outcome = decide(found.data, 'approve')
      expect(outcome.ok).toBe(true)
      if (outcome.ok) {
        const persisted = await api.approvals.save(outcome.request)
        expect(persisted.ok).toBe(true)
      }
    }
    expect(api.controls.currentRequestStatus('vr-1')).toBe('approved')
  })

  it('renders the documents normally when retrieval succeeds', async () => {
    const api = createControllableAdminApi()

    const loaded = await loadApprovalDetail(api, 'vr-1')

    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.view.documentsError).toBe(false)
      expect(loaded.view.request.status).toBe('pending')
    }
  })
})

// ---------------------------------------------------------------------------
// Req 7.6 — metrics-retrieval failure shows error + retry succeeds
// ---------------------------------------------------------------------------

describe('Analytics_Module metrics-retrieval failure (Req 7.6)', () => {
  it('surfaces a load error when retrieval fails', async () => {
    const api = createControllableAdminApi()
    api.controls.queueMetricsFailures(1)

    const result = await fetchMetrics(api, '2024-01-01', '2024-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('load_failed')
    }
  })

  it('succeeds on retry once retrieval recovers', async () => {
    const api = createControllableAdminApi()

    // One transient failure, then the retry succeeds.
    api.controls.queueMetricsFailures(1)

    const first = await fetchMetrics(api, '2024-01-01', '2024-01-31')
    expect(first.ok).toBe(false)

    const retried = await fetchMetrics(api, '2024-01-01', '2024-01-31')
    expect(retried.ok).toBe(true)
    if (retried.ok) {
      // The recovered retrieval returns real aggregated metrics for the range.
      expect(retried.metrics.totalOrders).toBe(1)
      expect(retried.metrics.totalSalesPaisa).toBe(450_000)
    }
  })
})

// ---------------------------------------------------------------------------
// Req 8.5 — settings persistence failure leaves values unchanged + shows error
// ---------------------------------------------------------------------------

describe('Settings_Module persistence failure (Req 8.5)', () => {
  it('surfaces a persistence error and leaves previously persisted values unchanged', async () => {
    const api = createControllableAdminApi()
    const before = api.controls.currentSettings()
    api.controls.setSettingsPersistFails(true)

    // A valid change (commission 10 -> 12) whose persistence fails.
    const proposed = new Map<string, number>([
      ['platform.commission_percent', 12],
    ])
    const result = await persistSettings(api, proposed)

    // Error surfaced...
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('persist_failed')
    }
    // ...and every previously persisted value is left unchanged.
    expect(api.controls.currentSettings()).toEqual(before)
    const reread = await api.settings.list()
    expect(reread.ok).toBe(true)
    if (reread.ok) {
      expect(reread.data).toEqual(before)
    }
  })

  it('persists the change when persistence succeeds', async () => {
    const api = createControllableAdminApi()

    const proposed = new Map<string, number>([
      ['platform.commission_percent', 12],
    ])
    const result = await persistSettings(api, proposed)

    expect(result.ok).toBe(true)
    const commission = api.controls
      .currentSettings()
      .find((s) => s.id === 'platform.commission_percent')
    expect(commission?.value).toBe(12)
  })
})
