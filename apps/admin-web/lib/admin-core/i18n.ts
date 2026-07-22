/**
 * Admin-core localization domain logic.
 *
 * Pure helpers backing the Localization_Service (Requirement 10). No I/O, no
 * React, no cookies, no fetch — plain typed inputs and outputs. Reading the
 * `chinooz-locale` cookie, wiring `@chinooz/i18n` (i18next, EN + NE), the
 * `LanguageToggle` island, and rendering the "translation missing" indicator
 * live in the layout / island / page layers; this module only resolves a raw
 * cookie value to a supported locale (Req 10.5) and resolves a single text key
 * against the EN/NE catalogs with English fallback (Req 10.6).
 *
 * Catalogs are plain key→string maps, consistent with how `@chinooz/i18n`
 * exposes its locale resources. A key is considered *present* in a catalog when
 * it is an own property of that catalog with a string value.
 *
 * See design.md "Localization_Service" / `lib/admin-core/i18n` and Correctness
 * Properties 26 (selected language with English fallback) and 27 (default
 * locale is English).
 */

// ---------------------------------------------------------------------------
// Supported locales (Req 10.5)
// ---------------------------------------------------------------------------

/**
 * The locales the Admin Dashboard supports. Mirrors `SupportedLocale` from
 * `@chinooz/i18n` and the `CurrencyLocale` declared by the formatting modules
 * (`'en'` English, `'ne'` Nepali). Declared locally to keep this module pure
 * and dependency-free, matching the pattern used by `orders.ts` / `analytics.ts`.
 */
export type Locale = 'en' | 'ne'

/** English — the default locale rendered until one is explicitly selected. */
export const DEFAULT_LOCALE: Locale = 'en'

/** The set of supported locale codes used to validate a raw cookie value. */
const SUPPORTED_LOCALES: ReadonlySet<string> = new Set<Locale>(['en', 'ne'])

/**
 * A key→string catalog of localized text, as exposed per-locale by
 * `@chinooz/i18n`. Read-only: resolution never mutates a catalog.
 */
export type Catalog = Readonly<Record<string, string>>

// ---------------------------------------------------------------------------
// Locale resolution (Req 10.5 — Property 27)
// ---------------------------------------------------------------------------

/**
 * Resolves a raw locale cookie value to a supported {@link Locale}.
 *
 * Returns the value unchanged only when it is exactly one of the supported
 * locale codes (`'en'` or `'ne'`); every other input — `undefined`, an empty
 * string, or any unsupported/garbage value — resolves to the default locale
 * {@link DEFAULT_LOCALE} (`'en'`). This is the basis for rendering in English
 * until an administrator explicitly selects a language (Req 10.5 — Property 27).
 */
export function resolveLocale(cookieValue?: string | null): Locale {
  if (cookieValue !== undefined && cookieValue !== null && SUPPORTED_LOCALES.has(cookieValue)) {
    return cookieValue as Locale
  }
  return DEFAULT_LOCALE
}

// ---------------------------------------------------------------------------
// String resolution with English fallback (Req 10.6 — Property 26)
// ---------------------------------------------------------------------------

/**
 * Outcome of {@link resolveString}.
 *
 * - `value` is the text to render.
 * - `missing` flags that the selected-locale string was unavailable and a
 *   fallback (English, or the key itself) was used, so the UI can surface a
 *   "translation missing" indicator (Req 10.6).
 * - `absent` is `true` only in the strongest gap case — the key exists in
 *   neither the selected locale nor English — in which case `value` echoes the
 *   key itself as a last-resort indication.
 */
export interface ResolvedString {
  value: string
  missing: boolean
  absent: boolean
}

/**
 * Looks up `key` in `catalog`, returning the string value when the key is an
 * own property of the catalog with a string value, or `undefined` otherwise.
 * Using an explicit own-property check keeps lookup correct regardless of the
 * TypeScript index-access strictness in effect.
 */
function lookup(catalog: Catalog, key: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(catalog, key)) {
    const value = catalog[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

/**
 * Resolves a single text `key` for the selected `locale` against the English
 * (`en`) and Nepali (`ne`) catalogs, with English fallback (Req 10.6 —
 * Property 26).
 *
 * Three cases:
 * 1. The key is present in the selected locale → its value is returned with
 *    `missing: false` and `absent: false`.
 * 2. The key is absent in the selected locale but present in English → the
 *    English value is returned with `missing: true` and `absent: false`, so the
 *    UI can show the English text and flag the gap.
 * 3. The key is absent in both catalogs → the key itself is returned as the
 *    value with `missing: true` and `absent: true`, indicating no translation
 *    exists in either locale.
 *
 * When the selected locale is English, the English catalog is consulted first
 * as the "selected" locale, so a present English key reports `missing: false`.
 * Pure and non-mutating; neither catalog is modified.
 */
export function resolveString(
  key: string,
  locale: Locale,
  en: Catalog,
  ne: Catalog,
): ResolvedString {
  const selected = locale === 'ne' ? ne : en

  const selectedValue = lookup(selected, key)
  if (selectedValue !== undefined) {
    return { value: selectedValue, missing: false, absent: false }
  }

  const englishValue = lookup(en, key)
  if (englishValue !== undefined) {
    return { value: englishValue, missing: true, absent: false }
  }

  return { value: key, missing: true, absent: true }
}
