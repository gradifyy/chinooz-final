import React, { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { duration, easing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'

interface FadeInViewProps {
  children: React.ReactNode
  delay?: number
  style?: any
}

export function FadeIn({ children, delay = 0, style }: FadeInViewProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    opacity.value = withDelay(
      reduced ? 0 : delay,
      withTiming(1, {
        duration: reduced ? 0 : duration.normal,
        reduceMotion: ReduceMotion.Never,
      }),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>
}

interface SlideUpViewProps {
  children: React.ReactNode
  delay?: number
  distance?: number
  style?: any
}

export function SlideUp({ children, delay = 0, distance = 20, style }: SlideUpViewProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : distance)

  useEffect(() => {
    const d = reduced ? 0 : delay
    const dur = reduced ? 0 : duration.slow
    opacity.value = withDelay(d, withTiming(1, { duration: dur }))
    translateY.value = withDelay(
      d,
      withTiming(0, { duration: dur, easing: Easing.bezier(...easing.easeOut) }),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>
}

interface ScaleInViewProps {
  children: React.ReactNode
  delay?: number
  style?: any
}

export function ScaleIn({ children, delay = 0, style }: ScaleInViewProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0)
  const scale = useSharedValue(reduced ? 1 : 0.92)

  useEffect(() => {
    const d = reduced ? 0 : delay
    opacity.value = withDelay(d, withTiming(1, { duration: reduced ? 0 : duration.normal }))
    scale.value = withDelay(
      d,
      withSpring(1, { damping: 20, stiffness: 300, mass: 0.8 }),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>
}

interface SpringUpViewProps {
  children: React.ReactNode
  delay?: number
  style?: any
}

export function SpringUp({ children, delay = 0, style }: SpringUpViewProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : 40)

  useEffect(() => {
    const d = reduced ? 0 : delay
    opacity.value = withDelay(d, withTiming(1, { duration: reduced ? 0 : duration.normal }))
    translateY.value = withDelay(
      d,
      withSpring(0, {
        damping: reduced ? 100 : 20,
        stiffness: reduced ? 1000 : 300,
        mass: 0.8,
      }),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>
}
