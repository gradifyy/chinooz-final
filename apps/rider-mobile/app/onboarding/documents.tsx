import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, FileText } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useOnboardingStore, type OnboardingStep } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import ProgressStepper from '../../components/ProgressStepper'

const STEP_LABEL_KEYS: Record<OnboardingStep, string> = {
  personal: 'rider.onboarding.stepPersonal',
  vehicle: 'rider.onboarding.stepVehicle',
  documents: 'rider.onboarding.stepDocuments',
  review: 'rider.onboarding.stepReview',
}

/**
 * RO5 — Documents step (placeholder).
 * Shows the stepper at the current step and a "coming soon" body. The full
 * document-upload form lands here in a follow-up.
 */
export default function DocumentsStepScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const setCurrentStep = useOnboardingStore(s => s.setCurrentStep)

  useEffect(() => {
    setCurrentStep('documents')
    analytics.screen({ name: 'rider-onboarding-documents' })
  }, [setCurrentStep])

  const stepLabels = Object.fromEntries(
    (Object.keys(STEP_LABEL_KEYS) as OnboardingStep[]).map(k => [k, t(STEP_LABEL_KEYS[k])]),
  ) as Record<OnboardingStep, string>

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('rider.onboarding.vehicle.backAria')}
          >
            <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('rider.onboarding.stepDocuments')}
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <ProgressStepper currentStep="documents" labels={stepLabels} />
      </View>

      <View style={styles.body}>
        <View style={styles.comingIconWrap}>
          <FileText size={36} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.comingTitle}>{t('rider.onboarding.stepDocuments')}</Text>
        <Text style={styles.comingText}>Document upload coming soon.</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            } catch {}
            router.push('/onboarding/review')
          }}
          style={styles.nextBtn}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('rider.onboarding.personal.nextAria')}
        >
          <Text style={styles.nextBtnText}>{t('rider.onboarding.personal.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  backBtnPlaceholder: {
    width: 40,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  comingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  comingTitle: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  comingText: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
