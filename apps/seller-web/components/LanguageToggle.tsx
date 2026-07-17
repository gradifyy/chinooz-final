'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@chinooz/ui-web'
import { useUIStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'

/** One year, in seconds — the locale-cookie lifetime. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export default function LanguageToggle() {
  const { t } = useTranslation()
  const router = useRouter()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const segments = [
    { key: 'en', label: t('seller.welcome.languageEnglish') },
    { key: 'ne', label: t('seller.welcome.languageNepali') },
  ]

  const handleChange = useCallback(
    (key: string) => {
      const next = key as Locale
      // 1. Update the shared store so client islands (via I18nProvider) switch
      //    language immediately and the choice is persisted client-side.
      setLocale(next)
      // 2. Persist the server-readable cookie synchronously, before refreshing,
      //    so re-rendered server components observe the new locale and the
      //    choice is reapplied on every subsequent session.
      document.cookie = `chinooz-locale=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
      // 3. Re-render server components so localized strings reflect the new
      //    locale — without touching the session (no re-auth).
      router.refresh()
    },
    [router, setLocale],
  )

  return (
    <div aria-label={t('seller.welcome.languageAria')}>
      <SegmentedControl
        segments={segments}
        activeKey={locale}
        onChange={handleChange}
        testID="seller-language-toggle"
      />
    </div>
  )
}
