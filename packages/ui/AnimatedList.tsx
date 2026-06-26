import React, { useEffect } from 'react'
import { View, type ViewProps } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { duration } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'

interface AnimatedListProps extends ViewProps {
  children: React.ReactNode
  stagger?: number
}

export default function AnimatedList({ children, stagger = 60, style, ...rest }: AnimatedListProps) {
  const reduced = useReducedMotion()

  return (
    <View style={style} {...rest}>
      {React.Children.map(children, (child, i) => (
        <AnimatedListItem key={i} index={i} stagger={reduced ? 0 : stagger} reduced={reduced}>
          {child}
        </AnimatedListItem>
      ))}
    </View>
  )
}

function AnimatedListItem({
  children,
  index,
  stagger,
  reduced,
}: {
  children: React.ReactNode
  index: number
  stagger: number
  reduced: boolean
}) {
  const opacity = useSharedValue(reduced ? 1 : 0)
  const translateY = useSharedValue(reduced ? 0 : 16)

  useEffect(() => {
    const delay = index * stagger
    opacity.value = withDelay(delay, withTiming(1, { duration: reduced ? 0 : duration.normal }))
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 }),
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={animStyle}>{children}</Animated.View>
}
