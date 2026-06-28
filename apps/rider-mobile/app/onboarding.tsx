import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { CheckCircle2, ClipboardList, BadgeCheck, Bike } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import { analytics } from '@chinooz/analytics'
import LanguageToggle from '../components/LanguageToggle'

/**
 * RO3 — rider onboarding stepper entry.
 * The full stepper (personal info, documents, vehicle, approval) lives behind
 * this surface; for now it renders the step overview and a continue CTA that
 * hands off to the jobs board via the mock login path.
 */
export default function OnboardingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  useEffect(() => {
    analytics.screen({ name: 'rider-onboarding' })
  }, [])

  const steps = [
    { icon: ClipboardList, label: t('rider.onboarding.title') },
    { icon: BadgeCheck, label: t('rider.pending.title') },
    { icon: Bike, label: t('rider.tab.home') },
  ]

  const handleContinue = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_onboarding_continue' })
    // Mock: skip to jobs board. Real stepper would collect docs/vehicle next.
    router.replace('/jobs')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.content}>
        <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 20}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('rider.onboarding.title')}
          </Text>
          <Text style={styles.subtitle}>{t('rider.onboarding.subtitle')}</Text>
        </SlideUp>

        <View style={styles.steps}>
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <SlideUp key={i} delay={reduced ? 0 : 160 + i * 60} distance={reduced ? 0 : 12}>
                <View style={styles.stepRow} accessibilityRole="summary">
                  <View style={styles.stepIconWrap}>
                    <Icon size={22} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={styles.stepLabel} maxFontSizeMultiplier={1.2}>
                    {s.label}
                  </Text>
                  {i < steps.length - 1 ? (
                    <View style={styles.stepConnector} />
                  ) : (
                    <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
                  )}
                </View>
              </SlideUp>
            )
          })}
        </View>

        <SlideUp delay={reduced ? 0 : 360} distance={reduced ? 0 : 10}>
          <Text style={styles.comingSoon}>{t('rider.onboarding.comingSoon')}</Text>
        </SlideUp>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={handleContinue}
          style={styles.button}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('rider.auth.continue')}
        >
          <Text style={styles.buttonText}>{t('rider.auth.continue')}</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    gap: spacing[6],
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    lineHeight: 22,
  },
  steps: {
    gap: spacing[3],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    flex: 1,
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  stepConnector: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
  },
  comingSoon: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  footer: {
    paddingHorizontal: spacing[6],
  },
  button: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
