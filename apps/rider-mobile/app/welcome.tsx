import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  AccessibilityInfo,
} from 'react-native'
import PagerView from 'react-native-pager-view'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import type { Href } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, easing } from '@chinooz/theme'
import { useRiderSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { analytics } from '@chinooz/analytics'
import RiderIllustration from '../components/RiderIllustration'
import LanguageToggle from '../components/LanguageToggle'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type SlideVariant = 'hours' | 'payouts' | 'nearby'

interface Slide {
  key: string
  variant: SlideVariant
  titleKey: string
  subtitleKey: string
  ariaKey: string
  altKey: string
}

const SLIDES: Slide[] = [
  {
    key: 'slide1',
    variant: 'hours',
    titleKey: 'rider.welcome.slide1Title',
    subtitleKey: 'rider.welcome.slide1Subtitle',
    ariaKey: 'rider.welcome.slide1Aria',
    altKey: 'rider.welcome.illustrationAlt1',
  },
  {
    key: 'slide2',
    variant: 'payouts',
    titleKey: 'rider.welcome.slide2Title',
    subtitleKey: 'rider.welcome.slide2Subtitle',
    ariaKey: 'rider.welcome.slide2Aria',
    altKey: 'rider.welcome.illustrationAlt2',
  },
  {
    key: 'slide3',
    variant: 'nearby',
    titleKey: 'rider.welcome.slide3Title',
    subtitleKey: 'rider.welcome.slide3Subtitle',
    ariaKey: 'rider.welcome.slide3Aria',
    altKey: 'rider.welcome.illustrationAlt3',
  },
]

const ENTER_DURATION = 420
const ENTER_OFFSET = 10
const PADDLE_TARGET = 48

export default function WelcomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useRiderSessionStore(s => s.markOnboardingSeen)
  const pagerRef = useRef<PagerView>(null)
  const [current, setCurrent] = useState(0)
  const slideCount = SLIDES.length

  useEffect(() => {
    analytics.screen({ name: 'rider-welcome' })
  }, [])

  const announcePosition = useCallback(
    (page: number) => {
      if (Platform.OS === 'web') return
      try {
        AccessibilityInfo.announceForAccessibility(
          t('rider.welcome.carouselPositionAria', { current: page + 1, total: slideCount }),
        )
      } catch {}
    },
    [t, slideCount],
  )

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      const page = e.nativeEvent.position
      setCurrent(page)
      announcePosition(page)
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
    },
    [announcePosition],
  )

  const goToPage = useCallback(
    (page: number) => {
      if (page < 0 || page >= slideCount) return
      pagerRef.current?.setPage(page)
    },
    [slideCount],
  )

  const handlePrev = useCallback(() => {
    if (reduced) {
      const next = Math.max(0, current - 1)
      setCurrent(next)
      announcePosition(next)
      return
    }
    goToPage(current - 1)
  }, [current, reduced, goToPage, announcePosition])

  const handleNext = useCallback(() => {
    if (reduced) {
      const next = Math.min(slideCount - 1, current + 1)
      setCurrent(next)
      announcePosition(next)
      return
    }
    goToPage(current + 1)
  }, [current, reduced, goToPage, slideCount, announcePosition])

  const handleGetStarted = useCallback(() => {
    markOnboardingSeen()
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_welcome_get_started' })
    router.push('/signup')
  }, [markOnboardingSeen, router])

  const handleLogin = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_welcome_login' })
    router.push('/login')
  }, [router])

  const legalLinks = useMemo(
    () => [
      { label: t('rider.welcome.termsLink'), aria: t('rider.welcome.termsAria'), href: '/terms' },
      { label: t('rider.welcome.privacyLink'), aria: t('rider.welcome.privacyAria'), href: '/privacy' },
      { label: t('rider.welcome.riderAgreementLink'), aria: t('rider.welcome.riderAgreementAria'), href: '/rider-agreement' },
    ],
    [t],
  )

  const onLegalPress = useCallback((href: string) => {
    try {
      Haptics.selectionAsync()
    } catch {}
    analytics.track({ name: 'rider_welcome_legal_tap', properties: { href } })
    router.push(href as Href)
  }, [router])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View
        style={styles.carouselRegion}
        accessibilityRole="list"
        accessibilityLabel={t('rider.welcome.carouselAria')}
      >
        {reduced ? (
          <ReducedCarousel current={current} onPick={goToPage} />
        ) : (
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={handlePageSelected}
            overdrag={true}
            overScrollMode="never"
          >
            {SLIDES.map(slide => (
              <View key={slide.key} style={styles.slide} accessible>
                <RiderIllustration variant={slide.variant} alt={t(slide.altKey)} />
                <View style={styles.textArea}>
                  <Text
                    accessibilityRole="header"
                    style={styles.slideTitle}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t(slide.titleKey)}
                  </Text>
                  <Text style={styles.slideSubtitle} maxFontSizeMultiplier={1.2}>
                    {t(slide.subtitleKey)}
                  </Text>
                </View>
              </View>
            ))}
          </PagerView>
        )}

        <View style={styles.paddles}>
          <Paddle
            direction="prev"
            disabled={current === 0}
            onPress={handlePrev}
            ariaLabel={t('rider.welcome.paddlePrevAria')}
            reduced={reduced}
          />
          <Paddle
            direction="next"
            disabled={current === slideCount - 1}
            onPress={handleNext}
            ariaLabel={t('rider.welcome.paddleNextAria')}
            reduced={reduced}
          />
        </View>
      </View>

      <View style={styles.dotsRow} accessibilityRole="tablist">
        {SLIDES.map((slide, i) => (
          <Dot
            key={slide.key}
            active={i === current}
            reduced={reduced}
            onPress={() => goToPage(i)}
            ariaLabel={t('rider.welcome.dotAria', { index: i + 1 })}
          />
        ))}
      </View>

      <Enter delay={120} reduced={reduced}>
        <Text
          accessibilityRole="header"
          style={styles.headline}
          maxFontSizeMultiplier={1.2}
        >
          {t('rider.welcome.headline')}
        </Text>
      </Enter>

      <View style={[styles.ctaDock, { paddingBottom: insets.bottom + spacing[3] }]}>
        <TouchableOpacity
          onPress={handleGetStarted}
          style={styles.primaryCta}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('rider.welcome.getStartedAria')}
        >
          <Text style={styles.primaryCtaText}>{t('rider.welcome.getStarted')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          style={styles.secondaryCta}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('rider.welcome.haveAccountAria')}
        >
          <Text style={styles.secondaryCtaText}>{t('rider.welcome.haveAccount')}</Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <Text style={styles.legalPrefix} maxFontSizeMultiplier={1.2}>
            {t('rider.welcome.footerLegalPrefix')}
          </Text>
          <View style={styles.legalLinks}>
            {legalLinks.map((link, i) => (
              <View key={link.href} style={styles.legalLinkWrap}>
                {i > 0 && <Text style={styles.legalDot}>·</Text>}
                <TouchableOpacity
                  onPress={() => onLegalPress(link.href)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  accessibilityRole="link"
                  accessibilityLabel={link.aria}
                >
                  <Text style={styles.legalLink}>{link.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function ReducedCarousel({ current, onPick }: { current: number; onPick: (page: number) => void }) {
  const { t } = useTranslation()
  const slide = SLIDES[current]
  return (
    <View style={styles.reducedCarousel}>
      <RiderIllustration variant={slide.variant} alt={t(slide.altKey)} />
      <View style={styles.textArea}>
        <Text accessibilityRole="header" style={styles.slideTitle} maxFontSizeMultiplier={1.2}>
          {t(slide.titleKey)}
        </Text>
        <Text style={styles.slideSubtitle} maxFontSizeMultiplier={1.2}>
          {t(slide.subtitleKey)}
        </Text>
      </View>
      {/* Picker row replaces swipe for reduced motion */}
      <View style={styles.reducedPicker}>
        {SLIDES.map((s, i) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => onPick(i)}
            style={[styles.reducedPickerBtn, i === current && styles.reducedPickerBtnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === current }}
            accessibilityLabel={t('rider.welcome.dotAria', { index: i + 1 })}
          >
            <Text
              style={[styles.reducedPickerText, i === current && styles.reducedPickerTextActive]}
              numberOfLines={1}
            >
              {t(s.titleKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function Paddle({
  direction,
  disabled,
  onPress,
  ariaLabel,
  reduced,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onPress: () => void
  ariaLabel: string
  reduced: boolean
}) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(disabled ? 0.4 : 1)

  React.useEffect(() => {
    opacity.value = withTiming(disabled ? 0.4 : 1, {
      duration: reduced ? 0 : 180,
      reduceMotion: ReduceMotion.Never,
    })
  }, [disabled, reduced])

  const handlePressIn = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(0.92, { damping: 18, stiffness: 400 })
  }, [reduced])

  const handlePressOut = useCallback(() => {
    if (reduced) return
    scale.value = withSpring(1, { damping: 18, stiffness: 400 })
  }, [reduced])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  const align = direction === 'prev' ? styles.paddlePrev : styles.paddleNext

  return (
    <Animated.View style={[align, animStyle]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        accessibilityState={{ disabled }}
        style={styles.paddleBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon size={22} color={colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  )
}

function Dot({
  active,
  reduced,
  onPress,
  ariaLabel,
}: {
  active: boolean
  reduced: boolean
  onPress: () => void
  ariaLabel: string
}) {
  const width = useSharedValue(active ? 24 : 8)

  React.useEffect(() => {
    width.value = reduced ? active ? 24 : 8 : withSpring(active ? 24 : 8, {
      damping: 20,
      stiffness: 300,
      mass: 0.5,
    })
  }, [active, reduced])

  const style = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? colors.primary : colors.border,
  }))

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={ariaLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.dot, style]} />
    </TouchableOpacity>
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
  carouselRegion: {
    flex: 1,
    position: 'relative',
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[5],
  },
  reducedCarousel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[5],
  },
  textArea: {
    alignItems: 'center',
    gap: spacing[2.5],
    paddingHorizontal: spacing[4],
    maxWidth: SCREEN_WIDTH * 0.86,
  },
  slideTitle: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: fontFamily.sansBold[0],
  },
  slideSubtitle: {
    fontSize: fontSize.lg[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  paddles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    pointerEvents: 'box-none',
  },
  paddlePrev: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  paddleNext: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paddleBtn: {
    width: PADDLE_TARGET,
    height: PADDLE_TARGET,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: spacing[3],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  headline: {
    fontSize: fontSize['3xl'][0],
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.4,
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[6],
    fontFamily: fontFamily.sansBold[0],
  },
  ctaDock: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[2.5],
  },
  primaryCta: {
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  secondaryCta: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    paddingTop: spacing[1],
  },
  legalPrefix: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legalLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  legalDot: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
  },
  legalLink: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  reducedPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  reducedPickerBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reducedPickerBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reducedPickerText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  reducedPickerTextActive: {
    color: colors.white,
  },
})
