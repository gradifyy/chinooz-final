import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import { resolveLocale, DEFAULT_LOCALE, type Locale } from '../i18n'

/**
 * Property test for admin-core default locale resolution (Property 27).
 *
 * `resolveLocale` returns a raw cookie value unchanged only when it is exactly a
 * supported locale code (`'en'` or `'ne'`). Every other input — `undefined`,
 * `null`, the empty string, or any arbitrary/garbage string — resolves to the
 * default locale {@link DEFAULT_LOCALE} (`'en'`). This is what renders the UI in
 * English until an administrator explicitly selects a language.
 *
 * Validates Requirement 10.5 (WHERE an Administrator has not yet selected a
 * language, render all user-visible strings in English as the default).
 *
 * Runs a minimum of 100 iterations per the design Testing Strategy.
 */

const RUNS = 100

/** The supported locale codes — the only values returned unchanged. */
const SUPPORTED: readonly Locale[] = ['en', 'ne']

/**
 * A raw cookie value that is NOT a supported locale code. Covers the three
 * "no valid selection" shapes plus arbitrary garbage strings:
 *  - `undefined` (cookie absent);
 *  - `null` (cookie explicitly cleared);
 *  - the empty string;
 *  - any string that is not exactly `'en'` or `'ne'` (including ones that merely
 *    resemble a locale, e.g. `'EN'`, `'en-US'`, `' en '`).
 */
const unsupportedCookieArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc
    .string({ maxLength: 30 })
    .filter((s) => !SUPPORTED.includes(s as Locale)),
)

describe('i18n.resolveLocale default locale', () => {
  // Feature: admin-dashboard, Property 27: Default locale is English
  // Validates: Requirements 10.5
  it('resolves any non-supported cookie value to the English default', () => {
    fc.assert(
      fc.property(unsupportedCookieArb, (cookieValue) => {
        expect(resolveLocale(cookieValue)).toBe(DEFAULT_LOCALE)
        expect(resolveLocale(cookieValue)).toBe('en')
      }),
      { numRuns: RUNS },
    )
  })

  // Feature: admin-dashboard, Property 27: Default locale is English
  // Validates: Requirements 10.5
  it('preserves an explicitly selected supported locale (default applies only without a valid selection)', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(resolveLocale('ne')).toBe('ne')
  })
})
