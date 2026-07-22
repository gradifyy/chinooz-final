import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  moderate,
  buildModerationAuditRecord,
  validateRemovalReason,
  LISTING_REMOVE_ACTION,
  LISTING_REINSTATE_ACTION,
  REMOVAL_REASON_MIN_LENGTH,
  REMOVAL_REASON_MAX_LENGTH,
} from '../listings'
import type { AdminListing, ModerationStatus } from '../types'
import { idArb, adminListingArb, boundedReasonArb } from './arbitraries'

/**
 * Property test for the guarded, audited listing moderation round-trip
 * (Property 18).
 *
 * For any listing, `moderate(listing, 'remove', reason)` succeeds if and only
 * if the removal reason is valid (length 10..500): a successful removal returns
 * a fresh listing copy with moderation status `removed` and the `removalReason`
 * recorded — never mutating the input — and yields (via
 * `buildModerationAuditRecord`) an audit record carrying the acting identity,
 * the affected listing identity, the `listing_remove` action, the removal
 * reason, and a UTC second-precision timestamp. Removing with a missing,
 * too-short, or too-long reason is blocked (`invalid_reason`) and leaves the
 * moderation status unchanged. Reinstating a listing sets the moderation status
 * to `published` and yields a `listing_reinstate` audit record; removing then
 * reinstating a published listing restores the published status.
 *
 * Validates Requirements 6.5 (remove with a 10..500 reason → removed, reason
 * recorded, audited), 6.6 (missing / out-of-bounds reason blocked, status
 * unchanged), and 6.7 (reinstate → published + audit).
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

/** A valid removal reason whose length is within `[10, 500]`. */
const validReasonArb: fc.Arbitrary<string> = boundedReasonArb(
  REMOVAL_REASON_MIN_LENGTH,
  REMOVAL_REASON_MAX_LENGTH,
)

/**
 * An invalid removal reason: a too-short string (length 0..9, below the
 * minimum), a too-long string (length 501..520, above the maximum), or
 * `undefined` (no reason supplied at all).
 */
const invalidReasonArb: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.string({ minLength: 0, maxLength: REMOVAL_REASON_MIN_LENGTH - 1 }),
  fc.string({
    minLength: REMOVAL_REASON_MAX_LENGTH + 1,
    maxLength: REMOVAL_REASON_MAX_LENGTH + 20,
  }),
  fc.constant(undefined),
)

/** A listing forced into a specific moderation status. */
function listingWithStatus(
  base: AdminListing,
  status: ModerationStatus,
): AdminListing {
  return { ...base, moderationStatus: status }
}

