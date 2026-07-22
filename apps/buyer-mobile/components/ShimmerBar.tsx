import React, { useEffect } from 'react'
import { type DimensionValue } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  Extrapolation,
  interpolate,
} from 'react-native-reanimated'
import { useAppTheme } from './ThemeProvider'
import { radii } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'

const SHIMMER_DURATION = 1200
const SHIMMER_DELAY = 200

interface ShimmerBarProps {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  delay?: number
}

export default function ShimmerBar({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  delay = 0,
}: ShimmerBarProps) {
  const { colors } = useAppTheme()
  const reduced = useReducedMotion()
  const progress = useSharedValue(0)

  useEffect(() => {
    if (reduced) return
    progress.value = withDelay(
      delay + SHIMMER_DELAY,
      withRepeat(
        withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    )
  }, [reduced, delay, progress])

  const animWidth: DimensionValue | undefined = typeof width === 'string' ? width as DimensionValue : width

  const shimmerStyle = useAnimatedStyle(() => {
    if (reduced) return {}
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-100, 100],
      Extrapolation.CLAMP,
    )
    return {
      transform: [{ translateX: `${translateX}%` }],
    }
  })

  const opacityStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.5 }
    const opacity = interpolate(
      progress.value,
      [0, 0.4, 0.6, 1],
      [0, 0.8, 0.8, 0],
      Extrapolation.CLAMP,
    )
    return { opacity }
  })

  return (
    <Animated.View
      style={{
        width: animWidth,
        height,
        borderRadius,
        backgroundColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {!reduced && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.shimmerHighlight,
            },
            opacityStyle,
            shimmerStyle,
          ]}
        />
      )}
    </Animated.View>
  )
}
