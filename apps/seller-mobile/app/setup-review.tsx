import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import WizardStepper from '../components/WizardStepper'
import LanguageToggle from '../components/LanguageToggle'

export default function SetupBusinessScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const steps = [
    { key: 'store', labelKey: 'seller.setup.stepStore', label: t('seller.setup.stepStore') },
    { key: 'business', labelKey: 'seller.setup.stepReview', label: t('seller.setup.stepBusiness') },
    { key: 'bank', labelKey: 'seller.setup.stepBank', label: t('seller.setup.stepBank') },
    { key: 'review', labelKey: 'seller.setup.stepReview', label: t('seller.setup.stepReview') },
  ]

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>
      <View style={styles.stepperWrap}>
        <WizardStepper steps={steps} current={3} />
      </View>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('seller.setup.stepReview')}
        </Text>
        <Text style={styles.subtitle}>{t('seller.setup.comingSoon')}</Text>
      </View>
      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          style={styles.primaryCta}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryCtaText}>{t('seller.setup.continue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>{t('seller.setup.back')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  stepperWrap: { paddingBottom: spacing[2] },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[2] },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  subtitle: { fontSize: 15, color: colors.textMuted },
  ctaDock: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2],
  },
  primaryCta: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: { fontSize: 16, fontWeight: '600', color: colors.white, fontFamily: fontFamily.sansSemiBold[0] },
  secondaryCta: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryCtaText: { fontSize: 15, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
})
