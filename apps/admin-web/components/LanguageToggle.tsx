'use client'

/**
 * Language toggle (client island).
 *
 * Switches the dashboard language without re-authentication (Req 10.2) and
 * persists the choice so it is reapplied at the start of every subsequent
 * session (Req 10.3). On change it:
 *
 * 1. Updates the shared `@chinooz/state` UI store (`setLocale`) — the
 *    `I18nProvider` reacts to this to call `i18n.changeLanguage`, re-rendering
 *    every client-island string and updating `<html lang>` instantly.
 * 2. Writes the `chinooz-locale` cookie *synchronously* — this is the
 *    server-readable persistence the root layout consults on every request
 *    (and on every new session), so it must be set before the refresh below.
 * 3. Calls `router.refresh()` so server components re-resolve their strings in
 *    the newly selected language. No session is touched, so the administrator
 *    stays signed in throughout.
 *
 * Labels are resolved against `@chinooz/i18n` by the server layout and passed
 * in as props, so this island holds no hard-coded user-visible strings
 * (Req 10.1). Presentation uses the shared `SegmentedControl` primitive and
 * `@chinooz/theme` tokens (Req 11.1).
 *
 * _Requirements: 10.2, 10.3_
 */

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentedControl } from '@chinooz/ui-web'
import { useUIStore, type Locale } from '@chinooz/state'

interface LanguageToggleProps {
  /** Localized labels for the toggle and its options. */
  labels: {
    /** Accessible name for the toggle group. */
    aria: string
    /** Label for the English option. */
    english: string
    /** Label for the Nepali option. */
    nepali: string
  }
}

/** One year, in seconds — the locale-cookie lifetime. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export default function LanguageToggle({ labels }: LanguageToggleProps) {
  const router = useRouter()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const handleChange = useCallback(
    (key: string) => {
      const next = key as Locale
      // 1. Update the shared store so client islands (via I18nProvider) switch
      //    language immediately and the choice is persisted client-side.
      setLocale(next)
      // 2. Persist the server-readable cookie synchronously, before refreshing,
      //    so the re-rendered server components observe the new locale and the
      //    choice is reapplied on every subsequent session (Req 10.3).
      document.cookie = `chinooz-locale=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
      // 3. Re-render server components so localized strings reflect the new
      //    locale — without touching the session (no re-auth) (Req 10.2).
      router.refresh()
    },
    [router, setLocale],
  )

  return (
    <div aria-label={labels.aria}>
      <SegmentedControl
        segments={[
          { key: 'en', label: labels.english },
          { key: 'ne', label: labels.nepali },
        ]}
        activeKey={locale}
        onChange={handleChange}
        testID="admin-language-toggle"
      />
    </div>
  )
}
