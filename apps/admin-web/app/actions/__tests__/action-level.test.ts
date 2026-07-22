import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AdminAccount,
  AdminListing,
  AdminOrder,
  AdminSession,
  AuditRecord,
  MarketplaceUser,
  Page,
  PlatformSetting,
  Role,
  SettingChange,
  VerificationRequest,
  VerificationStatus,
} from '@/lib/admin-core/types'
import type { AuditFilter } from '@/lib/admin-core/audit'
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
} from '@/lib/api/types'

/**
 * Action-level tests for the Admin Dashboard server actions (task 18.8).
 *
 * These are example/integration tests at the `app/actions` orchestration layer
 * (one layer above the pure `lib/admin-core` logic), per the design's Testing
 * Strategy. They assert the three guarantees the action layer owns:
 *
 *  1. Denied actions — the acting roles lack the required permission — perform
 *     NO mutation and leave all data unchanged (Req 2.4 / 2.6).
 *  2. Blocked actions — a guarded domain transition refuses (cancelling a
 *     completed order, deciding an already-processed request, suspending an
 *     already-suspended user, removing with an invalid reason) — perform NO
 *     mutation and leave all data unchanged.
 *  3. When the Audit_Log append fails after its retries, the action surfaces an
 *     `audit_failed` error while preserving the recorded action data for retry
 *     (Req 9.2).
 *
 * The real server actions are exercised directly. Their two non-pure
 * dependencies — the shared `mockAdminApi` (the I/O boundary) and `readSession`
 * (the session cookie reader) — are replaced with controllable doubles so each
 * outcome (forbidden, blocked, audit-failure) can be reproduced
 * deterministically, and so every persistence is observable (the double records
 * each mutator call). `next/cache` `revalidatePath` is a no-op under test.
 *
 * Validates: Requirements 2.4, 2.6, 9.2
 */

// ---------------------------------------------------------------------------
// Hoisted mock state — shared between the vi.mock factories and the tests.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  // Holder for the active controllable AdminApi double; the action layer reads
  // `mockAdminApi` at call time, so swapping this per test is sufficient.
  apiRef: { current: undefined as unknown as AdminApi },
  // The session the action sees; configured per test.
  readSession: vi.fn<() => Promise<AdminSession | null>>(),
}))

vi.mock('@/lib/api/mock', () => ({
  get mockAdminApi(): AdminApi {
    return mocks.apiRef.current
  },
}))

