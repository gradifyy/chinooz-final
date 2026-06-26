import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { colors, radii } from '@chinooz/theme'
import type { SkeletonProps } from '@chinooz/types/components'

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  circle,
  testID,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current
  const animWidth = typeof width === 'string' ? undefined : width

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      testID={testID}
      style={{
        width: animWidth,
        height,
        borderRadius: circle ? 9999 : borderRadius,
        backgroundColor: colors.border,
        opacity,
      }}
    />
  )
}
