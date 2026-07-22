import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { buildAuditRecord } from '../audit'
import { buildAuthAuditRecord, type AuthAuditKind } from '../auth'
import { idArb, nonEmptyStringArb } from './arbitraries'

/**
 * Property test for admin-core audit-record field completeness and timestamp
 * precision (Property 25).
 *
 * For any acting identity, action type, entity identifier, and instant,
 * `buildAuditRecord` (and `buildAuthAuditRecord` for authentication events)
 * produces a record containing the acting identity, action type, affected
 * entity identifier, and a UTC timestamp expressed to second precision with no
 * sub-second component.
 *
 * Validates Requirement 9.1 (administrative actions record administrator
 * identity, action type, affected entity, and a UTC second-precision
 * timestamp), Requirement 1.6 (successful authentication recorded with account
 * identifier and timestamp), and Requirement 1.8 (failed authentication
 * recorded with submitted account identifier and timestamp).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Lower bound for generated instants (2000-01-01). */
const MIN_INSTANT = Date.UTC(2000, 0, 1)
/** Upper bound for generated instants (2030-12-31). */
const MAX_INSTANT = Date.UTC(2030, 11, 31)

/**
 * An epoch-millisecond instant within the domain's supported range, biased to
 * also probe instants carrying a non-zero millisecond remainder so the
 * "no sub-second component" guarantee is genuinely exercised.
 */
const nowArb: fc.Arbitrary<number> = fc.integer({
  min: MIN_INSTANT,
  max: MAX_INSTANT,
})

/** ISO UTC at second precision, e.g. `2024-01-01T00:00:00Z` — no sub-second part. */
const UTC_SECOND_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

/** The second-truncated ISO UTC timestamp expected for an instant. */
function expectedUtcSecond(now: number): string {
  return new Date(Math.floor(now / 1000) * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Asserts the required-field + precision invariant on an audit record: it
 * carries the given actor, action type, and entity, and a UTC timestamp at
 * second precision with no sub-second component that round-trips to the
 * truncated instant.
 */
function assertRequiredFieldsAndPrecision(
  record: {
    actorId: string
    actionType: string
    entityId: string
    timestamp: string
  },
  actor: string,
  actionType: string,
  entityId: string,
  now: number,
): void {
  // Required identity / action / entity fields.
  expect(record.actorId).toBe(actor)
  expect(record.actionType).toBe(actionType)
  expect(record.entityId).toBe(entityId)

  // UTC second precision with no sub-second component.
  expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
  expect(record.timestamp).toBe(expectedUtcSecond(now))

  // The timestamp is a valid UTC instant whose millisecond remainder is zero
  // and whose value is the second-truncation of the original instant.
  const parsed = Date.parse(record.timestamp)
  expect(Number.isNaN(parsed)).toBe(false)
  expect(parsed % 1000).toBe(0)
  expect(parsed).toBe(Math.floor(now / 1000) * 1000)
}

describe('audit record required fields and UTC second precision', () => {
  // Feature: admin-dashboard, Property 25: Audit records carry required fields at UTC second precision
  // Validates: Requirements 9.1, 1.6, 1.8
  it('buildAuditRecord carries actor, action, entity, and a UTC second-precision timestamp (Req 9.1)', () => {
    fc.assert(
      fc.property(
        idArb,
        nonEmptyStringArb,
        idArb,
        nowArb,
        fc.option(fc.dictionary(nonEmptyStringArb, fc.string()), {
          nil: undefined,
        }),
        (actor, actionType, entityId, now, details) => {
          const record = buildAuditRecord(actor, actionType, entityId, now, details)
          assertRequiredFieldsAndPrecision(record, actor, actionType, entityId, now)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 25: Audit records carry required fields at UTC second precision
  // Validates: Requirements 1.6, 1.8
  it('buildAuthAuditRecord carries identifier as actor/entity and a UTC second-precision timestamp for both outcomes (Req 1.6 / 1.8)', () => {
    const authKindArb: fc.Arbitrary<AuthAuditKind> = fc.constantFrom(
      'login_success',
      'login_failure',
    )

    fc.assert(
      fc.property(authKindArb, idArb, nowArb, (kind, identifier, now) => {
        const record = buildAuthAuditRecord(kind, identifier, now)

        // The submitted/acting account identifier is recorded as both the actor
        // and the affected entity, and the event kind is the action type.
        assertRequiredFieldsAndPrecision(record, identifier, kind, identifier, now)
      }),
      { numRuns: RUNS },
    )
  })
})
