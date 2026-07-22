import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useBanners } from '@chinooz/hooks'
import { colors as lightColors, radii, spacing, fontSz, duration } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import ShimmerBar from './ShimmerBar'
import Icon from './Icon'
import { useAppTheme } from './ThemeProvider'
import type { SharedValue } from 'react-native-reanimated'
import type { Banner } from '@chinooz/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HERO_HEIGHT = 178
const AUTO_PLAY_MS = 4500
const EDGE_PADDING = 16
const CARD_W = SCREEN_WIDTH - EDGE_PADDING * 2
const SEG_W = 22
const SURFACE_RADIUS = 20
const HERO_GRADIENT = [lightColors.primaryDark, lightColors.primary, lightColors.primaryLight] as const

interface HeroCarouselProps {
  scrollY: SharedValue<number>
}

export default function HeroCarousel({ scrollY }: HeroCarouselProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { data: banners, isLoading } = useBanners()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progress = useSharedValue(0)

  const activeBanners = (banners ?? []).filter((b: Banner) => b.active)

  // Drive the active progress segment fill over the dwell time.
  useEffect(() => {
    progress.value = 0
    if (reduced) { progress.value = 1; return }
    progress.value = withTiming(1, { duration: AUTO_PLAY_MS, easing: Easing.linear })
  }, [activeIndex, reduced, progress])

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
    }
  }, [])

  const startAutoPlay = useCallback(() => {
    if (reduced || activeBanners.length <= 1) return
    stopAutoPlay()
    autoPlayRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % activeBanners.length
        scrollRef.current?.scrollTo({ x: next * CARD_W, animated: !reduced })
        return next
      })
    }, AUTO_PLAY_MS)
  }, [reduced, activeBanners.length, stopAutoPlay])

  useEffect(() => {
    startAutoPlay()
    return stopAutoPlay
  }, [startAutoPlay, stopAutoPlay])

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const idx = Math.round(x / CARD_W)
    if (idx !== activeIndex) {
      setActiveIndex(idx)
      stopAutoPlay()
    }
  }, [activeIndex, stopAutoPlay])

  const handleScrollEnd = useCallback(() => {
    startAutoPlay()
  }, [startAutoPlay])

  const handleBannerPress = useCallback((banner: Banner) => {
    if (banner.link && banner.link.startsWith('/')) {
      router.push(banner.link)
    }
  }, [router])

  const parallaxStyle = useAnimatedStyle(() => {
    if (reduced) return {}
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 2],
      [0, -HERO_HEIGHT * 0.25],
      Extrapolation.CLAMP,
    )
    return { transform: [{ translateY }] }
  })

  if (isLoading) {
    return (
      <View style={{ gap: spacing[2] }}>
        <ShimmerBar width="100%" height={HERO_HEIGHT} borderRadius={SURFACE_RADIUS} />
        <View style={styles.dotsSkeleton}>
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerBar key={i} width={SEG_W} height={5} borderRadius={3} delay={i * 100} />
          ))}
        </View>
      </View>
    )
  }

  if (!activeBanners.length) {
    return (
      <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.9 }} style={styles.emptyHero}>
        <View style={styles.glow} />
        <Text style={styles.tag}>{t('home.welcomeTitle')}</Text>
        <Text style={styles.title}>{t('home.welcomeSubtitle')}</Text>
      </LinearGradient>
    )
  }

  return (
    <View>
      <Animated.View style={parallaxStyle}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {activeBanners.map((banner: Banner, i: number) => (
            <HeroSlide
              key={banner.id}
              banner={banner}
              index={i}
              activeIndex={activeIndex}
              onPress={() => handleBannerPress(banner)}
              reduced={reduced}
              t={t}
            />
          ))}
        </Animated.ScrollView>
      </Animated.View>

      {activeBanners.length > 1 && (
        <View style={styles.pgRow}>
          {activeBanners.map((_: Banner, i: number) => (
            <ProgressSegment key={i} active={i === activeIndex} progress={progress} />
          ))}
        </View>
      )}
    </View>
  )
}

function ProgressSegment({ active, progress }: { active: boolean; progress: SharedValue<number> }) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const fillStyle = useAnimatedStyle(() => ({ width: active ? progress.value * SEG_W : 0 }))
  return (
    <View style={styles.seg}>
      <Animated.View style={[styles.segFill, fillStyle]} />
    </View>
  )
}

