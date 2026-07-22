'use client'

/**
 * Client-side localization initializer + provider (client island).
 *
 * Bridges the server-resolved locale (read from the `chinooz-locale` cookie in
 * the root layout) into the client runtime so that `useTranslation` /
 * `i18n.changeLanguage` work in interactive islands and the shared
 * `@chinooz/state` UI store reflects the persisted language on load.
 *
 * Responsibilities:
 * - Initialize `@chinooz/i18n` (i18next, EN + NE) with the server-resolved
 *   locale on first mount so the very first client render is already in the
 *   administrator's language (Req 10.1).
 * - Hydrate the UI store from the persisted (cookie) locale, so the store —
 *   and therefore the `LanguageToggle` — reflects the language reapplied at the
 *   start of every session (Req 10.3).
 * - Keep i18next and `<html lang>` synced whenever the active locale changes,
 *   switching all client-rendered strings without re-authentication (Req 10.2).
 *
 * Cookie persistence and server-component re-rendering are handled by the
 * `LanguageToggle` island (which writes the cookie synchronously before
 * refreshing) and the root layout (which reads the cookie on every request);
 * this provider owns only the client i18next/store wiring. It holds no
 * hard-coded user-visible strings.
 *
 * Follows the established `seller-web` `I18nProvider` pattern.
 *
 * _Requirements: 10.1, 10.2, 10.3_
 */

import { useEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { initI18n, i18n } from '@chinooz/i18n'
import { useUIStore, type Locale } from '@chinooz/state'

interface I18nProviderProps {
  /** Locale resolved server-side from the `chinooz-locale` cookie (Req 10.3, 10.5). */
  initialLocale: Locale
  children: ReactNode
}

export default function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  // Initialize i18next with the server-resolved locale and hydrate the store
  // from the persisted (cookie) locale, so the client reflects the language
  // reapplied at session start (Req 10.3). Runs once on mount after the store
  // has rehydrated from its (synchronous) persisted storage.
  useEffect(() => {
    initI18n(initialLocale)
    if (useUIStore.getState().locale !== initialLocale) {
      setLocale(initialLocale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch the active language for client-rendered strings — and mark up
  // `<html lang>` — whenever the locale changes, with no re-authentication
  // (Req 10.2). The cookie itself is written by the toggle island.
  useEffect(() => {
    if (i18n.isInitialized) {
      i18n.changeLanguage(locale)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
