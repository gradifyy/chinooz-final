import React, { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  ReduceMotion,
} from 'react-native-reanimated'
import { colors, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'

interface SuccessAnimationProps {
  visible: boolean
  message?: string
  icon?: string
  onDone?: () => void
  duration?: number
}

export default function SuccessAnimation({
  visible,
  message = 'Added to cart!',
  icon = '✓',
  onDone,
  duration = 2000,
}: SuccessAnimationProps) {
  const reduced = useReducedMotion()
  const [rendered, setRendered] = useState(false)
  const containerOpacity = useSharedValue(0)
  const containerScale = useSharedValue(reduced ? 1 : 0.5)
  const iconScale = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      containerOpacity.value = withTiming(1, {
        duration: reduced ? 0 : 200,
        reduceMotion: ReduceMotion.Never,
      })
      containerScale.value = reduced
        ? withTiming(1, { duration: 0 })
        : withSpring(1, { damping: 15, stiffness: 200 })
      iconScale.value = reduced
        ? withTiming(1, { duration: 0 })
        : withDelay(100, withSpring(1, { damping: 10, stiffness: 150 }))
    } else if (rendered) {
      containerOpacity.value = withTiming(0, {
        duration: reduced ? 0 : 150,
        reduceMotion: ReduceMotion.Never,
      })
      containerScale.value = reduced
        ? withTiming(1, { duration: 0 })
        : withTiming(0.8, { duration: 150 })
      const exitDuration = reduced ? 0 : 150
      setTimeout(() => setRendered(false), exitDuration)
    }
  }, [visible])

  useEffect(() => {
    if (visible && onDone) {
      const t = setTimeout(onDone, duration)
      return () => clearTimeout(t)
    }
  }, [visible, duration, onDone])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }))

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }))

  if (!rendered && !visible) return null

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          position: 'absolute',
          top: '40%',
          alignSelf: 'center',
          backgroundColor: colors.white,
          borderRadius: 20,
          paddingVertical: spacing[5],
          paddingHorizontal: spacing[6],
          alignItems: 'center',
          gap: spacing[2],
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
          zIndex: 100,
        },
      ]}
    >
      <Animated.View
        style={[
          iconStyle,
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Text style={{ fontSize: 28, color: colors.white }}>{icon}</Text>
      </Animated.View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{message}</Text>
    </Animated.View>
  )
}
