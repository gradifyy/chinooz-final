import React, { useEffect } from 'react'
import { View, type ViewProps } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { duration, easing } from '@chinooz/theme'

interface SectionRevealProps extends ViewProps {
  children: React.ReactNode
  delay?: number
  onVisible?: () => void
}

export default function SectionReveal({
  children,
  delay = 0,
  onVisible,
  style,
  ...rest
}: SectionRevealProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : 8)
  const hasAnimated = useSharedValue(0)

  useEffect(() => {
    if (reduced) {
      onVisible?.()
      return
    }
    const d = delay
    opacity.value = withDelay(
      d,
      withTiming(1, {
        duration: duration.normal,
        easing: Easing.bezier(...easing.easeOut),
      }),
    )
    translateY.value = withDelay(
      d,
      withTiming(0, {
        duration: duration.normal,
        easing: Easing.bezier(...easing.easeOut),
      }, () => {
        if (onVisible) {
          runOnJS(onVisible)()
        }
      }),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[animStyle, style]} {...rest}>
      {children}
    </Animated.View>
  )
}
