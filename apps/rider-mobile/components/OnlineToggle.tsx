import React, { useCallback } from 'react'
import { StyleSheet, View, Text, Pressable, AccessibilityInfo } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  ReduceMotion,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing, duration, easing } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import type { OnlineStatus } from '@chinooz/state'

const TRACK_HEIGHT = 64
const KNOB_SIZE = 52
const TRAVEL = TRACK_HEIGHT - KNOB_SIZE - 6 // vertical travel for a tall pill

interface OnlineToggleProps {
  status: OnlineStatus
  onToggle: (next: OnlineStatus) => void
  labelOnline: string
  labelOffline: string
  ariaLabel: string
  hintOnline: string
  hintOffline: string
}

export default function OnlineToggle({
  status,
  onToggle,
  labelOnline,
  labelOffline,
  ariaLabel,
  hintOnline,
  hintOffline,
}: OnlineToggleProps) {
  const { reducedMotion } = useA11y()
  const isOnline = status === 'online'

  // Knob position: 0 = top (offline), TRAVEL = bottom (online). We use a tall
  // pill oriented vertically so the flip reads as a satisfying drop/rise.
  const knob = useSharedValue(isOnline ? TRAVEL : 0)
  const knobScale = useSharedValue(1)

  React.useEffect(() => {
    if (reducedMotion) {
      knob.value = isOnline ? TRAVEL : 0
    } else {
      knob.value = withSpring(isOnline ? TRAVEL : 0, {
        damping: 18,
        stiffness: 260,
        mass: 0.9,
        reduceMotion: ReduceMotion.Never,
      })
    }
  }, [isOnline, reducedMotion])

  const handlePressIn = useCallback(() => {
    if (reducedMotion) return
    knobScale.value = withSpring(0.94, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  const handlePressOut = useCallback(() => {
    if (reducedMotion) return
    knobScale.value = withSpring(1, { damping: 20, stiffness: 400 })
  }, [reducedMotion])

  const handleToggle = useCallback(() => {
    const next: OnlineStatus = isOnline ? 'offline' : 'online'
    // Haptic: heavier going online (commit), softer going offline.
    try {
      if (!reducedMotion) {
        if (next === 'online') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        }
      }
    } catch {}

    // Announce the state change for screen readers.
    const announce = next === 'online' ? hintOnline : hintOffline
    try {
      runOnJS(AccessibilityInfo.announceForAccessibility)(announce)
    } catch {}

    onToggle(next)
  }, [isOnline, reducedMotion, hintOnline, hintOffline, onToggle])

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      knob.value,
      [0, TRAVEL],
      [colors.surface, colors.success],
    ),
  }))

  const knobAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: knob.value },
      { scale: knobScale.value },
    ],
  }))

  // A subtle glow ring that fades in when online.
  const glowOpacity = useSharedValue(isOnline ? 1 : 0)
  React.useEffect(() => {
    glowOpacity.value = withTiming(isOnline ? 1 : 0, {
      duration: reducedMotion ? 0 : duration.normal,
      easing: Easing.bezier(...easing.easeOut),
    })
  }, [isOnline, reducedMotion])
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }))

  return (
    <Pressable
      onPress={handleToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="switch"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ checked: isOnline }}
      accessibilityHint={isOnline ? hintOffline : hintOnline}
      accessibilityValue={{ text: isOnline ? labelOnline : labelOffline }}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        {/* Online glow ring */}
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, glowStyle]}
        />

        {/* Side labels */}
        <View style={styles.labelRow} pointerEvents="none">
          <Text
            style={[
              styles.sideLabel,
              isOnline && styles.sideLabelInactive,
            ]}
            numberOfLines={1}
          >
            {labelOffline}
          </Text>
          <Text
            style={[
              styles.sideLabel,
              !isOnline && styles.sideLabelInactive,
              styles.sideLabelOnline,
            ]}
            numberOfLines={1}
          >
            {labelOnline}
          </Text>
        </View>

        {/* Knob */}
        <Animated.View style={[styles.knob, knobAnimStyle]}>
          <View style={[styles.knobDot, isOnline ? styles.knobDotOnline : styles.knobDotOffline]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  track: {
    width: 180,
    height: TRACK_HEIGHT,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    paddingHorizontal: 6,
    // Vertical layout: knob travels top<->bottom inside the tall pill.
    flexDirection: 'column',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colors.success,
    opacity: 0,
  },
  labelRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: spacing[5],
    right: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  sideLabelOnline: {
    color: colors.white,
  },
  sideLabelInactive: {
    opacity: 0.35,
  },
  knob: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  knobDot: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
  },
  knobDotOffline: {
    backgroundColor: colors.textTertiary,
  },
  knobDotOnline: {
    backgroundColor: colors.success,
  },
})
