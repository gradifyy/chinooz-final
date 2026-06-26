import React, { useEffect } from 'react'
import { View, StyleSheet, Image, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { colors } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

const { width } = Dimensions.get('window')
const LOGO_SIZE = width * 0.36

interface SplashLogoProps {
  onAnimationDone?: () => void
}

export default function SplashLogo({ onAnimationDone }: SplashLogoProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0)
  const scale = useSharedValue(reduced ? 1 : 0.85)
  const shimmer = useSharedValue(0)

  useEffect(() => {
    if (reduced) {
      onAnimationDone?.()
      return
    }

    opacity.value = withDelay(
      100,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    )

    scale.value = withDelay(
      100,
      withSpring(1, { damping: 18, stiffness: 120, mass: 1 }),
    )

    shimmer.value = withDelay(
      300,
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
    )

    const timer = setTimeout(() => onAnimationDone?.(), 1200)
    return () => clearTimeout(timer)
  }, [])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.12,
  }))

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
        <Image
          source={require('../assets/images/chinooz-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Chinooz logo"
        />
      </Animated.View>
      <Animated.Text style={[styles.brandText, textStyle]}>
        Chinooz
      </Animated.Text>
      <Animated.Text style={[styles.tagline, textStyle]}>
        Nepal's Marketplace
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: LOGO_SIZE / 2,
  },
  logo: {
    width: LOGO_SIZE * 0.7,
    height: LOGO_SIZE * 0.7,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
