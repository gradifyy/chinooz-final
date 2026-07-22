import React, { useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, Check } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { analytics } from '@chinooz/analytics'
import { useUIStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'

const LOCALES: { code: Locale; labelKey: string }[] = [
  { code: 'en', labelKey: 'rider.security.languageEnglish' },
  { code: 'ne', labelKey: 'rider.security.languageNepali' },
]

export default function LanguageScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  useFocusEffect(
    React.useCallback(() => {
      analytics.screen({ name: 'rider-language' })
    }, []),
  )

  const handleLocaleChange = useCallback(
    (next: Locale) => {
      if (next === locale) return
      setLocale(next)
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      try {
        ;(AccessibilityInfo as any).announceForScreenReader?.(
          `${t('rider.security.sectionLanguage')}: ${
            next === 'ne'
              ? t('rider.security.languageNepali')
              : t('rider.security.languageEnglish')
          }`,
        )
      } catch {}
    },
    [locale, setLocale, t],
  )

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('rider.profile.back')}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t('rider.profile.rowLanguage')}
        </Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[10] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('rider.security.languageDesc')}</Text>

        <View
          style={styles.card}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('rider.security.languageAria')}
        >
          {LOCALES.map(({ code, labelKey }, i) => {
            const selected = locale === code
            return (
              <Pressable
                key={code}
                onPress={() => handleLocaleChange(code)}
                style={({ pressed }) => [
                  styles.row,
                  i < LOCALES.length - 1 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(labelKey)}
              >
                <Text style={[styles.rowLabel, selected && styles.rowLabelActive]}>
                  {t(labelKey)}
                </Text>
                {selected && <Check size={20} color={colors.primary} />}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  backBtnPressed: {
    backgroundColor: colors.borderLight,
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    minHeight: 56,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.borderLight,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },
  rowLabelActive: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
