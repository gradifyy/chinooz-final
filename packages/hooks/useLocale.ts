import { useTranslation } from 'react-i18next'
import { useUIStore } from '@chinooz/state'
import type { CurrencyLocale } from '@chinooz/utils'

/**
 * Resolve the active UI locale for locale-aware formatting (currency, dates).
 *
 * Prefers the shared `@chinooz/state` UI store (the single source of truth that
 * the `I18nProvider` keeps in sync with i18next), and falls back to
 * `i18n.language` for components that render before the store has hydrated.
 *
 * Returns a `CurrencyLocale` ('en' | 'ne') suitable for `formatNPR(amount, locale)`,
 * `formatNPRFromPaisa(paisa, locale)`, `formatDateLong(date, locale)`, etc.
 */
export function useLocale(): CurrencyLocale {
  const storeLocale = useUIStore(s => s.locale)
  const { i18n } = useTranslation()
  const resolved = storeLocale ?? i18n.language
  return resolved?.startsWith('ne') ? 'ne' : 'en'
}
