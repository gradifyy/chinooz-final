import React, { useEffect } from 'react'
import { TextInput, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { duration, easing } from '@chinooz/theme'

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

interface CountUpProps {
  /** Target numeric value to count up to. */
  value: number
  /** Format function: raw number → display string. */
  format: (v: number) => string
  /** Text style (applied to the underlying TextInput). */
  style?: any
  /** Reduced-motion flag — jumps to the final value instantly. */
  reduced?: boolean
  /** Delay before the count-up starts (ms). */
  delay?: number
  /** Animation duration (ms). Defaults to duration.slow (400). */
  dur?: number
}

/**
 * Animated count-up text. Renders as a non-interactive TextInput (the
 * standard Reanimated pattern for animating text on the UI thread at 60fps).
 * Respects reduced-motion: shows the final value with no animation.
 */
export function CountUp({
  value,
  format,
  style,
  reduced = false,
  delay = 0,
  dur = duration.slow,
}: CountUpProps) {
  const animatedValue = useSharedValue(reduced ? value : 0)

  const animatedProps = useAnimatedProps(() => ({
    text: format(animatedValue.value),
  })) as any

  useEffect(() => {
    if (reduced) {
      animatedValue.value = value
      return
    }
    animatedValue.value = withDelay(
      delay,
      withTiming(value, {
        duration: dur,
        easing: Easing.bezier(...easing.easeOut),
        reduceMotion: ReduceMotion.Never,
      }),
    )
  }, [value, reduced, delay, dur])

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      animatedProps={animatedProps}
      value={format(reduced ? value : 0)}
      style={[style, styles.reset]}
    />
  )
}

const styles = StyleSheet.create({
  reset: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },
})
