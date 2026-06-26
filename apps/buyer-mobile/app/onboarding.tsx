import React, { useState, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import PagerView from 'react-native-pager-view'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  interpolateColor,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radii } from '@chinooz/theme'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import OnboardingIllustration from '../components/OnboardingIllustration'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const ILLUSTRATION_HEIGHT = SCREEN_HEIGHT * 0.45
const SLIDE_COUNT = 3

const SLIDES = [
  { key: 'slide1', variant: 'shop' as const, titleKey: 'onboarding.slide1Title', subtitleKey: 'onboarding.slide1Subtitle' },
  { key: 'slide2', variant: 'delivery' as const, titleKey: 'onboarding.slide2Title', subtitleKey: 'onboarding.slide2Subtitle' },
  { key: 'slide3', variant: 'payment' as const, titleKey: 'onboarding.slide3Title', subtitleKey: 'onboarding.slide3Subtitle' },
]

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)
  const [currentPage, setCurrentPage] = useState(0)
  const pagerRef = useRef<PagerView>(null)

  const dotScale = useSharedValue(1)

  const handlePageSelected = useCallback((e: any) => {
    const page = e.nativeEvent.position
    setCurrentPage(page)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  }, [])

  const handleNext = useCallback(() => {
    if (currentPage < SLIDE_COUNT - 1) {
      pagerRef.current?.setPage(currentPage + 1)
    }
  }, [currentPage])

  const handleSkip = useCallback(() => {
    markOnboardingSeen()
    router.replace('/phone-entry')
  }, [markOnboardingSeen, router])

  const handleGetStarted = useCallback(() => {
    markOnboardingSeen()
    router.replace('/phone-entry')
  }, [markOnboardingSeen, router])

  const isLast = currentPage === SLIDE_COUNT - 1

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag={true}
        overScrollMode="never"
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={styles.slide}>
            <View style={styles.illustrationArea}>
              <OnboardingIllustration variant={slide.variant} />
            </View>
            <View style={styles.textArea}>
              <Text style={styles.title}>{t(slide.titleKey)}</Text>
              <Text style={styles.subtitle}>{t(slide.subtitleKey)}</Text>
            </View>
          </View>
        ))}
      </PagerView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === currentPage} reduced={reduced} />
          ))}
        </View>

        <View style={styles.actions}>
          {!isLast ? (
            <>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
                <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8}>
                <Text style={styles.nextText}>{t('onboarding.next')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={handleGetStarted} style={styles.getStartedButton} activeOpacity={0.85}>
              <Text style={styles.getStartedText}>{t('onboarding.getStarted')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

function Dot({ active, reduced }: { active: boolean; reduced: boolean }) {
  const width = useSharedValue(active ? 24 : 8)

  React.useEffect(() => {
    width.value = withSpring(active ? 24 : 8, {
      damping: 20,
      stiffness: 300,
      mass: 0.5,
    })
  }, [active])

  const style = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? colors.primary : colors.border,
  }))

  return <Animated.View style={[styles.dot, style]} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  illustrationArea: {
    height: ILLUSTRATION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  textArea: {
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  skipButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radii.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[8],
    borderRadius: radii.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
})
