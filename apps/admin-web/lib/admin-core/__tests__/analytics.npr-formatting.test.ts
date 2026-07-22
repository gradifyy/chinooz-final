import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { formatNPRFromPaisa } from '@chinooz/utils'

import { formatMetricNPR, type CurrencyLocale } from '../analytics'
import { paisaArb } from './arbitraries'

/**
 * Property test for NPR monetary formatting (Property 19).
 *
 * For any non-negative integer-paisa amount and any supported locale,
 * `formatNPRFromPaisa` (from `@chinooz/utils`, backing the order/listing
 * monetary display — Req 5.5) produces a string that begins with the locale's
 * NPR prefix (`'NPR '` for `'en'`, `'रु. '` for `'ne'`). `formatMetricNPR`
 * (the analytics metric formatter — Req 7.3) likewise begins with that prefix
 * and *additionally* renders exactly two decimal places, regardless of whether
 * the amount is a whole-rupee value.
 *
 * Validates Requirements 5.5, 7.3.
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** The NPR prefix emitted for each supported locale (mirrors `@chinooz/utils`). */
const NPR_PREFIX: Record<CurrencyLocale, string> = {
  en: 'NPR ',
  ne: 'रु. ',
}

/** A supported currency locale. */
const localeArb: fc.Arbitrary<CurrencyLocale> = fc.constantFrom('en', 'ne')

/** Two decimal digits — ASCII (`en`) or Devanagari (`ne`). */
const TWO_DECIMAL_DIGITS = /^[0-9\u0966-\u096f]{2}$/u

describe('analytics NPR monetary formatting (Property 19)', () => {
  // Feature: admin-dashboard, Property 19: Monetary values are formatted in NPR
  // Validates: Requirements 5.5, 7.3
  it('formatNPRFromPaisa begins with the locale NPR prefix, and formatMetricNPR adds exactly two decimal places', () => {
    fc.assert(
      fc.property(paisaArb, localeArb, (paisa, locale) => {
        const prefix = NPR_PREFIX[locale]

        // formatNPRFromPaisa begins with the locale's NPR prefix (Req 5.5).
        const base = formatNPRFromPaisa(paisa, locale)
        expect(base.startsWith(prefix)).toBe(true)

        // formatMetricNPR begins with the same prefix (Req 7.3).
        const metric = formatMetricNPR(paisa, locale)
        expect(metric.startsWith(prefix)).toBe(true)

        // ...and renders exactly two decimal places. Inspect the body after
        // the prefix (the `'रु. '` prefix itself contains a period), which must
        // hold a single decimal separator followed by exactly two
        // locale-appropriate digits.
        const body = metric.slice(prefix.length)
        const dotCount = (body.match(/\./g) ?? []).length
        expect(dotCount).toBe(1)

        const decimals = body.slice(body.lastIndexOf('.') + 1)
        expect(decimals).toHaveLength(2)
        expect(TWO_DECIMAL_DIGITS.test(decimals)).toBe(true)
      }),
      { numRuns: RUNS },
    )
  })
})