vi.mock('@/lib/session', () => ({
  readSession: mocks.readSession,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Imported after the mocks are registered so the actions bind to the doubles.
import {
  reactivateUser,
  suspendUser,
  type UserStatusActionResult,
} from '../users'
import { approveRequest, rejectRequest } from '../approvals'
import { cancelOrderAction } from '../orders'
import { removeListing, reinstateListing } from '../listings'
import { saveSettings } from '../settings'
import { changeAdminRoles } from '../roles'

// ---------------------------------------------------------------------------
// Controllable AdminApi double with mutation tracking + audit-failure mode.
// ---------------------------------------------------------------------------

/** Records every mutator the action layer invokes, for "no mutation" asserts. */
type MutationLog = string[]

interface DoubleControls {
  /** When `true`, every `audit.append` returns persist_failed (Req 9.2). */
  setAuditFails(fails: boolean): void
  /** The ordered list of mutator calls observed so far. */
  mutations(): MutationLog
  /** The audit records that were successfully appended. */
  appended(): AuditRecord[]
  userStatus(id: string): MarketplaceUser['status'] | undefined
  orderStatus(id: string): AdminOrder['status'] | undefined
  listingStatus(id: string): AdminListing['moderationStatus'] | undefined
  requestStatus(id: string): VerificationStatus | undefined
  accountRoles(id: string): Role[] | undefined
  settingValue(id: string): number | undefined
}

interface ControllableDouble {
  api: AdminApi
  controls: DoubleControls
}

function seedUsers(): MarketplaceUser[] {
  return [
    {
      id: 'u-active',
      type: 'buyer',
      name: 'Active User',
      phone: '9800000001',
      email: 'active@example.com',
      status: 'active',
    },
    {
      id: 'u-suspended',
      type: 'seller',
      name: 'Suspended User',
      phone: '9800000002',
      email: 'suspended@example.com',
      status: 'suspended',
    },
  ]
}

function seedOrders(): AdminOrder[] {
  return [
    {
      id: 'o-pending',
      createdAt: '2024-01-10T08:00:00Z',
      status: 'pending',
      buyer: { id: 'b1', name: 'Buyer One' },
      seller: { id: 's1', name: 'Seller One' },
      lineItems: [{ id: 'li-1', name: 'Item', quantity: 1, unitPricePaisa: 50_000 }],
      totalPaisa: 50_000,
    },
    {
      id: 'o-completed',
      createdAt: '2024-01-09T08:00:00Z',
      status: 'completed',
      buyer: { id: 'b2', name: 'Buyer Two' },
      seller: { id: 's2', name: 'Seller Two' },
      lineItems: [{ id: 'li-2', name: 'Item', quantity: 1, unitPricePaisa: 90_000 }],
      totalPaisa: 90_000,
    },
  ]
}

function seedListings(): AdminListing[] {
  return [
    {
      id: 'l-published',
      title: 'Published Listing',
      description: 'A published listing.',
      pricePaisa: 120_000,
      images: ['/img/1.jpg'],
      sellerId: 's1',
      sellerName: 'Seller One',
      moderationStatus: 'published',
    },
    {
      id: 'l-removed',
      title: 'Removed Listing',
      description: 'A removed listing.',
      pricePaisa: 80_000,
      images: ['/img/2.jpg'],
      sellerId: 's2',
      sellerName: 'Seller Two',
      moderationStatus: 'removed',
      removalReason: 'Previously removed for policy violation.',
    },
  ]
}

function seedRequests(): VerificationRequest[] {
  return [
    {
      id: 'vr-pending',
      requesterId: 's1',
      requesterType: 'seller',
      submittedAt: '2024-01-08T09:00:00Z',
      status: 'pending',
      documents: [{ id: 'd1', label: 'Doc', url: '/docs/d1.pdf' }],
    },
    {
      id: 'vr-approved',
      requesterId: 's2',
      requesterType: 'rider',
      submittedAt: '2024-01-07T09:00:00Z',
      status: 'approved',
      documents: [{ id: 'd2', label: 'Doc', url: '/docs/d2.pdf' }],
    },
  ]
}

function seedAccounts(): AdminAccount[] {
  return [
    {
      id: 'acct-target',
      identifier: 'target@chinooz.com',
      roles: ['Operations_Admin'],
      active: true,
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

function cloneRequest(request: VerificationRequest): VerificationRequest {
  return { ...request, documents: request.documents.map((d) => ({ ...d })) }
}

function cloneOrder(order: AdminOrder): AdminOrder {
  const clone: AdminOrder = {
    ...order,
    buyer: { ...order.buyer },
    seller: { ...order.seller },
    lineItems: order.lineItems.map((i) => ({ ...i })),
  }
  if (order.rider !== undefined) clone.rider = { ...order.rider }
  return clone
}

function cloneListing(listing: AdminListing): AdminListing {
  return { ...listing, images: [...listing.images] }
}

/**
 * Builds a fresh, isolated controllable {@link AdminApi}. All mutable state
 * lives in this closure. Every mutator records its call in `mutations` so a
 * test can assert that a denied/blocked action performed no mutation, and
 * `audit.append` can be switched to always fail to exercise the Req 9.2 path.
 */
function createDouble(): ControllableDouble {
  const users = seedUsers()
  const orders = seedOrders()
  const listings = seedListings()
  const requests = seedRequests()
  const accounts = seedAccounts()
  let settings = seedSettings()

  const mutations: MutationLog = []
  const appendedRecords: AuditRecord[] = []
  let auditFails = false

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
        // Req 9.2: after exhausting retries the append surfaces an error while
        // preserving the record for retry. The double models the terminal
        // outcome directly (the per-attempt retry loop is covered by the
        // AdminApi integration tests).
        if (auditFails) {
          return { ok: false, reason: 'persist_failed', record }
        }
        appendedRecords.push({ ...record })
        return { ok: true, record }
      },
      async query(_filter: AuditFilter, page: number): Promise<Page<AuditRecord>> {
        return emptyPage<AuditRecord>(page)
      },
    },
    accounts: {
      async get(id: string): Promise<QueryResult<AdminAccount>> {
        const found = accounts.find((a) => a.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: { ...found, roles: [...found.roles] } }
      },
      async changeRoles(
        id: string,
        roles: Role[],
      ): Promise<MutationResult<AdminAccount>> {
        mutations.push(`accounts.changeRoles:${id}`)
        const found = accounts.find((a) => a.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        found.roles = [...roles]
        found.active = roles.length > 0
        return { ok: true, data: { ...found, roles: [...found.roles] } }
      },
    },
    users: {
      async list(query: UserListQuery): Promise<Page<MarketplaceUser>> {
        return emptyPage<MarketplaceUser>(query.page)
      },
      async get(id: string): Promise<QueryResult<MarketplaceUser>> {
        const found = users.find((u) => u.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: { ...found } }
      },
      async save(user: MarketplaceUser): Promise<MutationResult<MarketplaceUser>> {
        mutations.push(`users.save:${user.id}`)
        const index = users.findIndex((u) => u.id === user.id)
        if (index === -1) return { ok: false, reason: 'not_found' }
        users[index] = { ...user }
        return { ok: true, data: { ...users[index] } }
      },
    },
    approvals: {
      async listPending(page: number): Promise<Page<VerificationRequest>> {
        return emptyPage<VerificationRequest>(page)
      },
      async get(id: string): Promise<QueryResult<VerificationRequest>> {
        const found = requests.find((r) => r.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: cloneRequest(found) }
      },
      async getDocuments(requestId: string) {
        const found = requests.find((r) => r.id === requestId)
        if (found === undefined) return { ok: false as const, reason: 'not_found' as const }
        return { ok: true as const, data: found.documents.map((d) => ({ ...d })) }
      },
      async save(
        request: VerificationRequest,
      ): Promise<MutationResult<VerificationRequest>> {
        mutations.push(`approvals.save:${request.id}`)
        const index = requests.findIndex((r) => r.id === request.id)
        if (index === -1) return { ok: false, reason: 'not_found' }
        requests[index] = cloneRequest(request)
        return { ok: true, data: cloneRequest(requests[index]) }
      },
    },
    orders: {
      async list(query: OrderListQuery): Promise<Page<AdminOrder>> {
        return emptyPage<AdminOrder>(query.page)
      },
      async get(id: string): Promise<QueryResult<AdminOrder>> {
        const found = orders.find((o) => o.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: cloneOrder(found) }
      },
      async save(order: AdminOrder): Promise<MutationResult<AdminOrder>> {
        mutations.push(`orders.save:${order.id}`)
        const index = orders.findIndex((o) => o.id === order.id)
        if (index === -1) return { ok: false, reason: 'not_found' }
        orders[index] = cloneOrder(order)
        return { ok: true, data: cloneOrder(orders[index]) }
      },
    },
    listings: {
      async list(query: ListingListQuery): Promise<Page<AdminListing>> {
        return emptyPage<AdminListing>(query.page)
      },
      async get(id: string): Promise<QueryResult<AdminListing>> {
        const found = listings.find((l) => l.id === id)
        if (found === undefined) return { ok: false, reason: 'not_found' }
        return { ok: true, data: cloneListing(found) }
      },
      async save(listing: AdminListing): Promise<MutationResult<AdminListing>> {
        mutations.push(`listings.save:${listing.id}`)
        const index = listings.findIndex((l) => l.id === listing.id)
        if (index === -1) return { ok: false, reason: 'not_found' }
        listings[index] = cloneListing(listing)
        return { ok: true, data: cloneListing(listings[index]) }
      },
    },
    analytics: {
      async getMetrics() {
        return {
          ok: true as const,
          data: { totalOrders: 0, totalSalesPaisa: 0, activeSellers: 0, activeRiders: 0 },
        }
      },
    },
    settings: {
      async list(): Promise<QueryResult<PlatformSetting[]>> {
        return { ok: true, data: settings.map((s) => ({ ...s })) }
      },
      async save(changes: SettingChange[]): Promise<MutationResult<PlatformSetting[]>> {
        mutations.push(`settings.save:${changes.map((c) => c.id).join(',')}`)
        settings = settings.map((setting) => {
          const change = changes.find((c) => c.id === setting.id)
          return change === undefined ? { ...setting } : { ...setting, value: change.next }
        })
        return { ok: true, data: settings.map((s) => ({ ...s })) }
      },
    },
  }

  const controls: DoubleControls = {
    setAuditFails(fails: boolean): void {
      auditFails = fails
    },
    mutations(): MutationLog {
      return [...mutations]
    },
    appended(): AuditRecord[] {
      return appendedRecords.map((r) => ({ ...r }))
    },
    userStatus(id) {
      return users.find((u) => u.id === id)?.status
    },
    orderStatus(id) {
      return orders.find((o) => o.id === id)?.status
    },
    listingStatus(id) {
      return listings.find((l) => l.id === id)?.moderationStatus
    },
    requestStatus(id) {
      return requests.find((r) => r.id === id)?.status
    },
    accountRoles(id) {
      const found = accounts.find((a) => a.id === id)
      return found ? [...found.roles] : undefined
    },
    settingValue(id) {
      return settings.find((s) => s.id === id)?.value
    },
  }

  return { api, controls }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function makeSession(roles: Role[], adminId = 'admin-actor'): AdminSession {
  const now = new Date('2024-02-01T00:00:00Z').toISOString()
  return { adminId, roles, issuedAt: now, lastSeenAt: now }
}

/** Configures the mocked `readSession` to return a session with `roles`. */
function actAs(roles: Role[]): void {
  mocks.readSession.mockResolvedValue(makeSession(roles))
}

let double: ControllableDouble

beforeEach(() => {
  double = createDouble()
  mocks.apiRef.current = double.api
  mocks.readSession.mockReset()
})

// ---------------------------------------------------------------------------
// 1. Denied actions perform NO mutation (Req 2.4 / 2.6)
// ---------------------------------------------------------------------------

describe('denied actions leave data unchanged (Req 2.4 / 2.6)', () => {
  it('suspendUser is forbidden for a Read_Only_Admin and performs no mutation', async () => {
    actAs(['Read_Only_Admin'])

    const result = await suspendUser('u-active')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.userStatus('u-active')).toBe('active')
    expect(double.controls.appended()).toEqual([])
  })

  it('reactivateUser is forbidden for a Support_Admin and performs no mutation', async () => {
    actAs(['Support_Admin'])

    const result = await reactivateUser('u-suspended')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.userStatus('u-suspended')).toBe('suspended')
  })

  it('approveRequest is forbidden for a Read_Only_Admin and performs no mutation', async () => {
    actAs(['Read_Only_Admin'])

    const result = await approveRequest('vr-pending')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.requestStatus('vr-pending')).toBe('pending')
  })

  it('rejectRequest is forbidden for a Support_Admin and performs no mutation', async () => {
    actAs(['Support_Admin'])

    const result = await rejectRequest('vr-pending', 'A perfectly valid reason')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.requestStatus('vr-pending')).toBe('pending')
  })

  it('cancelOrderAction is forbidden for a Read_Only_Admin and performs no mutation', async () => {
    actAs(['Read_Only_Admin'])

    const result = await cancelOrderAction('o-pending', 'Fraudulent order')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.orderStatus('o-pending')).toBe('pending')
  })

  it('removeListing is forbidden for a Support_Admin and performs no mutation', async () => {
    actAs(['Support_Admin'])

    const result = await removeListing('l-published', 'Counterfeit goods listing')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.listingStatus('l-published')).toBe('published')
  })

  it('reinstateListing is forbidden for a Read_Only_Admin and performs no mutation', async () => {
    actAs(['Read_Only_Admin'])

    const result = await reinstateListing('l-removed')

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.listingStatus('l-removed')).toBe('removed')
  })

  it('saveSettings is forbidden for an Operations_Admin (no settings.manage) and performs no mutation', async () => {
    actAs(['Operations_Admin'])

    const result = await saveSettings([
      { id: 'platform.commission_percent', value: 12 },
    ])

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.settingValue('platform.commission_percent')).toBe(10)
  })

  it('changeAdminRoles is forbidden for a non-Super_Admin and performs no mutation', async () => {
    actAs(['Operations_Admin'])

    const result = await changeAdminRoles('acct-target', ['Support_Admin'])

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.accountRoles('acct-target')).toEqual(['Operations_Admin'])
  })
})