function HeroSlide({
  banner,
  index,
  activeIndex,
  onPress,
  reduced,
  t,
}: {
  banner: Banner
  index: number
  activeIndex: number
  onPress: () => void
  reduced: boolean
  t: (key: string) => string
}) {
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const isActive = index === activeIndex
  const glow = useSharedValue(1)
  const sheen = useSharedValue(0)
  const blip = useSharedValue(0)
  const arrow = useSharedValue(0)
  // Shared values for content visibility — driven by effect, read by style.
  // Avoids calling withTiming inside useAnimatedStyle (which spawns new
  // animation configs on every re-render).
  const contentOpacity = useSharedValue(reduced ? 1 : isActive ? 1 : 0.55)
  const contentY = useSharedValue(reduced ? 0 : isActive ? 0 : 8)

  useEffect(() => {
    if (reduced || !isActive) {
      // Only the active slide runs perpetual animations — inactive slides
      // reset to static values, freeing the UI thread from N×4 worklets.
      glow.value = 1
      sheen.value = 0
      blip.value = 0
      arrow.value = 0
      return
    }
    glow.value = withRepeat(withTiming(1.18, { duration: 2600, easing: Easing.inOut(Easing.ease) }), -1, true)
    sheen.value = withRepeat(
      withSequence(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 3600 })),
      -1,
      false,
    )
    blip.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false)
    arrow.value = withRepeat(
      withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 700 })),
      -1,
      true,
    )
  }, [reduced, isActive, glow, sheen, blip, arrow])

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: interpolate(glow.value, [1, 1.18], [0.8, 1], Extrapolation.CLAMP),
  }))
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-CARD_W * 0.6, CARD_W * 1.2], Extrapolation.CLAMP) }, { rotate: '18deg' }],
    opacity: interpolate(sheen.value, [0, 0.5, 1], [0, 0.5, 0], Extrapolation.CLAMP),
  }))
  const blipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(blip.value, [0, 1], [1, 2.6], Extrapolation.CLAMP) }],
    opacity: interpolate(blip.value, [0, 1], [0.7, 0], Extrapolation.CLAMP),
  }))
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: arrow.value * 4 }] }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  useEffect(() => {
    if (reduced) {
      contentOpacity.value = 1
      contentY.value = 0
      return
    }
    contentOpacity.value = withDelay(isActive ? 60 : 0, withTiming(isActive ? 1 : 0.55, { duration: duration.normal, easing: Easing.out(Easing.cubic) }))
    contentY.value = withTiming(isActive ? 0 : 8, { duration: duration.slow, easing: Easing.out(Easing.cubic) })
  }, [reduced, isActive, contentOpacity, contentY])

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.slide}>
      <LinearGradient colors={HERO_GRADIENT} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.9 }} style={styles.heroCard}>
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
        <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none" />
        <Animated.View style={contentStyle}>
          {banner.subtitle ? (
            <View style={styles.tagRow}>
              <View style={styles.blipWrap}>
                <Animated.View style={[styles.blipPulse, blipStyle]} />
                <View style={styles.blipDot} />
              </View>
              <Text style={styles.tag}>{banner.subtitle.toUpperCase()}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>{t('home.shopNow')}</Text>
            <Animated.View style={arrowStyle}>
              <Icon name="arrow-forward" size={14} color={colors.primary} />
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

const makeStyles = (c: typeof lightColors) => StyleSheet.create({
  slide: {
    width: CARD_W,
    height: HERO_HEIGHT,
  },
  heroCard: {
    flex: 1,
    borderRadius: SURFACE_RADIUS,
    padding: spacing[5],
    overflow: 'hidden',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    right: -34,
    top: -34,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(224,169,59,0.25)',
  },
  sheen: {
    position: 'absolute',
    top: -HERO_HEIGHT * 0.4,
    left: 0,
    width: 60,
    height: HERO_HEIGHT * 1.8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  blipWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blipPulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.success,
  },
  blipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.success,
  },
  tag: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('xs')[0],
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'Fraunces',
    fontSize: fontSz('2xl')[0],
    lineHeight: fontSz('2xl')[1],
    fontWeight: '700',
    color: c.white,
    marginTop: spacing[1.5],
    letterSpacing: -0.3,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
  },
  ctaText: {
    fontFamily: 'Inter-Bold',
    fontSize: fontSz('sm')[0],
    fontWeight: '700',
    color: c.primary,
  },
  pgRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing[3],
  },
  seg: {
    width: SEG_W,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(138,27,87,0.22)',
    overflow: 'hidden',
  },
  segFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: c.gold,
  },
  emptyHero: {
    height: HERO_HEIGHT,
    borderRadius: SURFACE_RADIUS,
    padding: spacing[5],
    overflow: 'hidden',
    justifyContent: 'center',
  },
  dotsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing[2.5],
  },
})
