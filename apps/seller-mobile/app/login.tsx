import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, spacing, fontSize, fontFamily, radii } from '@chinooz/theme'
import LanguageToggle from '../components/LanguageToggle'

export default function LoginScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('seller.welcome.loginTitle')}
        </Text>
        <Text style={styles.sub}>{t('seller.welcome.comingSoon')}</Text>
      </View>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  sub: {
    fontSize: fontSize.md[0],
    color: colors.textMuted,
    textAlign: 'center',
  },
  back: {
    alignSelf: 'center',
    marginBottom: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radii.md,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
