import React, { useCallback } from 'react'
import { StyleSheet, View, Text, Pressable, AccessibilityInfo } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  ReduceMotion,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, radii, spacing, duration, easing } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useAppState } from './AppStateProvider'
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
  const { isForeground } = useAppState()
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

  // Track background + border color crossfade (status-color transition).
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      knob.value,
      [0, TRAVEL],
      [colors.surface, colors.success],
    ),
    borderColor: interpolateColor(
      knob.value,
      [0, TRAVEL],
      [colors.borderLight, colors.success],
    ),
  }))

  const knobAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: knob.value },
      { scale: knobScale.value },
    ],
  }))

  // Knob dot color crossfade (instead of instant swap).
  const knobDotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      knob.value,
      [0, TRAVEL],
      [colors.textTertiary, colors.success],
    ),
  }))

  // A subtle glow ring that fades in when online. When foregrounded + not
  // reduced-motion, it gently pulses (battery-aware: no repeat in background).
  const glowOpacity = useSharedValue(isOnline ? 1 : 0)
  React.useEffect(() => {
    if (reducedMotion) {
      glowOpacity.value = isOnline ? 0.5 : 0
      return
    }
    if (isOnline && isForeground) {
      // Gentle pulse: 0.3 → 0.7 → 0.3, slow enough to be calm, not distracting.
      glowOpacity.value = withDelay(
        duration.normal,
        withRepeat(
          withTiming(0.7, {
            duration: duration.slower,
            easing: Easing.bezier(...easing.easeInOut),
          }),
          -1,
          true,
        ),
      )
    } else {
      glowOpacity.value = withTiming(isOnline ? 0.5 : 0, {
        duration: duration.normal,
        easing: Easing.bezier(...easing.easeOut),
      })
    }
  }, [isOnline, reducedMotion, isForeground])
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
          <Animated.View style={[styles.knobDot, knobDotStyle]} />
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
})