// ---------------------------------------------------------------------------
// 2. Blocked actions perform NO mutation
// ---------------------------------------------------------------------------

describe('blocked actions leave data unchanged', () => {
  it('cancelling an already-completed order is blocked with no mutation (Req 5.8)', async () => {
    actAs(['Operations_Admin'])

    const result = await cancelOrderAction('o-completed', 'Customer changed their mind')

    expect(result).toEqual({ ok: false, reason: 'already_completed' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.orderStatus('o-completed')).toBe('completed')
    expect(double.controls.appended()).toEqual([])
  })

  it('deciding on an already-processed request is blocked with no mutation (Req 4.7)', async () => {
    actAs(['Operations_Admin'])

    const result = await approveRequest('vr-approved')

    expect(result).toEqual({ ok: false, reason: 'already_processed' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.requestStatus('vr-approved')).toBe('approved')
  })

  it('suspending an already-suspended user is blocked with no mutation (Req 3.9)', async () => {
    actAs(['Operations_Admin'])

    const result = await suspendUser('u-suspended')

    expect(result).toEqual({ ok: false, reason: 'already_in_status' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.userStatus('u-suspended')).toBe('suspended')
  })

  it('reactivating an already-active user is blocked with no mutation (Req 3.9)', async () => {
    actAs(['Operations_Admin'])

    const result = await reactivateUser('u-active')

    expect(result).toEqual({ ok: false, reason: 'already_in_status' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.userStatus('u-active')).toBe('active')
  })

  it('removing a listing with an invalid (too-short) reason is blocked with no mutation (Req 6.6)', async () => {
    actAs(['Operations_Admin'])

    const result = await removeListing('l-published', 'too short')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('invalid_reason')
    }
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.listingStatus('l-published')).toBe('published')
    expect(double.controls.appended()).toEqual([])
  })

  it('rejecting a request with an invalid (empty) reason is blocked with no mutation (Req 4.6)', async () => {
    actAs(['Operations_Admin'])

    const result = await rejectRequest('vr-pending', '')

    expect(result).toEqual({ ok: false, reason: 'invalid_rejection_reason' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.requestStatus('vr-pending')).toBe('pending')
  })

  it('cancelling an order with an over-long reason is blocked with no mutation (Req 5.7)', async () => {
    actAs(['Operations_Admin'])

    const result = await cancelOrderAction('o-pending', 'x'.repeat(501))

    expect(result).toEqual({ ok: false, reason: 'invalid_reason' })
    expect(double.controls.mutations()).toEqual([])
    expect(double.controls.orderStatus('o-pending')).toBe('pending')
  })
})

// ---------------------------------------------------------------------------
// 3. Audit append failure surfaces an error preserving the record (Req 9.2)
// ---------------------------------------------------------------------------

describe('audit append failure surfaces an error preserving the record (Req 9.2)', () => {
  it('suspendUser surfaces audit_failed and preserves the status-change record', async () => {
    actAs(['Operations_Admin'])
    double.controls.setAuditFails(true)

    const result: UserStatusActionResult = await suspendUser('u-active')

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'audit_failed') {
      // The recorded action data is preserved for retry...
      expect(result.record.actorId).toBe('admin-actor')
      expect(result.record.actionType).toBe('user_suspend')
      expect(result.record.entityId).toBe('u-active')
      expect(result.record.timestamp).toMatch(/Z$/)
    } else {
      expect.fail(`expected audit_failed, got ${JSON.stringify(result)}`)
    }
    // ...and no record was actually appended to the log.
    expect(double.controls.appended()).toEqual([])
  })

  it('cancelOrderAction surfaces audit_failed and preserves the cancelled order', async () => {
    actAs(['Operations_Admin'])
    double.controls.setAuditFails(true)

    const result = await cancelOrderAction('o-pending', 'Suspected fraud')

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'audit_failed') {
      // The cancellation persisted; the action reports it alongside the error.
      expect(result.order.status).toBe('cancelled')
      expect(result.order.cancellationReason).toBe('Suspected fraud')
    } else {
      expect.fail(`expected audit_failed, got ${JSON.stringify(result)}`)
    }
    expect(double.controls.appended()).toEqual([])
  })

  it('removeListing surfaces audit_failed and preserves the removed listing', async () => {
    actAs(['Operations_Admin'])
    double.controls.setAuditFails(true)

    const result = await removeListing('l-published', 'Counterfeit goods listing')

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'audit_failed') {
      expect(result.listing.moderationStatus).toBe('removed')
      expect(result.listing.removalReason).toBe('Counterfeit goods listing')
    } else {
      expect.fail(`expected audit_failed, got ${JSON.stringify(result)}`)
    }
    expect(double.controls.appended()).toEqual([])
  })

  it('changeAdminRoles surfaces audit_failed and preserves the role-change record', async () => {
    actAs(['Super_Admin'])
    double.controls.setAuditFails(true)

    const result = await changeAdminRoles('acct-target', ['Support_Admin'])

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'audit_failed') {
      expect(result.record.actorId).toBe('admin-actor')
      expect(result.record.actionType).toBe('role_change')
      expect(result.record.entityId).toBe('acct-target')
      expect(result.record.details?.newRoles).toBe('Support_Admin')
    } else {
      expect.fail(`expected audit_failed, got ${JSON.stringify(result)}`)
    }
  })

  it('saveSettings surfaces audit_failed but persists the validated change (Req 9.2)', async () => {
    actAs(['Super_Admin'])
    double.controls.setAuditFails(true)

    const result = await saveSettings([
      { id: 'platform.commission_percent', value: 12 },
    ])

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'audit_failed') {
      const commission = result.settings.find(
        (s) => s.id === 'platform.commission_percent',
      )
      expect(commission?.value).toBe(12)
    } else {
      expect.fail(`expected audit_failed, got ${JSON.stringify(result)}`)
    }
    // The persisted snapshot reflects the change even though auditing failed.
    expect(double.controls.settingValue('platform.commission_percent')).toBe(12)
  })
})
