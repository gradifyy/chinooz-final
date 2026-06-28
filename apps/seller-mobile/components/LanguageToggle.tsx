import React, { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@chinooz/ui'
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
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('seller.welcome.languageAria')}
    >
      <SegmentedControl
        segments={segments}
        activeKey={locale}
        onChange={handleChange}
        testID="seller-language-toggle"
      />
    </View>
  )
}

const styles = StyleSheet.create({})
