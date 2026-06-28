'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Locale } from '@/content/landing'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  toggleLocale: () => {},
})

export function I18nProvider({
  children,
  defaultLocale = 'en',
}: {
  children: React.ReactNode
  defaultLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale
    }
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'ne' : 'en')
  }, [locale, setLocale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useLocale() {
  return useContext(I18nContext)
}
