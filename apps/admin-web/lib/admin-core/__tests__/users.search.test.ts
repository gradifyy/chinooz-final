import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { searchUsers } from '../users'
import type { MarketplaceUser } from '../types'
import { marketplaceUserArb } from './arbitraries'

/**
 * Property tests for `searchUsers` (admin-core User_Management_Module).
 *
 * Property 11 — "User search is sound and complete": for any list of
 * marketplace users and any valid search term (length 2..100), `searchUsers`
 * returns exactly the users whose `name`, `phone`, or `email` contains the
 * term under case-insensitive comparison, preserving input order.
 *
 * Each property runs a minimum of 100 iterations per the design Testing
 * Strategy.
 */

const RUNS = 100

/** Inclusive valid search-term length bounds (Req 3.4). */
const TERM_MIN_LENGTH = 2
const TERM_MAX_LENGTH = 100

/**
 * Reference oracle mirroring the documented matching rule: a user matches when
 * `term` is a case-insensitive substring of its name, phone, or email. The
 * expected result of `searchUsers` is the input filtered by this predicate,
 * which captures soundness (every returned user matches) and completeness
 * (every matching user is returned) simultaneously, in input order.
 */
function matchesTerm(user: MarketplaceUser, term: string): boolean {
  const needle = term.toLowerCase()
  return (
    user.name.toLowerCase().includes(needle) ||
    user.phone.toLowerCase().includes(needle) ||
    user.email.toLowerCase().includes(needle)
  )
}

/** A random valid search term whose length is within [2, 100]. */
const randomTermArb: fc.Arbitrary<string> = fc.string({
  minLength: TERM_MIN_LENGTH,
  maxLength: TERM_MAX_LENGTH,
})

/**
 * Builds a search-term arbitrary biased toward terms that genuinely occur in
 * the supplied users — substrings (length 2..100) sliced from their generated
 * name/phone/email fields — mixed with purely random terms. Substrings
 * guarantee non-trivial (non-empty) match sets so the soundness/completeness
 * checks exercise both branches; random terms cover the typical "no match" and
 * partial-match space. Falls back to random terms when no field is long enough
 * to slice a length-≥2 substring from.
 */
function termArbFor(users: readonly MarketplaceUser[]): fc.Arbitrary<string> {
  const fields = users
    .flatMap((user) => [user.name, user.phone, user.email])
    .filter((field) => field.length >= TERM_MIN_LENGTH)

  if (fields.length === 0) return randomTermArb

  const substringArb = fc.constantFrom(...fields).chain((field) =>
    fc
      .tuple(
        fc.integer({ min: 0, max: field.length - TERM_MIN_LENGTH }),
        fc.integer({
          min: TERM_MIN_LENGTH,
          max: Math.min(field.length, TERM_MAX_LENGTH),
        }),
      )
      .map(([start, length]) => field.slice(start, start + length)),
  )

  return fc.oneof(randomTermArb, substringArb)
}

/** A list of users paired with a valid (often matching) search term. */
const usersAndTermArb: fc.Arbitrary<{
  users: MarketplaceUser[]
  term: string
}> = fc
  .array(marketplaceUserArb, { maxLength: 30 })
  .chain((users) =>
    termArbFor(users).map((term) => ({ users, term })),
  )

describe('users.searchUsers', () => {
  // Feature: admin-dashboard, Property 11: User search is sound and complete
  // Validates: Requirements 3.3
  it('returns exactly the users matching the term (case-insensitive), in input order', () => {
    fc.assert(
      fc.property(usersAndTermArb, ({ users, term }) => {
        const result = searchUsers(users, term)
        const expected = users.filter((user) => matchesTerm(user, term))

        // Soundness AND completeness in one shot: the result is precisely the
        // users satisfying the matching predicate, with original ordering.
        expect(result).toEqual(expected)

        // Soundness, stated independently: every returned user matches.
        for (const user of result) {
          expect(matchesTerm(user, term)).toBe(true)
        }

        // Completeness, stated independently: every excluded user does not match.
        const returned = new Set(result)
        for (const user of users) {
          if (!returned.has(user)) {
            expect(matchesTerm(user, term)).toBe(false)
          }
        }

        // Non-mutating: a fresh array is returned, the input is untouched.
        expect(result).not.toBe(users)
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 11: User search is sound and complete
  // Validates: Requirements 3.3
  it('is case-insensitive: upper/lower-cased variants of a term yield the same matches', () => {
    fc.assert(
      fc.property(usersAndTermArb, ({ users, term }) => {
        const base = searchUsers(users, term)
        const upper = searchUsers(users, term.toUpperCase())
        const lower = searchUsers(users, term.toLowerCase())

        // Folding the term's case must not change which users are returned.
        expect(upper).toEqual(base)
        expect(lower).toEqual(base)
      }),
      { numRuns: RUNS },
    )
  })
})
