import React, { useMemo, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { spacing, radii, fontSz, colors as lightColors } from '@chinooz/theme'
import { useUIStore, useSessionStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'
import { i18n } from '@chinooz/i18n'
import { useAppTheme } from '../components/ThemeProvider'
import Icon from '../components/Icon'
import ScreenHeader from '../components/ScreenHeader'

const LANG_OPTIONS: { key: Locale; label: string; native: string }[] = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'ne', label: 'Nepali', native: 'नेपाली' },
]

export default function LanguageScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useAppTheme()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)
  const s = useMemo(() => makeStyles(colors), [colors])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/phone-entry')
  }, [isLoggedIn, router])

  const handleSelect = useCallback((lang: Locale) => {
    setLocale(lang)
    i18n.changeLanguage(lang)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [setLocale])

  if (!isLoggedIn) return null

  return (
    <View style={s.screen}>
      <ScreenHeader title={t('settings.language')} />

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionHeader}>{t('settings.languageDescLong')}</Text>

        <View style={s.card}>
          {LANG_OPTIONS.map((opt, i) => {
            const active = locale === opt.key
            return (
              <React.Fragment key={opt.key}>
                {i > 0 && <View style={s.divider} />}
                <TouchableOpacity
                  onPress={() => handleSelect(opt.key)}
                  style={s.row}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={opt.native}
                >
                  <View style={s.flagWrap}>
                    <Text style={s.flag}>{opt.key.toUpperCase()}</Text>
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={s.rowLabel}>{opt.native}</Text>
                    <Text style={s.rowDesc}>{opt.label}</Text>
                  </View>
                  <View style={[s.radio, active && s.radioActive]}>
                    {active && <Icon name="checkmark" size={14} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing[4], gap: spacing[4] },
    sectionHeader: { fontSize: fontSz('sm')[0], fontWeight: '600', color: c.textMuted, paddingHorizontal: spacing[1] },
    card: {
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
    flagWrap: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
    flag: { fontSize: fontSz('base')[0], fontWeight: '700', color: c.primary },
    rowInfo: { flex: 1, gap: 2 },
    rowLabel: { fontSize: fontSz('md')[0], fontWeight: '600', color: c.text },
    rowDesc: { fontSize: fontSz('sm')[0], color: c.textMuted },
    radio: {
      width: 24,
      height: 24,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: c.primary, backgroundColor: c.primary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: spacing[4] + 38 + spacing[3] },
  })
