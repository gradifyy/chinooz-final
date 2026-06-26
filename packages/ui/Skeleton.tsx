import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'
import { colors, radii } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { SkeletonProps } from '@chinooz/types/components'

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  circle,
  testID,
}: SkeletonProps) {
  const reduced = useReducedMotion()
  const shimmer = useRef(new Animated.Value(0)).current
  const animWidth = typeof width === 'string' ? undefined : width

  useEffect(() => {
    if (reduced) return
    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    )
    anim.start()
    return () => anim.stop()
  }, [reduced])

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  })

  return (
    <Animated.View
      testID={testID}
      style={{
        width: animWidth,
        height,
        borderRadius: circle ? 9999 : borderRadius,
        backgroundColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {!reduced && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.shimmerHighlight,
              opacity: 0.6,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
    </Animated.View>
  )
}
