import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated'
import { colors, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'

interface AddedToCartProps {
  visible: boolean
  onDone?: () => void
}

export default function AddedToCart({ visible, onDone }: AddedToCartProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(0)
  const scale = useSharedValue(reduced ? 1 : 0.5)
  const checkScale = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (visible) {
      const dur = reduced ? 0 : 200
      opacity.value = withTiming(1, { duration: dur })
      scale.value = withSpring(1, {
        damping: reduced ? 100 : 15,
        stiffness: reduced ? 1000 : 400,
        mass: 0.6,
      })
      checkScale.value = withDelay(
        reduced ? 0 : 150,
        withSpring(1, { damping: 12, stiffness: 500 }),
      )

      if (onDone) {
        const timeout = setTimeout(onDone, reduced ? 100 : 1600)
        return () => clearTimeout(timeout)
      }
    } else {
      opacity.value = withTiming(0, { duration: reduced ? 0 : 150 })
      scale.value = withTiming(reduced ? 1 : 0.5, { duration: reduced ? 0 : 150 })
      checkScale.value = withTiming(0, { duration: 0 })
    }
  }, [visible])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }))

  if (!visible) return null

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '40%',
          alignSelf: 'center',
          backgroundColor: colors.success,
          borderRadius: 9999,
          width: 80,
          height: 80,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        },
        containerStyle,
      ]}
    >
      <Animated.Text style={[{ fontSize: 36, color: colors.white }, checkStyle]}>
        ✓
      </Animated.Text>
    </Animated.View>
  )
}
