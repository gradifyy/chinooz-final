import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { MapPin, LayoutGrid, Wallet, BarChart3 } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, easing } from '@chinooz/theme'
import { useSellerSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui'
import SellerIllustration from '../components/SellerIllustration'
import LanguageToggle from '../components/LanguageToggle'

const { width } = Dimensions.get('window')
const ENTER_DURATION = 400
const ENTER_OFFSET = 8

interface Benefit {
  icon: React.ComponentType<any>
  labelKey: string
  subKey: string
  ariaKey: string
}

const BENEFITS: Benefit[] = [
  { icon: MapPin, labelKey: 'seller.welcome.benefitReachLabel', subKey: 'seller.welcome.benefitReachSub', ariaKey: 'seller.welcome.benefitReachLabel' },
  { icon: LayoutGrid, labelKey: 'seller.welcome.benefitListingsLabel', subKey: 'seller.welcome.benefitListingsSub', ariaKey: 'seller.welcome.benefitListingsLabel' },
  { icon: Wallet, labelKey: 'seller.welcome.benefitPayoutsLabel', subKey: 'seller.welcome.benefitPayoutsSub', ariaKey: 'seller.welcome.benefitPayoutsLabel' },
  { icon: BarChart3, labelKey: 'seller.welcome.benefitInsightsLabel', subKey: 'seller.welcome.benefitInsightsSub', ariaKey: 'seller.welcome.benefitInsightsLabel' },
]

const STATS = [
  { valueKey: 'seller.welcome.statSellers', value: '12,000+' },
  { valueKey: 'seller.welcome.statCities', value: '38' },
  { valueKey: 'seller.welcome.statOrders', value: '1.2M' },
]

export default function WelcomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useSellerSessionStore(s => s.markOnboardingSeen)

  const handleStartSelling = useCallback(() => {
    markOnboardingSeen()
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push('/signup')
  }, [markOnboardingSeen, router])

  const handleLogin = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push('/login')
  }, [router])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 220 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Enter delay={0} reduced={reduced}>
          <SellerIllustration alt={t('seller.welcome.illustrationAlt')} />
        </Enter>

        <Enter delay={80} reduced={reduced}>
          <Text
            accessibilityRole="header"
            style={styles.headline}
            maxFontSizeMultiplier={1.2}
          >
            {t('seller.welcome.headline')}
          </Text>
        </Enter>

        <Enter delay={140} reduced={reduced}>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            {t('seller.welcome.subtitle')}
          </Text>
        </Enter>

        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <Enter key={b.labelKey} delay={200 + i * 50} reduced={reduced}>
              <BenefitRow benefit={b} />
            </Enter>
          ))}
        </View>

        <Enter delay={420} reduced={reduced}>
          <TrustStrip />
        </Enter>
      </ScrollView>

      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          onPress={handleStartSelling}
          style={styles.primaryCta}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('seller.welcome.startSellingAria')}
        >
          <Text style={styles.primaryCtaText}>{t('seller.welcome.startSelling')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          style={styles.secondaryCta}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('seller.welcome.haveStoreAria')}
        >
          <Text style={styles.secondaryCtaText}>{t('seller.welcome.haveStore')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function Enter({
  children,
  delay,
  reduced,
}: {
  children: React.ReactNode
  delay: number
  reduced: boolean
}) {
  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : ENTER_OFFSET)

  React.useEffect(() => {
    const d = reduced ? 0 : delay
    opacity.value = withDelay(
      d,
      withTiming(1, { duration: reduced ? 0 : ENTER_DURATION, reduceMotion: ReduceMotion.Never }),
    )
    translateY.value = withDelay(
      d,
      withTiming(0, {
        duration: reduced ? 0 : ENTER_DURATION,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.Never,
      }),
    )
  }, [delay, reduced])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={style}>{children}</Animated.View>
}

function BenefitRow({ benefit }: { benefit: Benefit }) {
  const { t } = useTranslation()
  const Icon = benefit.icon
  return (
    <View
      style={styles.benefitRow}
      accessibilityRole="summary"
      accessibilityLabel={t(benefit.ariaKey)}
    >
      <View style={styles.benefitIconWrap}>
        <Icon size={24} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitLabel} maxFontSizeMultiplier={1.2}>
          {t(benefit.labelKey)}
        </Text>
        <Text style={styles.benefitSub} maxFontSizeMultiplier={1.2}>
          {t(benefit.subKey)}
        </Text>
      </View>
    </View>
  )
}

function TrustStrip() {
  const { t } = useTranslation()
  return (
    <View
      style={styles.trustStrip}
      accessibilityRole="header"
      accessibilityLabel={t('seller.welcome.statSellers')}
    >
      {STATS.map((s, i) => (
        <View key={s.valueKey} style={styles.statItem}>
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statLabel}>{t(s.valueKey)}</Text>
          {i < STATS.length - 1 && <View style={styles.statDivider} />}
        </View>
      ))}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    alignItems: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: spacing[6],
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[2],
    lineHeight: 22,
    maxWidth: width * 0.84,
  },
  benefits: {
    width: '100%',
    marginTop: spacing[7],
    gap: spacing[4],
    alignItems: 'stretch',
    maxWidth: 460,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  benefitSub: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 20,
  },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[7],
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  ctaDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2.5],
  },
  primaryCta: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  secondaryCta: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
