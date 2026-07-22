import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import type { Permission, Role } from '../types'
import { canPerform, isMutating, permissionsFor } from '../rbac'
import {
  ALL_PERMISSIONS,
  emptyRoleSetArb,
  permissionArb,
  roleSetArb,
  superAdminRoleSetArb,
} from './arbitraries'

/**
 * Property test for admin-core permission resolution (Property 5).
 *
 * For any set of assigned roles and any permission `p`, `canPerform(roles, p)`
 * is true if and only if `p` is in the union of the permissions of those
 * roles. Consequently: an empty role set grants no permission; a
 * Read_Only_Admin is granted every view permission and denied every mutating
 * permission; `settings.manage` and `audit.view` are granted only when the
 * roles include `Super_Admin` (Req 2.2 / 2.3 / 2.4 / 2.5 / 2.6 / 8.6 / 9.4).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** The privileged permissions restricted to `Super_Admin` (Req 8.6 / 9.4). */
const SUPER_ADMIN_ONLY: readonly Permission[] = ['settings.manage', 'audit.view']

describe('rbac permission resolution honors role union and read-only constraints', () => {
  // Feature: admin-dashboard, Property 5: Permission resolution honors role union and read-only constraints
  // Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 8.6, 9.4
  it('canPerform(roles, p) is true iff p is in the union of permissions of those roles', () => {
    fc.assert(
      fc.property(roleSetArb, permissionArb, (roles, permission) => {
        const union = permissionsFor(roles)
        // The grant decision agrees exactly with set membership in the union.
        expect(canPerform(roles, permission)).toBe(union.has(permission))
      }),
      { numRuns: RUNS },
    )
  })

  it('an empty role set grants no permission', () => {
    fc.assert(
      fc.property(emptyRoleSetArb, permissionArb, (roles, permission) => {
        // Zero-role accounts are inactive and denied every permission (Req 2.2).
        expect(canPerform(roles, permission)).toBe(false)
        expect(permissionsFor(roles).size).toBe(0)
      }),
      { numRuns: RUNS },
    )
  })

  it('a Read_Only_Admin is granted every view permission and denied every mutating permission', () => {
    const readOnlyRoles: Role[] = ['Read_Only_Admin']

    fc.assert(
      fc.property(permissionArb, (permission) => {
        const granted = canPerform(readOnlyRoles, permission)
        if (isMutating(permission)) {
          // Every mutating permission is denied to a read-only admin (Req 2.6).
          expect(granted).toBe(false)
        }
      }),
      { numRuns: RUNS },
    )

    // Every operational view permission is granted to a read-only admin
    // (Req 2.5). The privileged settings/audit views are intentionally not in
    // the operational read set and are excluded here.
    const operationalViewPermissions = ALL_PERMISSIONS.filter(
      (permission) =>
        !isMutating(permission) &&
        permission !== 'settings.view' &&
        permission !== 'audit.view',
    )
    for (const permission of operationalViewPermissions) {
      expect(canPerform(readOnlyRoles, permission)).toBe(true)
    }
  })

  it('settings.manage and audit.view are granted only when the roles include Super_Admin', () => {
    // When Super_Admin is present, the privileged permissions are granted.
    fc.assert(
      fc.property(superAdminRoleSetArb, (roles) => {
        for (const permission of SUPER_ADMIN_ONLY) {
          expect(canPerform(roles, permission)).toBe(true)
        }
      }),
      { numRuns: RUNS },
    )

    // When Super_Admin is absent, the privileged permissions are denied.
    const withoutSuperAdminArb = roleSetArb.filter(
      (roles) => !roles.includes('Super_Admin'),
    )
    fc.assert(
      fc.property(withoutSuperAdminArb, (roles) => {
        for (const permission of SUPER_ADMIN_ONLY) {
          expect(canPerform(roles, permission)).toBe(false)
        }
      }),
      { numRuns: RUNS },
    )
  })
})
