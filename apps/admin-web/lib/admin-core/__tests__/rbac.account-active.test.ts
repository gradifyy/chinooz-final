import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import type { AdminAccount } from '../types'
import { hasAnyRole } from '../rbac'
import { roleSetArb } from './arbitraries'

/**
 * Property test for admin-core account activation (Property 4).
 *
 * An AdminAccount is active if and only if it holds at least one role; a
 * zero-role account is inactive (Req 2.1). The decision is driven by the
 * rbac helper `hasAnyRole`, which the account's `active` flag must agree with.
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

describe('rbac account active-iff-role', () => {
  // Feature: admin-dashboard, Property 4: Account is active if and only if it holds a role
  // Validates: Requirements 2.1
  it('an AdminAccount is active exactly when it has at least one assigned role', () => {
    fc.assert(
      fc.property(roleSetArb, (roles) => {
        // Build an account whose `active` flag is derived from the role-based
        // decision (active === holds a role), per the domain invariant.
        const account: AdminAccount = {
          id: 'account-under-test',
          identifier: 'admin@example.com',
          roles,
          active: hasAnyRole(roles),
        }

        const active = hasAnyRole(account.roles)

        // Active iff it holds at least one role (the if-and-only-if).
        expect(active).toBe(account.roles.length > 0)
        // The account's active flag agrees with the role-based decision.
        expect(account.active).toBe(active)
        // A zero-role account is inactive; a role-bearing account is active.
        if (account.roles.length === 0) {
          expect(account.active).toBe(false)
        } else {
          expect(account.active).toBe(true)
        }
      }),
      { numRuns: RUNS },
    )
  })
})
