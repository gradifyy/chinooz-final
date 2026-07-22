import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

export function StaggerSection({
  children,
  index,
  reducedMotion,
}: {
  children: React.ReactNode
  index: number
  reducedMotion: boolean
}) {
  const anim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current
  useEffect(() => {
    if (reducedMotion) return
    const delay = index * 50
    const timer = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        damping: 20,
        stiffness: 300,
        mass: 0.8,
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [index, reducedMotion, anim])
  const style = reducedMotion
    ? null
    : {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }
  return <Animated.View style={style}>{children}</Animated.View>
}
