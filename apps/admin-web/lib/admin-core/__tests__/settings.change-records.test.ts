import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { diffSettings } from '../settings'
import type { PlatformSetting, SettingChange } from '../types'
import { idArb } from './arbitraries'

/**
 * Property test for admin-core settings change-record computation
 * (Property 24).
 *
 * For any previous and next settings snapshots, `diffSettings` produces exactly
 * one change entry per key present in *both* snapshots whose value differs, each
 * carrying the setting id, its previous value (from `prev`), and its next value
 * (from `next`). Unchanged keys and keys absent from `prev` produce no entry,
 * and entries preserve the iteration order of `next`. The acting identity and
 * timestamp the audit record additionally requires (Req 8.3) are layered on by
 * the action layer that owns those contextual values and are out of scope here.
 *
 * Validates Requirement 8.3.
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/**
 * Where a generated setting id lives across the two snapshots: only in `prev`,
 * only in `next`, or in both.
 */
type Presence = 'prevOnly' | 'nextOnly' | 'both'

/**
 * A description of a single distinct setting id and how it appears across the
 * `prev`/`next` snapshots. `prevValue` is its persisted value (used when it is
 * present in `prev`); `nextValue` is its proposed value (used when present in
 * `next` and the id is `nextOnly`); `sameValue` decides, for `both` ids,
 * whether the value is unchanged (equal to `prevValue`) or changed.
 */
interface SettingSpec {
  id: string
  presence: Presence
  prevValue: number
  nextValue: number
  sameValue: boolean
}

const settingSpecArb: fc.Arbitrary<SettingSpec> = fc.record({
  id: idArb,
  presence: fc.constantFrom<Presence>('prevOnly', 'nextOnly', 'both'),
  prevValue: fc.integer(),
  nextValue: fc.integer(),
  sameValue: fc.boolean(),
})

/**
 * A set of {@link SettingSpec}s with distinct ids. Uniqueness of ids keeps the
 * "exactly one entry per key" invariant unambiguous (no key appears twice in a
 * single snapshot).
 */
const specsArb: fc.Arbitrary<SettingSpec[]> = fc.uniqueArray(settingSpecArb, {
  selector: (spec) => spec.id,
  maxLength: 12,
})

/** The value a `both` id carries in `next`: equal to its previous value when
 * `sameValue`, otherwise forced to genuinely differ. */
function changedNextValue(spec: SettingSpec): number {
  if (spec.sameValue) return spec.prevValue
  return spec.nextValue === spec.prevValue ? spec.prevValue + 1 : spec.nextValue
}

/** The `prev` snapshot derived from the specs (ids present in `prev`). */
function buildPrev(specs: readonly SettingSpec[]): PlatformSetting[] {
  return specs
    .filter((spec) => spec.presence === 'prevOnly' || spec.presence === 'both')
    .map((spec) => ({ id: spec.id, value: spec.prevValue }))
}

/** The `next` snapshot derived from the specs (ids present in `next`); its
 * order is the spec order and defines the expected change-set order. */
function buildNext(specs: readonly SettingSpec[]): PlatformSetting[] {
  return specs
    .filter((spec) => spec.presence === 'nextOnly' || spec.presence === 'both')
    .map((spec) => ({
      id: spec.id,
      value:
        spec.presence === 'both' ? changedNextValue(spec) : spec.nextValue,
    }))
}

/** The expected change set: one entry, in `next` order, per `both` id whose
 * value actually differs. */
function expectedChanges(specs: readonly SettingSpec[]): SettingChange[] {
  return specs
    .filter((spec) => spec.presence === 'both' && !spec.sameValue)
    .map((spec) => ({
      id: spec.id,
      previous: spec.prevValue,
      next: changedNextValue(spec),
    }))
}

describe('settings.diffSettings change-record completeness', () => {
  // Feature: admin-dashboard, Property 24: Settings change records are complete
  // Validates: Requirements 8.3
  it('emits exactly one entry per shared key whose value differs, carrying id/previous/next, in next order, and none for unchanged or next-only keys', () => {
    fc.assert(
      fc.property(specsArb, (specs) => {
        const prev = buildPrev(specs)
        const next = buildNext(specs)

        const result = diffSettings(prev, next)
        const expected = expectedChanges(specs)

        const prevById = new Map(prev.map((s) => [s.id, s.value]))
        const nextById = new Map(next.map((s) => [s.id, s.value]))

        // (1)+(2)+(3)+(4) Soundness, completeness, correct payload, and order:
        // the change set is precisely the shared-key differing entries in next
        // order — this single equality pins down every invariant at once.
        expect(result).toEqual(expected)

        // (1) Exactly one entry per differing shared key: the set of ids in the
        // result has no duplicates and matches the differing shared keys.
        const resultIds = result.map((c) => c.id)
        expect(new Set(resultIds).size).toBe(resultIds.length)

        for (const change of result) {
          // (2) Each entry carries the previous value from prev and the next
          // value from next for that key.
          expect(prevById.get(change.id)).toBe(change.previous)
          expect(nextById.get(change.id)).toBe(change.next)

          // (3) No entry for unchanged keys: previous and next genuinely differ.
          expect(change.previous).not.toBe(change.next)

          // (3) No entry for keys absent from prev: every emitted key exists in
          // both snapshots.
          expect(prevById.has(change.id)).toBe(true)
          expect(nextById.has(change.id)).toBe(true)
        }

        // (3) Keys present only in next never produce an entry.
        for (const setting of next) {
          if (!prevById.has(setting.id)) {
            expect(resultIds).not.toContain(setting.id)
          }
        }

        // (4) The emitted order is a subsequence of next's iteration order.
        const nextOrder = next.map((s) => s.id)
        const positions = resultIds.map((id) => nextOrder.indexOf(id))
        const ascending = positions.every(
          (pos, i) => i === 0 || positions[i - 1] < pos,
        )
        expect(ascending).toBe(true)
      }),
      { numRuns: RUNS },
    )
  })
})
