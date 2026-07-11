/**
 * Premium onboarding — Phase A storytelling carousel.
 * Brand-aligned plum/cream tokens, i18n, reduced motion, session persistence.
 */

import React, { useCallback, useState, useRef } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui'
import { OnboardingButton, OnboardingTextButton } from '../components/onboarding/OnboardingButton'
import { PaginationDots } from '../components/onboarding/PaginationDots'
import {
  onboardingColors,
  onboardingSpacing,
  onboardingTypography,
  onboardingGradients,
  onboardingAnimations,
  onboardingLayout,
  onboardingSlides,
} from '../lib/onboardingTheme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const SLIDE_COUNT = onboardingSlides.length

export default function OnboardingPhaseAScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)
  const scrollViewRef = useRef<ScrollView>(null)

  const [currentPage, setCurrentPage] = useState(0)
  const scrollX = useSharedValue(0)

  const finishOnboarding = useCallback(() => {
    markOnboardingSeen()
    router.replace('/phone-entry')
  }, [markOnboardingSeen, router])

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x
      scrollX.value = offsetX
      const page = Math.round(offsetX / SCREEN_WIDTH)
      if (page !== currentPage && page >= 0 && page < SLIDE_COUNT) {
        setCurrentPage(page)
        if (!reduced) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
        }
      }
    },
    [currentPage, scrollX, reduced],
  )

  const handleSkip = useCallback(() => {
    finishOnboarding()
  }, [finishOnboarding])

  const handleNext = useCallback(() => {
    if (currentPage < SLIDE_COUNT - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * SCREEN_WIDTH,
        animated: !reduced,
      })
    } else {
      finishOnboarding()
    }
  }, [currentPage, finishOnboarding, reduced])

  const isLastSlide = currentPage === SLIDE_COUNT - 1

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        accessibilityLabel={t('onboarding.carouselA11y')}
      >
        {onboardingSlides.map((slide, index) => (
          <HeroSlide
            key={slide.id}
            title={t(slide.titleKey)}
            subtext={t(slide.subtitleKey)}
            image={slide.image}
            index={index}
            scrollX={scrollX}
            reduced={reduced}
          />
        ))}
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + onboardingSpacing.lg }]}>
        <Text style={styles.wordmark} accessibilityRole="header">
          {t('common.appName')}
        </Text>
        {!isLastSlide ? (
          <OnboardingTextButton
            onPress={handleSkip}
            textStyle={styles.skipText}
            accessibilityLabel={t('onboarding.skip')}
          >
            {t('onboarding.skip')}
          </OnboardingTextButton>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + onboardingSpacing.xxxl }]}>
        <PaginationDots count={SLIDE_COUNT} activeIndex={currentPage} reducedMotion={reduced} />

        <OnboardingButton
          onPress={handleNext}
          accessibilityLabel={
            isLastSlide ? t('onboarding.createAccount') : t('onboarding.continue')
          }
        >
          {isLastSlide ? t('onboarding.createAccount') : t('onboarding.continue')}
        </OnboardingButton>
      </View>
    </View>
  )
}

interface HeroSlideProps {
  title: string
  subtext: string
  image: number
  index: number
  scrollX: SharedValue<number>
  reduced: boolean
}

function HeroSlide({ title, subtext, image, index, scrollX, reduced }: HeroSlideProps) {
  const insets = useSafeAreaInsets()

  const imageAnimatedStyle = useAnimatedStyle(() => {
    if (reduced) return {}
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ]
    return {
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            inputRange,
            [
              -SCREEN_WIDTH * onboardingAnimations.parallaxFactor,
              0,
              SCREEN_WIDTH * onboardingAnimations.parallaxFactor,
            ],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }
  })

  const textAnimatedStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 }
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ]
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP),
        },
      ],
    }
  })

  const heroHeight = SCREEN_HEIGHT * onboardingLayout.heroTopPercentage
  const contentHeight = SCREEN_HEIGHT * onboardingLayout.heroBottomPercentage
  const footerHeight = insets.bottom + 180

  return (
    <View style={styles.slide}>
      <View style={[styles.heroSection, { height: heroHeight }]}>
        <LinearGradient
          colors={[...onboardingGradients.hero.colors]}
          locations={[...onboardingGradients.hero.locations]}
          start={onboardingGradients.hero.start}
          end={onboardingGradients.hero.end}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
          <Image
            source={image}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel={title}
          />
        </Animated.View>

        <LinearGradient
          colors={[...onboardingGradients.heroOverlay.colors]}
          locations={[...onboardingGradients.heroOverlay.locations]}
          start={onboardingGradients.heroOverlay.start}
          end={onboardingGradients.heroOverlay.end}
          style={styles.overlay}
          pointerEvents="none"
        />
      </View>

      <Animated.View
        style={[
          styles.contentSection,
          { minHeight: contentHeight - footerHeight },
          textAnimatedStyle,
        ]}
      >
        <View style={styles.textContent}>
          <Text style={styles.headline}>{title}</Text>
          <Text style={styles.subtext}>{subtext}</Text>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: onboardingColors.creamLight,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  heroSection: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
  },
  imageContainer: {
    width: SCREEN_WIDTH * 1.15,
    height: '100%',
    marginLeft: -SCREEN_WIDTH * 0.075,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  contentSection: {
    paddingHorizontal: onboardingSpacing.screenPaddingH,
    paddingTop: onboardingSpacing.xxxl,
    backgroundColor: onboardingColors.creamLight,
  },
  textContent: {
    alignItems: 'center',
  },
  headline: {
    ...onboardingTypography.displayLarge,
    color: onboardingColors.textPrimary,
    textAlign: 'center',
    marginBottom: onboardingSpacing.md,
  },
  subtext: {
    ...onboardingTypography.bodyMedium,
    color: onboardingColors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: onboardingSpacing.screenPaddingH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  wordmark: {
    fontFamily: 'SpaceGrotesk',
    fontSize: 20,
    fontWeight: '700',
    color: onboardingColors.white,
    letterSpacing: -0.3,
  },
  skipText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  skipPlaceholder: {
    minWidth: 44,
    minHeight: 44,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: onboardingSpacing.screenPaddingH,
    gap: onboardingSpacing.xl,
    zIndex: 10,
  },
})
