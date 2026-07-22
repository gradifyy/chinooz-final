import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontFamily, easing } from '../lib/theme'
import { useReducedMotion } from '@chinooz/ui'

interface Props {
  /** Called once the splash has finished showing. */
  onDone?: () => void
  /** How long the splash stays up before calling onDone (ms). */
  durationMs?: number
}

/**
 * Branded launch splash for the Chinooz Seller app. Plum backdrop with the
 * logo mark popping in, then the wordmark. Honours reduced-motion (instant,
 * short hold). Designed to flow seamlessly out of the FontProvider's plum
 * holding screen so there is no flash on cold start.
 */
export default function AppSplash({ onDone, durationMs = 1600 }: Props) {
  const reduced = useReducedMotion()

  const markOpacity = useSharedValue(reduced ? 1 : 0)
  const markScale = useSharedValue(reduced ? 1 : 0.8)
  const dotScale = useSharedValue(reduced ? 1 : 0)
  const textOpacity = useSharedValue(reduced ? 1 : 0)
  const textTranslate = useSharedValue(reduced ? 0 : 10)

  useEffect(() => {
    if (!reduced) {
      markOpacity.value = withTiming(1, {
        duration: 420,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.Never,
      })
      markScale.value = withSequence(
        withTiming(1.06, {
          duration: 420,
          easing: Easing.bezier(...easing.easeOut),
          reduceMotion: ReduceMotion.Never,
        }),
        withTiming(1, { duration: 200, reduceMotion: ReduceMotion.Never }),
      )
      dotScale.value = withDelay(
        200,
        withTiming(1, {
          duration: 360,
          easing: Easing.bezier(...easing.easeOut),
          reduceMotion: ReduceMotion.Never,
        }),
      )
      textOpacity.value = withDelay(
        320,
        withTiming(1, { duration: 420, reduceMotion: ReduceMotion.Never }),
      )
      textTranslate.value = withDelay(
        320,
        withTiming(0, {
          duration: 420,
          easing: Easing.bezier(...easing.easeOut),
          reduceMotion: ReduceMotion.Never,
        }),
      )
    }

    const t = setTimeout(() => onDone?.(), reduced ? 450 : durationMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }))
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }))
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }))

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={[styles.logoMark, markStyle]}>
          <Animated.View style={[styles.logoDot, dotStyle]} />
        </Animated.View>
        <Animated.View style={[styles.textWrap, textStyle]}>
          <Text style={styles.brand} maxFontSizeMultiplier={1.2}>
            Chinooz
          </Text>
          <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
            SELLER
          </Text>
        </Animated.View>
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
  },
  center: {
    alignItems: 'center',
    gap: spacing[5],
  },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoDot: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  textWrap: {
    alignItems: 'center',
    gap: 4,
  },
  brand: {
    fontSize: 30,
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.82,
    letterSpacing: 4,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
