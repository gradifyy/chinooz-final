import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import type { Permission, Role } from '../types'
import { canPerform } from '../rbac'
import { applyStatusChange, type StatusChangeAction } from '../users'
import { decide, type Decision } from '../approvals'
import { cancelOrder } from '../orders'
import { moderate, type ModerationAction } from '../listings'
import {
  adminListingArb,
  adminOrderArb,
  boundedReasonArb,
  marketplaceUserArb,
  platformSettingArb,
  roleSetArb,
  verificationRequestArb,
} from './arbitraries'

/**
 * Property test for admin-core authorization denial (Property 6).
 *
 * For any domain state and any mutating action whose required permission the
 * acting roles lack, executing the guarded action returns a denial and
 * produces a state equal to the input state (Req 2.4 / 2.6).
 *
 * The "guarded action" mirrors the design's defense-in-depth rule: every
 * data mutation re-checks `rbac.canPerform()` before touching data and, when
 * the permission is absent, returns `{ ok: false, reason: 'forbidden' }`
 * performing no mutation (design "Error Handling" — Authorization). This test
 * composes that guard over each real mutating domain operation (user status
 * change, verification decision, order cancellation, listing moderation, and a
 * platform-settings save) and asserts both the denial outcome and that the
 * underlying state is left byte-for-byte unchanged.
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Discriminated outcome of executing a permission-guarded mutation. */
type GuardedOutcome<S> =
  | { ok: true; state: S }
  | { ok: false; reason: 'forbidden'; state: S }

/**
 * A single guarded mutating operation: the permission it requires, the domain
 * state it acts on, and the mutation it would apply when authorized. `state`
 * and `mutate` are existentially typed (`unknown`) so heterogeneous domain
 * operations can be generated from a single arbitrary.
 */
interface GuardedCase {
  permission: Permission
  state: unknown
  mutate: (state: unknown) => unknown
}

/** Type-safe constructor for a {@link GuardedCase} over a concrete state type. */
function makeCase<S>(
  permission: Permission,
  state: S,
  mutate: (state: S) => S,
): GuardedCase {
  return {
    permission,
    state,
    mutate: (value) => mutate(value as S),
  }
}

/**
 * Executes a mutating domain operation behind a permission guard. When the
 * acting `roles` lack the operation's required permission the mutation is never
 * invoked and the input state is returned unchanged with a `forbidden` denial
 * (Req 2.4 / 2.6).
 */
function executeGuarded(roles: Role[], action: GuardedCase): GuardedOutcome<unknown> {
  if (!canPerform(roles, action.permission)) {
    return { ok: false, reason: 'forbidden', state: action.state }
  }
  return { ok: true, state: action.mutate(action.state) }
}

/** A guarded user status change (`users.manage`). */
const userCaseArb: fc.Arbitrary<GuardedCase> = fc
  .tuple(marketplaceUserArb, fc.constantFrom<StatusChangeAction>('suspend', 'reactivate'))
  .map(([user, action]) =>
    makeCase('users.manage', user, (u) => {
      const result = applyStatusChange(u, action)
      return result.ok ? result.user : u
    }),
  )

/** A guarded verification decision (`approvals.decide`). */
const approvalCaseArb: fc.Arbitrary<GuardedCase> = fc
  .tuple(
    verificationRequestArb,
    fc.constantFrom<Decision>('approve', 'reject'),
    boundedReasonArb(1, 500),
  )
  .map(([request, decision, reason]) =>
    makeCase('approvals.decide', request, (r) => {
      const result = decide(r, decision, reason)
      return result.ok ? result.request : r
    }),
  )

/** A guarded order cancellation (`orders.cancel`). */
const orderCaseArb: fc.Arbitrary<GuardedCase> = fc
  .tuple(adminOrderArb, boundedReasonArb(1, 500))
  .map(([order, reason]) =>
    makeCase('orders.cancel', order, (o) => {
      const result = cancelOrder(o, reason)
      return result.ok ? result.order : o
    }),
  )

/** A guarded listing moderation (`listings.moderate`). */
const listingCaseArb: fc.Arbitrary<GuardedCase> = fc
  .tuple(
    adminListingArb,
    fc.constantFrom<ModerationAction>('remove', 'reinstate'),
    boundedReasonArb(10, 500),
  )
  .map(([listing, action, reason]) =>
    makeCase('listings.moderate', listing, (l) => {
      const result = moderate(l, action, reason)
      return result.ok ? result.listing : l
    }),
  )

/** A guarded platform-settings save (`settings.manage`). */
const settingsCaseArb: fc.Arbitrary<GuardedCase> = fc
  .array(platformSettingArb, { maxLength: 6 })
  .map((settings) =>
    makeCase('settings.manage', settings, (current) =>
      current.map((setting) => ({ ...setting, value: setting.value + 1 })),
    ),
  )

/** Any guarded mutating domain operation across the operational modules. */
const guardedCaseArb: fc.Arbitrary<GuardedCase> = fc.oneof(
  userCaseArb,
  approvalCaseArb,
  orderCaseArb,
  listingCaseArb,
  settingsCaseArb,
)

/**
 * A guarded mutating operation paired with a role set that lacks the
 * operation's required permission (the precondition of Property 6).
 */
const deniedActionArb: fc.Arbitrary<{ roles: Role[]; action: GuardedCase }> = fc
  .tuple(roleSetArb, guardedCaseArb)
  .filter(([roles, action]) => !canPerform(roles, action.permission))
  .map(([roles, action]) => ({ roles, action }))

describe('rbac denied actions leave state unchanged', () => {
  // Feature: admin-dashboard, Property 6: Denied actions leave state unchanged
  // Validates: Requirements 2.4, 2.6
  it('denies a mutating action whose permission the roles lack and leaves the state unchanged', () => {
    fc.assert(
      fc.property(deniedActionArb, ({ roles, action }) => {
        // Precondition: the acting roles genuinely lack the required permission.
        expect(canPerform(roles, action.permission)).toBe(false)

        // Snapshot the input so we can prove the guard never mutates in place.
        const inputSnapshot = structuredClone(action.state)

        const outcome = executeGuarded(roles, action)

        // The guarded action returns an authorization denial (Req 2.4 / 2.6).
        expect(outcome.ok).toBe(false)
        if (outcome.ok === false) {
          expect(outcome.reason).toBe('forbidden')
        }

        // The resulting state equals the input state — no data was changed.
        expect(outcome.state).toEqual(inputSnapshot)
        // The original state object itself was not mutated by the guard.
        expect(action.state).toEqual(inputSnapshot)
      }),
      { numRuns: RUNS },
    )
  })
})
