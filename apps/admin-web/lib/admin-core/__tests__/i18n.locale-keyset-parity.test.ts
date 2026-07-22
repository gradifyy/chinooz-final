import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import enCatalog from '@chinooz/i18n/locales/en.json'
import neCatalog from '@chinooz/i18n/locales/ne.json'

/**
 * Property test for locale keyset parity (Property 28).
 *
 * The EN and NE locale catalogs exposed by `@chinooz/i18n` must declare an
 * identical set of text keys: every key present in English is present in
 * Nepali and vice versa, with no missing or extra keys in either language. This
 * is what guarantees the Localization_Service can provide exactly one English
 * and one Nepali string for every user-visible text key.
 *
 * The catalogs are nested objects, so a "key" here is the dotted path to a leaf
 * string value (e.g. `common.appName`). The check is scoped to the `admin.*`
 * subtree owned by this spec (added in task 13.1); the broader catalogs share
 * the same parity intent under Req 10.4, but only the admin keys are within the
 * Admin Dashboard's control.
 *
 * Validates Requirement 10.4 (THE Localization_Service SHALL provide exactly
 * one English string and one Nepali string for every user-visible text key).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** Prefix guaranteed never to collide with a real catalog key path. */
const SYNTHETIC_PREFIX = '__pbt_synthetic__'

/** Narrows an unknown JSON value to a traversable plain object (not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Collects the dotted paths of every leaf (non-object) value in a nested
 * catalog. A leaf is any value that is not a plain object — i.e. the string
 * translations themselves. Object nodes are recursed into; their own path is
 * not emitted, only the leaves beneath them, so two catalogs agree on a path
 * only when they agree on its full nesting shape down to the string value.
 */
function collectLeafKeys(node: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(value)) {
      keys.push(...collectLeafKeys(value, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

/**
 * The symmetric difference between two key sets, partitioned by direction.
 * `missingInNe` are EN keys absent from NE; `missingInEn` are NE keys absent
 * from EN. Both empty means the two sets are identical — keyset parity.
 */
function parityDiff(
  en: ReadonlySet<string>,
  ne: ReadonlySet<string>,
): { missingInNe: ReadonlySet<string>; missingInEn: ReadonlySet<string> } {
  return {
    missingInNe: new Set([...en].filter((k) => !ne.has(k))),
    missingInEn: new Set([...ne].filter((k) => !en.has(k))),
  }
}

// Resolve the admin.* subtree of each catalog. Treat the imported JSON as
// untyped and narrow it, so the test makes no assumptions about the generated
// JSON module type beyond "nested object of strings".
const enAdminNode = (enCatalog as Record<string, unknown>).admin
const neAdminNode = (neCatalog as Record<string, unknown>).admin

if (!isPlainObject(enAdminNode) || !isPlainObject(neAdminNode)) {
  throw new Error('Expected an `admin` object in both en.json and ne.json')
}

const enKeys: ReadonlySet<string> = new Set(collectLeafKeys(enAdminNode))
const neKeys: ReadonlySet<string> = new Set(collectLeafKeys(neAdminNode))
const allKeys: readonly string[] = [...new Set([...enKeys, ...neKeys])]

/** A synthetic leaf path that is guaranteed not to exist in either catalog. */
const syntheticKeyArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 12 })
  .map((suffix) => `${SYNTHETIC_PREFIX}.${suffix}`)

/**
 * A perturbation applied to the Nepali catalog relative to the (parity)
 * baseline: an arbitrary subset of real keys to drop, and an arbitrary set of
 * synthetic keys to add. The empty perturbation reproduces the real catalog, so
 * the property also exercises actual parity.
 */
const perturbationArb = fc.record({
  remove: fc.subarray([...allKeys]),
  add: fc.uniqueArray(syntheticKeyArb, { maxLength: 6 }),
})

describe('i18n locale keyset parity (Property 28)', () => {
  // Feature: admin-dashboard, Property 28: Locale keyset parity
  // Validates: Requirements 10.4
  it('admin.* EN and NE catalogs share an identical keyset, and any divergence is detected exactly', () => {
    // Foundation: the actual catalogs are in parity — no missing or extra keys
    // in either language. This is the literal statement of Property 28.
    const baseline = parityDiff(enKeys, neKeys)
    expect([...baseline.missingInNe]).toEqual([])
    expect([...baseline.missingInEn]).toEqual([])

    // Property: starting from the parity baseline, introducing any asymmetry
    // into the Nepali catalog is detected exactly — dropped real keys surface
    // as missing-in-NE, and synthetic additions surface as missing-in-EN. This
    // confirms the parity relation is both sound (no false alarms when the empty
    // perturbation reproduces the real catalogs) and complete (every deviation
    // is caught).
    fc.assert(
      fc.property(perturbationArb, ({ remove, add }) => {
        const perturbedNe = new Set(neKeys)
        for (const key of remove) perturbedNe.delete(key)
        for (const key of add) perturbedNe.add(key)

        const diff = parityDiff(enKeys, perturbedNe)

        // EN keys absent from the perturbed NE set are exactly the removed keys
        // (every removed key was in EN, since the baseline is in parity).
        const expectedMissingInNe = new Set(remove.filter((k) => enKeys.has(k)))
        // NE keys absent from EN are exactly the synthetic additions.
        const expectedMissingInEn = new Set(add)

        expect(diff.missingInNe).toEqual(expectedMissingInNe)
        expect(diff.missingInEn).toEqual(expectedMissingInEn)
      }),
      { numRuns: RUNS },
    )
  })
})
