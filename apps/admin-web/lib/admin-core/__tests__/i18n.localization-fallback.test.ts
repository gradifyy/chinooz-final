import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { resolveString, type Catalog, type Locale } from '../i18n'

/**
 * Property test for admin-core localization fallback (Property 26).
 *
 * For any text key, selected locale, and EN/NE catalogs, `resolveString`:
 *  1. resolves the selected-locale string when the key is present there
 *     (`missing: false`, `absent: false`);
 *  2. falls back to the English string when the key is absent in the selected
 *     locale but present in English (`missing: true`, `absent: false`); and
 *  3. returns the key itself as a last-resort value when the key is absent in
 *     both catalogs (`missing: true`, `absent: true`).
 *
 * Validates Requirement 10.1 (render every user-visible string in the selected
 * language, EN or NE) and Requirement 10.6 (fall back to English and indicate a
 * missing translation when the selected language has no string for a key).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** The three resolution branches Property 26 must exercise. */
type Branch = 'selected' | 'english-fallback' | 'absent-both'

/**
 * Own-property lookup mirroring `resolveString`'s presence rule: a key counts as
 * present only when it is an own string-valued property of the catalog. Plain
 * index access (`catalog[key]`) would spuriously resolve inherited members like
 * `toString`, so assertions must use this instead.
 */
function own(catalog: Catalog, key: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(catalog, key)) {
    const value = catalog[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

/** Distinct text keys the catalogs are built from. */
const keyArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 })

/** A localized string value (allowed to be empty — still a present mapping). */
const valueArb: fc.Arbitrary<string> = fc.string({ maxLength: 30 })

const localeArb: fc.Arbitrary<Locale> = fc.constantFrom('en', 'ne')

/**
 * A deliberately-constructed scenario that lands on a chosen resolution branch.
 *
 * Rather than relying on chance to populate the catalogs, we generate a key, a
 * selected locale, and a target branch, then build the EN and NE catalogs so
 * the key's presence in each catalog matches that branch exactly:
 *  - `selected`: present in the selected locale (value `selectedValue`).
 *  - `english-fallback`: absent in the selected locale but present in English.
 *  - `absent-both`: present in neither English nor Nepali.
 *
 * Each catalog is also seeded with unrelated noise entries (whose keys differ
 * from `key`) so resolution must discriminate by key, not by catalog emptiness.
 */
const scenarioArb = fc
  .record({
    key: keyArb,
    locale: localeArb,
    branch: fc.constantFrom<Branch>(
      'selected',
      'english-fallback',
      'absent-both',
    ),
    selectedValue: valueArb,
    englishValue: valueArb,
    noise: fc.dictionary(keyArb, valueArb, { maxKeys: 8 }),
  })
  .map(({ key, locale, branch, selectedValue, englishValue, noise }) => {
    // Noise must never collide with the key under test, or it would change the
    // intended presence/absence for this scenario.
    const baseNoise: Record<string, string> = {}
    for (const [noiseKey, noiseValue] of Object.entries(noise)) {
      if (noiseKey !== key) baseNoise[noiseKey] = noiseValue
    }

    const en: Record<string, string> = { ...baseNoise }
    const ne: Record<string, string> = { ...baseNoise }

    switch (branch) {
      case 'selected': {
        // Present in the selected locale; for 'en' the selected locale IS en.
        if (locale === 'en') {
          en[key] = selectedValue
        } else {
          ne[key] = selectedValue
        }
        break
      }
      case 'english-fallback': {
        // Present in English, absent in the selected locale. The key is already
        // excluded from `ne` (noise never includes `key`). When the selected
        // locale is English this collapses to the 'selected' case, normalized
        // via `effectiveBranch` below.
        en[key] = englishValue
        break
      }
      case 'absent-both': {
        // Present in neither catalog — keys already excluded from noise.
        break
      }
    }

    // When the selected locale is English, the 'english-fallback' branch is
    // indistinguishable from 'selected' (the same catalog supplies the value).
    // Normalize the expected branch accordingly so assertions stay exact.
    const effectiveBranch: Branch =
      branch === 'english-fallback' && locale === 'en' ? 'selected' : branch

    return {
      key,
      locale,
      en: en as Catalog,
      ne: ne as Catalog,
      branch: effectiveBranch,
      selectedValue,
      englishValue,
    }
  })

describe('i18n.resolveString localization fallback', () => {
  // Feature: admin-dashboard, Property 26: Localization resolves the selected language with English fallback
  // Validates: Requirements 10.1, 10.6
  it('resolves selected locale, falls back to English, then echoes the key when absent in both', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { key, locale, en, ne, branch } = scenario
        const result = resolveString(key, locale, en, ne)

        const selectedCatalog = locale === 'ne' ? ne : en

        switch (branch) {
          case 'selected': {
            // Case 1: present in the selected locale → its value, no gap.
            expect(result.value).toBe(own(selectedCatalog, key))
            expect(result.missing).toBe(false)
            expect(result.absent).toBe(false)
            break
          }
          case 'english-fallback': {
            // Case 2: absent in selected locale, present in English → English
            // value, flagged missing but not absent.
            expect(own(selectedCatalog, key)).toBeUndefined()
            expect(result.value).toBe(own(en, key))
            expect(result.missing).toBe(true)
            expect(result.absent).toBe(false)
            break
          }
          case 'absent-both': {
            // Case 3: absent in both → the key itself, missing and absent.
            expect(own(en, key)).toBeUndefined()
            expect(own(ne, key)).toBeUndefined()
            expect(result.value).toBe(key)
            expect(result.missing).toBe(true)
            expect(result.absent).toBe(true)
            break
          }
        }
      }),
      { numRuns: RUNS },
    )
  })
})
