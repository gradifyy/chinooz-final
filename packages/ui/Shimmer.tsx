import React, { useEffect, useRef } from 'react'
import { View, Animated } from 'react-native'

interface ShimmerProps {
  width: number | string
  height: number
  borderRadius?: number
  className?: string
}

export default function Shimmer({ width, height, borderRadius = 8, className }: ShimmerProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{ width: width as any, height, borderRadius, opacity }}
      className={`bg-gray-200 ${className ?? ''}`}
    />
  )
}
