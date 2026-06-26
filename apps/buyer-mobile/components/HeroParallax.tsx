import React from 'react'
import { View, Dimensions, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { colors, radii } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HERO_HEIGHT = 180
const PARALLAX_FACTOR = 0.3

interface HeroParallaxProps {
  scrollY: any
}

export default function HeroParallax({ scrollY }: HeroParallaxProps) {
  const reduced = useReducedMotion()

  const parallaxStyle = useAnimatedStyle(() => {
    if (reduced) return {}
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 2],
      [0, -HERO_HEIGHT * PARALLAX_FACTOR],
      Extrapolation.CLAMP,
    )
    const scale = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 2],
      [1, 1.05],
      Extrapolation.CLAMP,
    )
    return {
      transform: [{ translateY }, { scale }],
    }
  })

  const overlayStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.1 }
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT],
      [0, 0.15],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.image, parallaxStyle]}>
        <View style={styles.placeholder}>
          <View style={styles.placeholderInner}>
            <View style={styles.placeholderDot} />
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[styles.overlay, overlayStyle]} />
      <View style={styles.content}>
        <View style={styles.textPlaceholder}>
          <View style={styles.lineLg} />
          <View style={styles.lineSm} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH - 32,
    height: HERO_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.primary50,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
  },
  placeholderInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(138,27,87,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(138,27,87,0.15)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  textPlaceholder: {
    gap: 6,
  },
  lineLg: {
    width: '60%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  lineSm: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
})