describe('listings.moderate (guarded, audited moderation round-trip)', () => {
  // Feature: admin-dashboard, Property 18: Listing moderation round-trips and is audited
  // Validates: Requirements 6.5
  it('removing with a valid 10..500 reason sets status to removed, records the reason, never mutates the input + a complete audit record (Req 6.5)', () => {
    fc.assert(
      fc.property(
        adminListingArb,
        validReasonArb,
        idArb,
        nowArb,
        (base, reason, actor, now) => {
          // Start from a published listing so the removal is a real transition.
          const listing = listingWithStatus(base, 'published')
          const before = { ...listing }

          // Sanity: the reason is within the accepted bounds.
          expect(validateRemovalReason(reason).ok).toBe(true)

          const result = moderate(listing, 'remove', reason)

          // The removal succeeds and sets the status to removed.
          expect(result.ok).toBe(true)
          if (!result.ok) return
          expect(result.listing.moderationStatus).toBe('removed')
          expect(result.listing.removalReason).toBe(reason)

          // Non-mutating: a fresh object is returned, the input is untouched.
          expect(result.listing).not.toBe(listing)
          expect(listing).toEqual(before)

          // Other identifying fields are preserved.
          expect(result.listing.id).toBe(listing.id)
          expect(result.listing.title).toBe(listing.title)
          expect(result.listing.sellerId).toBe(listing.sellerId)

          // The audit record carries the required fields, including the reason.
          const record = buildModerationAuditRecord(
            actor,
            result.listing,
            'remove',
            now,
          )
          expect(record.actorId).toBe(actor)
          expect(record.entityId).toBe(listing.id)
          expect(record.details?.affectedId).toBe(listing.id)
          expect(record.details?.removalReason).toBe(reason)
          expect(record.actionType).toBe(LISTING_REMOVE_ACTION)
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          const parsed = Date.parse(record.timestamp)
          expect(Number.isNaN(parsed)).toBe(false)
          expect(parsed).toBe(Math.floor(now / 1000) * 1000)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 18: Listing moderation round-trips and is audited
  // Validates: Requirements 6.6
  it('removing with a missing or out-of-bounds reason is blocked (invalid_reason) and leaves the moderation status unchanged (Req 6.6)', () => {
    fc.assert(
      fc.property(adminListingArb, invalidReasonArb, (listing, reason) => {
        const before = { ...listing }

        // Sanity: the reason is outside the accepted bounds (or absent).
        expect(validateRemovalReason(reason ?? '').ok).toBe(false)

        const result = moderate(listing, 'remove', reason)

        // The removal is blocked with the documented reason.
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.reason).toBe('invalid_reason')

        // The input listing (status included) is left unchanged.
        expect(listing).toEqual(before)
        expect(listing.moderationStatus).toBe(before.moderationStatus)
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 18: Listing moderation round-trips and is audited
  // Validates: Requirements 6.7
  it('reinstating a removed listing sets status to published, never mutates the input + a complete audit record (Req 6.7)', () => {
    fc.assert(
      fc.property(
        adminListingArb,
        idArb,
        nowArb,
        (base, actor, now) => {
          // Start from a removed listing so reinstating is a real transition.
          const listing = listingWithStatus(base, 'removed')
          const before = { ...listing }

          const result = moderate(listing, 'reinstate')

          // The reinstatement succeeds and sets the status to published.
          expect(result.ok).toBe(true)
          if (!result.ok) return
          expect(result.listing.moderationStatus).toBe('published')

          // Non-mutating: a fresh object is returned, the input is untouched.
          expect(result.listing).not.toBe(listing)
          expect(listing).toEqual(before)

          // The audit record carries the required fields.
          const record = buildModerationAuditRecord(
            actor,
            result.listing,
            'reinstate',
            now,
          )
          expect(record.actorId).toBe(actor)
          expect(record.entityId).toBe(listing.id)
          expect(record.details?.affectedId).toBe(listing.id)
          expect(record.actionType).toBe(LISTING_REINSTATE_ACTION)
          expect(record.timestamp).toMatch(UTC_SECOND_TIMESTAMP)
          const parsed = Date.parse(record.timestamp)
          expect(Number.isNaN(parsed)).toBe(false)
          expect(parsed).toBe(Math.floor(now / 1000) * 1000)
        },
      ),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 18: Listing moderation round-trips and is audited
  // Validates: Requirements 6.5, 6.7
  it('removing then reinstating a published listing restores the published status (round-trip)', () => {
    fc.assert(
      fc.property(adminListingArb, validReasonArb, (base, reason) => {
        const listing = listingWithStatus(base, 'published')

        const removed = moderate(listing, 'remove', reason)
        expect(removed.ok).toBe(true)
        if (!removed.ok) return
        expect(removed.listing.moderationStatus).toBe('removed')

        const reinstated = moderate(removed.listing, 'reinstate')
        expect(reinstated.ok).toBe(true)
        if (!reinstated.ok) return

        // The round-trip restores the original published status.
        expect(reinstated.listing.moderationStatus).toBe('published')
        expect(reinstated.listing.id).toBe(listing.id)
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 18: Listing moderation round-trips and is audited
  // Validates: Requirements 6.5, 6.6
  it('a removal succeeds exactly when the removal reason is valid', () => {
    fc.assert(
      fc.property(
        adminListingArb,
        fc.oneof(validReasonArb, invalidReasonArb),
        (listing, reason) => {
          const result = moderate(listing, 'remove', reason)

          const reasonValid = validateRemovalReason(reason ?? '').ok
          expect(result.ok).toBe(reasonValid)

          if (result.ok) {
            expect(result.listing.moderationStatus).toBe('removed')
            expect(result.listing.removalReason).toBe(reason)
          } else {
            expect(result.reason).toBe('invalid_reason')
          }
        },
      ),
      { numRuns: RUNS },
    )
  })
})
