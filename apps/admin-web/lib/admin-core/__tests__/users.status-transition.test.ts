import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  applyStatusChange,
  buildStatusChangeAuditRecord,
  USER_SUSPEND_ACTION,
  USER_REACTIVATE_ACTION,
  type StatusChangeAction,
} from '../users'
import type { AccountStatus, MarketplaceUser } from '../types'
import { idArb, marketplaceUserArb } from './arbitraries'

/**
 * Property test for guarded, audited marketplace-user status transitions
 * (Property 14).
 *
 * For any marketplace user and either action (`suspend`, `reactivate`),
 * `applyStatusChange` succeeds only on a valid transition
 * (`active → suspended`, `suspended → active`), flipping the status and
 * yielding (via `buildStatusChangeAuditRecord`) an audit record carrying the
 * acting identity, affected identity, action, and timestamp. A no-op
 * transition (suspending an already-suspended user, reactivating an
 * already-active user) is rejected and leaves the status unchanged.
 *
 * Validates Requirements 3.7 (suspend active → suspended + audit), 3.8
 * (reactivate suspended → active + audit), and 3.9 (no-op rejected, status
 * unchanged).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Lower bound for generated instants (2000-01-01). */
const MIN_INSTANT = Date.UTC(2000, 0, 1)
/** Upper bound for generated instants (2030-12-31). */
const MAX_INSTANT = Date.UTC(2030, 11, 31)

/** ISO UTC at second precision, e.g. `2024-01-01T00:00:00Z` — no sub-second part. */
const UTC_SECOND_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

/** An epoch-millisecond instant within the domain's supported range. */
const nowArb: fc.Arbitrary<number> = fc.integer({
  min: MIN_INSTANT,
  max: MAX_INSTANT,
})

/** Either guarded status-change action. */
const actionArb: fc.Arbitrary<StatusChangeAction> = fc.constantFrom(
  'suspend',
  'reactivate',
)

/** The status `action` targets, and the status a valid transition starts from. */
function targetStatus(action: StatusChangeAction): AccountStatus {
  return action === 'suspend' ? 'suspended' : 'active'
}
function sourceStatus(action: StatusChangeAction): AccountStatus {
  return action === 'suspend' ? 'active' : 'suspended'
}

/** The action type recorded in the audit log for a given status-change action. */
function expectedActionType(action: StatusChangeAction): string {
  return action === 'suspend' ? USER_SUSPEND_ACTION : USER_REACTIVATE_ACTION
}

/** A marketplace user forced into a specific account status. */
function userWithStatus(
  base: MarketplaceUser,
  status: AccountStatus,
): MarketplaceUser {
  return { ...base, status }
}

describe('users.applyStatusChange (guarded, audited status transitions)', () => {
  // Feature: admin-dashboard, Property 14: User status transition is guarded and audited
  // Validates: Requirements 3.7, 3.8
  it('a valid transition flips the status and never mutates the input (Req 3.7 / 3.8)', () => {
    fc.assert(
      fc.property(marketplaceUserArb, actionArb, (base, action) => {
        // Put the user in the only status from which `action` is valid.
        const user = userWithStatus(base, sourceStatus(action))
        const before = { ...user }

        const result = applyStatusChange(user, action)

        // The transition succeeds and flips to the target status.
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.user.status).toBe(targetStatus(action))

        // Every other field is preserved unchanged.
        expect(result.user.id).toBe(user.id)
        expect(result.user.type).toBe(user.type)
        expect(result.user.name).toBe(user.name)
        expect(result.user.phone).toBe(user.phone)
        expect(result.user.email).toBe(user.email)

        // Non-mutating: a fresh object is returned, the input is untouched.
        expect(result.user).not.toBe(user)
        expect(user).toEqual(before)
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 14: User status transition is guarded and audited
  // Validates: Requirements 3.9
  it('a no-op transition is rejected and leaves the status unchanged (Req 3.9)', () => {
    fc.assert(
      fc.property(marketplaceUserArb, actionArb, (base, action) => {
        // Put the user already in the status `action` would target.
        const user = userWithStatus(base, targetStatus(action))
        const before = { ...user }

        const result = applyStatusChange(user, action)

        // The no-op is rejected with the documented reason.
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.reason).toBe('already_in_status')

        // The input status (and the rest of the user) is left unchanged.
        expect(user).toEqual(before)
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 14: User status transition is guarded and audited
  // Validates: Requirements 3.7, 3.8, 3.9
  it('succeeds exactly when the user is not already in the target status', () => {
    fc.assert(
      fc.property(marketplaceUserArb, actionArb, (user, action) => {
        const result = applyStatusChange(user, action)

        // Success iff the current status differs from the action's target.
        const expectedOk = user.status !== targetStatus(action)
        expect(result.ok).toBe(expectedOk)

        if (result.ok) {
          expect(result.user.status).toBe(targetStatus(action))
        } else {
          expect(result.reason).toBe('already_in_status')
        }
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 14: User status transition is guarded and audited
  // Validates: Requirements 3.7, 3.8
  it('a successful transition yields a complete audit record (actor, affected identity, action, timestamp)', () => {
    fc.assert(
      fc.property(
        marketplaceUserArb,
        actionArb,
        idArb,
        nowArb,
        (base, action, actor, now) => {
          const user = userWithStatus(base, sourceStatus(action))
          const result = applyStatusChange(user, action)

          expect(result.ok).toBe(true)
          if (!result.ok) return

          const record = buildStatusChangeAuditRecord(
            actor,
            result.user,
            action,
            now,
          )

          // Acting Administrator identity.
          expect(record.actorId).toBe(actor)

          // Affected Marketplace_User identity — on the record and in details.
          expect(record.entityId).toBe(user.id)
          expect(record.details?.affectedId).toBe(user.id)

          // Action performed.
          expect(record.actionType).toBe(expectedActionType(action))

          // Timestamp: UTC second precision, round-tripping to the truncated instant.
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          const parsed = Date.parse(record.timestamp)
          expect(Number.isNaN(parsed)).toBe(false)
          expect(parsed).toBe(Math.floor(now / 1000) * 1000)

          // The recorded transition captures the before/after status.
          expect(record.details?.previousStatus).toBe(sourceStatus(action))
          expect(record.details?.newStatus).toBe(targetStatus(action))
        },
      ),
      { numRuns: RUNS },
    )
  })
})
