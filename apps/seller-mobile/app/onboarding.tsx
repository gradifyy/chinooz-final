import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { useA11y } from '../components/A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'

export default function OnboardingScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { reducedMotion, minTouchTarget } = useA11y()
  const markOnboardingSeen = useSellerSessionStore(s => s.markOnboardingSeen)
  const toggleLogin = useSellerSessionStore(s => s.toggleLogin)
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  useEffect(() => {
    analytics.screen({ name: 'seller-onboarding' })
  }, [])

  const handleContinue = () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    markOnboardingSeen()
    if (!isLoggedIn) toggleLogin()
    router.replace('/home')
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <View style={styles.logoMark}>
            <View style={styles.logoDot} />
          </View>
        </View>
        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          {t('seller.title')}
        </Text>
        <Text style={styles.tagline}>{t('seller.tagline')}</Text>
        <Text style={styles.placeholder}>{t('seller.placeholder')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.goLive')}
          onPress={handleContinue}
          style={[
            styles.button,
            { minHeight: minTouchTarget, minWidth: minTouchTarget },
          ]}
        >
          <Text style={styles.buttonText}>{t('seller.goLive')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii['2xl'],
    padding: spacing[6],
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logo: { marginBottom: spacing[4] },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  placeholder: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
