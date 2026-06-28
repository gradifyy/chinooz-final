import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated'
import { Award } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { duration, easing } from '@chinooz/theme'

interface TierUpCelebrationProps {
  /** Whether the celebration is visible. */
  visible: boolean
  /** Tier label, e.g. "Gold". */
  tierLabel: string
  /** Tier accent color (primary). */
  accentColor: string
  /** Called when the celebration finishes (after the display period). */
  onDone?: () => void
  /** How long to show the celebration before fading out (ms). */
  displayMs?: number
}

/**
 * Tasteful tier-up celebration. A centered card with a medal that springs in,
 * holds for the display period, then fades out. Shared with Incentives (RI4)
 * for streak/tier-up moments.
 *
 * Reduced-motion: shows the final state instantly with no spring/fade.
 */
export function TierUpCelebration({
  visible,
  tierLabel,
  accentColor,
  onDone,
  displayMs = 1800,
}: TierUpCelebrationProps) {
  const reduced = useReducedMotion()
  const [rendered, setRendered] = useState(false)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(reduced ? 1 : 0.5)
  const medalScale = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      // Enter: fade + spring scale.
      opacity.value = withTiming(1, {
        duration: reduced ? 0 : duration.fast,
        reduceMotion: ReduceMotion.Never,
      })
      scale.value = reduced
        ? withTiming(1, { duration: 0 })
        : withSpring(1, { damping: 14, stiffness: 200 })
      medalScale.value = reduced
        ? withTiming(1, { duration: 0 })
        : withDelay(100, withSpring(1, { damping: 10, stiffness: 150 }))

      // Exit after display period.
      const exitMs = reduced ? 200 : displayMs
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: reduced ? 0 : duration.normal,
          reduceMotion: ReduceMotion.Never,
        })
        scale.value = reduced
          ? withTiming(1, { duration: 0 })
          : withTiming(0.8, { duration: duration.normal })
        const cleanup = setTimeout(() => {
          setRendered(false)
          onDone?.()
        }, reduced ? 0 : duration.normal + 50)
        return () => clearTimeout(cleanup)
      }, exitMs)
      return () => clearTimeout(timer)
    }
  }, [visible, reduced, displayMs, onDone])

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: medalScale.value }],
  }))

  if (!rendered && !visible) return null

  return (
    <Animated.View
      style={[
        cardStyle,
        {
          position: 'absolute',
          top: '35%',
          alignSelf: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii['2xl'],
          paddingVertical: spacing[6],
          paddingHorizontal: spacing[7],
          alignItems: 'center',
          gap: spacing[3],
          ...shadow('lg'),
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          medalStyle,
          {
            width: 64,
            height: 64,
            borderRadius: radii.full,
            backgroundColor: accentColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Award size={32} color={colors.white} />
      </Animated.View>
      <Text
        style={{
          fontSize: fontSize.lg[0],
          fontWeight: '700',
          color: colors.text,
          fontFamily: fontFamily.sansBold[0],
        }}
      >
        {tierLabel}
      </Text>
    </Animated.View>
  )
}
