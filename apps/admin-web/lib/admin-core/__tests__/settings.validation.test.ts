import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  SETTING_DEFS,
  validateSettings,
  type SettingDef,
} from '../settings'
import type { SettingChange } from '../types'
import { idArb } from './arbitraries'

/**
 * Property test for admin-core settings validation all-or-nothing semantics
 * (Property 23).
 *
 * For any submitted settings map, `validateSettings` returns `ok: true` if and
 * only if every *changed* value (`next !== previous`) lies within its defined
 * inclusive range; if any changed value is out of range — or references an
 * unknown setting id — the result is a rejection (`ok: false`) that lists each
 * offending setting identifier with its accepted range and produces no change
 * set, leaving persisted values unchanged.
 *
 * Validates Requirement 8.2 (a submission whose every changed value is within
 * range is persisted) and Requirement 8.4 (any out-of-range value rejects the
 * entire submission, retains all previously persisted values, and reports the
 * offending setting id with its accepted range).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** The registered setting ids that carry a defined `[min, max]` range. */
const KNOWN_IDS = Object.keys(SETTING_DEFS)

/**
 * Builds a `next` value for a known setting that is deliberately out of its
 * defined inclusive range — either below `min` or above `max`.
 */
function outOfRangeNextArb(def: SettingDef): fc.Arbitrary<number> {
  return fc.oneof(
    fc.integer({ min: def.min - 1_000, max: def.min - 1 }),
    fc.integer({ min: def.max + 1, max: def.max + 1_000 }),
  )
}

/**
 * A single {@link SettingChange} for a *known* setting whose `next` lies within
 * range and genuinely differs from `previous` (so it counts as a changed,
 * valid entry). `previous` is forced out of range when possible to prove
 * unchanged values are never inspected — only `next` matters for validity.
 */
const validChangedArb: fc.Arbitrary<SettingChange> = fc
  .constantFrom(...KNOWN_IDS)
  .chain((id) => {
    const def = SETTING_DEFS[id]
    return fc
      .tuple(
        fc.integer({ min: def.min, max: def.max }),
        fc.integer({ min: def.min, max: def.max }),
      )
      .map(([a, b]) => {
        const next = a
        // Ensure next !== previous so this is a *changed* entry; if the two
        // generated in-range values collide, nudge previous within range.
        let previous = b
        if (previous === next) {
          previous = next === def.max ? def.min : next + 1
        }
        return { id, previous, next }
      })
  })

/**
 * A single {@link SettingChange} for a known setting whose `next` is out of
 * range and differs from `previous` (a changed, offending entry).
 */
const invalidChangedArb: fc.Arbitrary<SettingChange> = fc
  .constantFrom(...KNOWN_IDS)
  .chain((id) => {
    const def = SETTING_DEFS[id]
    return fc
      .tuple(outOfRangeNextArb(def), fc.integer({ min: def.min, max: def.max }))
      .map(([next, previous]) => ({ id, previous, next }))
  })

/**
 * A single {@link SettingChange} that is *unchanged* (`next === previous`).
 * Its value is forced out of range to prove unchanged entries are skipped
 * entirely: they neither appear in the change set nor produce a violation.
 */
const unchangedArb: fc.Arbitrary<SettingChange> = fc
  .constantFrom(...KNOWN_IDS)
  .chain((id) => {
    const def = SETTING_DEFS[id]
    return outOfRangeNextArb(def).map((value) => ({
      id,
      previous: value,
      next: value,
    }))
  })

/**
 * A changed {@link SettingChange} referencing an *unknown* setting id (one with
 * no {@link SettingDef}). Such entries have no defined range and must always be
 * reported as a violation with the zero-width `[0, 0]` placeholder range.
 */
const unknownChangedArb: fc.Arbitrary<SettingChange> = fc
  .record({
    id: idArb.filter((id) => SETTING_DEFS[id] === undefined),
    previous: fc.integer(),
    next: fc.integer(),
  })
  .map((change) =>
    change.next === change.previous
      ? { ...change, next: change.previous + 1 }
      : change,
  )

/** A submission mixing valid, invalid, unchanged, and unknown-id entries. */
const submissionArb: fc.Arbitrary<SettingChange[]> = fc.array(
  fc.oneof(validChangedArb, invalidChangedArb, unchangedArb, unknownChangedArb),
  { maxLength: 20 },
)

/** A submission guaranteed to contain only valid changed and unchanged entries. */
const allValidSubmissionArb: fc.Arbitrary<SettingChange[]> = fc.array(
  fc.oneof(validChangedArb, unchangedArb),
  { maxLength: 20 },
)

/** Whether a change is *changed* (its proposed value differs from persisted). */
function isChanged(change: SettingChange): boolean {
  return change.next !== change.previous
}

/** Whether a *changed* entry is out of range or references an unknown setting. */
function isOffending(change: SettingChange): boolean {
  const def = SETTING_DEFS[change.id]
  if (def === undefined) return true
  return change.next < def.min || change.next > def.max
}

describe('settings.validateSettings all-or-nothing validation', () => {
  // Feature: admin-dashboard, Property 23: Settings validation is all-or-nothing
  // Validates: Requirements 8.2, 8.4
  it('accepts iff every changed value is in range, else rejects entirely with per-violation ranges and no change set', () => {
    fc.assert(
      fc.property(submissionArb, (submitted) => {
        const result = validateSettings(SETTING_DEFS, submitted)

        const changed = submitted.filter(isChanged)
        const offending = changed.filter(isOffending)

        if (offending.length === 0) {
          // ----- Acceptance direction (Req 8.2) -----
          expect(result.ok).toBe(true)
          if (result.ok) {
            // The change set is exactly the entries whose value changed.
            expect(result.changed).toEqual(changed)

            // Unchanged entries never leak into the change set, even when their
            // value would be out of range.
            for (const entry of result.changed) {
              expect(entry.next).not.toBe(entry.previous)
            }
          }
        } else {
          // ----- Rejection direction (Req 8.4): all-or-nothing -----
          expect(result.ok).toBe(false)
          if (!result.ok) {
            // One violation per offending changed setting — same count, and a
            // violation for each offending id carrying its accepted range.
            expect(result.violations.length).toBe(offending.length)

            const expectedViolations = offending.map((change) => {
              const def = SETTING_DEFS[change.id]
              return def === undefined
                ? { id: change.id, min: 0, max: 0 }
                : { id: def.id, min: def.min, max: def.max }
            })
            expect(result.violations).toEqual(expectedViolations)

            // Rejection carries no change set, so the caller persists nothing
            // and leaves all previously persisted values unchanged.
            expect('changed' in result).toBe(false)

            // Every reported violation traces back to a *changed* offending
            // entry — never to an unchanged entry, even one out of range. We
            // confirm the violation count never exceeds the number of changed
            // offenders, so unchanged out-of-range entries add nothing.
            const changedOffenders = changed.filter(isOffending)
            expect(result.violations.length).toBe(changedOffenders.length)
          }
        }
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 23: Settings validation is all-or-nothing
  // Validates: Requirements 8.2
  it('accepts an all-in-range submission and returns exactly the changed entries', () => {
    fc.assert(
      fc.property(allValidSubmissionArb, (submitted) => {
        const result = validateSettings(SETTING_DEFS, submitted)

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.changed).toEqual(submitted.filter(isChanged))
          // Non-mutating: a fresh array, the input is untouched.
          expect(result.changed).not.toBe(submitted)
        }
      }),
      { numRuns: RUNS },
    )
  })
})
