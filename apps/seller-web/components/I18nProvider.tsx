'use client'

import React, { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { initI18n, i18n } from '@chinooz/i18n'
import { useUIStore } from '@chinooz/state'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useUIStore(s => s.locale)

  useEffect(() => {
    initI18n(locale)
  }, [])

  useEffect(() => {
    if (i18n.isInitialized) {
      i18n.changeLanguage(locale)
    }
  }, [locale])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
