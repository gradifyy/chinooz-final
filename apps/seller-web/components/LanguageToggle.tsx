'use client'

import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@chinooz/ui-web'
import { useUIStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'

export default function LanguageToggle() {
  const { t } = useTranslation()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const segments = [
    { key: 'en', label: t('seller.welcome.languageEnglish') },
    { key: 'ne', label: t('seller.welcome.languageNepali') },
  ]

  const handleChange = useCallback(
    (key: string) => {
      setLocale(key as Locale)
    },
    [setLocale],
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
