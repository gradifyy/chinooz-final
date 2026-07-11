import React from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import { springs } from '@chinooz/theme'
import {
  onboardingColors,
  onboardingShapes,
  onboardingAnimations,
  onboardingSpacing,
} from '../../lib/onboardingTheme'

interface PaginationDotsProps {
  count: number
  activeIndex: number
  reducedMotion?: boolean
}

export function PaginationDots({ count, activeIndex, reducedMotion = false }: PaginationDotsProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, index) => (
        <PaginationDot
          key={index}
          active={index === activeIndex}
          reducedMotion={reducedMotion}
          index={index}
        />
      ))}
    </View>
  )
}

function PaginationDot({
  active,
  reducedMotion,
  index,
}: {
  active: boolean
  reducedMotion: boolean
  index: number
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = active ? onboardingAnimations.paginationDot.activeScale : 1

    if (reducedMotion) {
      return {
        backgroundColor: active ? onboardingColors.dotActive : onboardingColors.dotInactive,
        transform: [{ scale: active ? 1.15 : 1 }],
      }
    }

    return {
      backgroundColor: withTiming(
        active ? onboardingColors.dotActive : onboardingColors.dotInactive,
        { duration: onboardingAnimations.paginationDot.duration },
      ),
      transform: [
        {
          scale: withSpring(scale, springs.press),
        },
      ],
    }
  }, [active, reducedMotion])

  return (
    <Animated.View
      style={[styles.dot, animatedStyle]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Slide ${index + 1}`}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: onboardingSpacing.sm,
    minHeight: 44,
  },
  dot: {
    width: onboardingShapes.dotSize,
    height: onboardingShapes.dotSize,
    borderRadius: onboardingShapes.dotRadius,
  },
})
