import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import type { Role } from '../types'
import { ROLE_CHANGE_ACTION, buildRoleChangeAuditRecord } from '../rbac'
import { idArb, roleSetArb } from './arbitraries'

/**
 * Property test for admin-core role-change audit completeness (Property 7).
 *
 * For any acting administrator, affected administrator, previous role set, and
 * new role set, `buildRoleChangeAuditRecord` produces a record containing the
 * acting identity, the affected identity, the previous roles, the new roles,
 * and a timestamp (Req 2.7).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Lower bound for generated instants (2000-01-01). */
const MIN_INSTANT = Date.UTC(2000, 0, 1)
/** Upper bound for generated instants (2030-12-31). */
const MAX_INSTANT = Date.UTC(2030, 11, 31)

/** An epoch-millisecond instant within the domain's supported range. */
const nowArb: fc.Arbitrary<number> = fc.integer({
  min: MIN_INSTANT,
  max: MAX_INSTANT,
})

/** ISO UTC at second precision, e.g. `2024-01-01T00:00:00Z`. */
const UTC_SECOND_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

/** The serialization the audit record uses for a role set. */
function serializeRoles(roles: Role[]): string {
  return roles.join(',')
}

describe('rbac role-change audit record completeness', () => {
  // Feature: admin-dashboard, Property 7: Role-change audit record completeness
  // Validates: Requirements 2.7
  it('produces a record carrying acting identity, affected identity, previous roles, new roles, and a UTC timestamp', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        roleSetArb,
        roleSetArb,
        nowArb,
        (actor, affected, prevRoles, newRoles, now) => {
          const record = buildRoleChangeAuditRecord(
            actor,
            affected,
            prevRoles,
            newRoles,
            now,
          )

          // The record is tagged as a role-change action (Req 2.7).
          expect(record.actionType).toBe(ROLE_CHANGE_ACTION)

          // Acting administrator identity is recorded.
          expect(record.actorId).toBe(actor)

          // Affected administrator identity is recorded (both on the record and
          // within the details payload).
          expect(record.entityId).toBe(affected)
          expect(record.details).toBeDefined()
          expect(record.details?.affectedId).toBe(affected)

          // Previous and new role sets are recorded.
          expect(record.details?.previousRoles).toBe(serializeRoles(prevRoles))
          expect(record.details?.newRoles).toBe(serializeRoles(newRoles))

          // A timestamp is present, in ISO UTC at second precision, and equal
          // to the second-truncated instant of `now`.
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          const expected = new Date(Math.floor(now / 1000) * 1000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z')
          expect(record.timestamp).toBe(expected)
        },
      ),
      { numRuns: RUNS },
    )
  })
})
