import { describe, it, expect } from 'vitest'

import enCatalog from '../locales/en.json'
import neCatalog from '../locales/ne.json'

/**
 * Whole-catalog locale keyset parity.
 *
 * The EN and NE locale catalogs must declare an identical set of dotted leaf
 * keys: every key present in English must be present in Nepali and vice versa,
 * with no missing or extra keys in either language. This is what guarantees
 * every user-visible string has exactly one English and one Nepali translation
 * (AGENTS.md "Bi/bilingual" convention).
 *
 * The admin-web package has a property-based parity test, but it is scoped to
 * the `admin.*` subtree only. This test guards the *entire* catalog (all ~8,300
 * leaf keys across every namespace: common, seller, rider, buyer, admin, etc.)
 * so a drift anywhere in the monorepo's shared i18n catalog is caught before
 * it ships.
 */

/** Narrows an unknown JSON value to a traversable plain object (not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Collects the dotted paths of every leaf (non-object) value in a nested catalog. */
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

const enKeys = new Set(collectLeafKeys(enCatalog as Record<string, unknown>))
const neKeys = new Set(collectLeafKeys(neCatalog as Record<string, unknown>))

describe('i18n whole-catalog locale keyset parity', () => {
  it('en.json and ne.json declare the same set of leaf keys (no missing, no extra)', () => {
    const missingInNe = [...enKeys].filter(k => !neKeys.has(k))
    const missingInEn = [...neKeys].filter(k => !enKeys.has(k))

    expect(missingInNe).toEqual([])
    expect(missingInEn).toEqual([])
  })

  it('both catalogs are non-empty', () => {
    expect(enKeys.size).toBeGreaterThan(0)
    expect(neKeys.size).toBeGreaterThan(0)
  })

  it('both catalogs have the same number of leaf keys', () => {
    expect(enKeys.size).toBe(neKeys.size)
  })
})
