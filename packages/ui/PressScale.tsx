import React, { useCallback } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { springs } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export type PressHaptic = 'none' | 'selection' | 'light' | 'medium'

export type PressScaleProps = Omit<PressableProps, 'style'> & {
  /** Scale at press-in. Default 0.97 — subtle, Apple-like. */
  pressedScale?: number
  haptic?: PressHaptic
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

async function fireHaptic(kind: PressHaptic) {
  if (kind === 'none') return
  try {
    if (kind === 'selection') {
      await Haptics.selectionAsync()
      return
    }
    const style =
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    await Haptics.impactAsync(style)
  } catch {
    // Soft-fail when haptics module is unavailable.
  }
}

/**
 * Shared press shell: spring scale + optional haptic. Use for icon buttons,
 * list rows, and any control that shouldn't re-implement press physics.
 */
export default function PressScale({
  pressedScale = 0.97,
  haptic = 'none',
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  style,
  children,
  accessibilityRole = 'button',
  ...rest
}: PressScaleProps) {
  const reduced = useReducedMotion()
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!disabled && !reduced) {
        scale.value = withSpring(pressedScale, springs.press)
      }
      onPressIn?.(e)
    },
    [disabled, reduced, pressedScale, scale, onPressIn],
  )

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      if (!reduced) {
        scale.value = withSpring(1, springs.press)
      }
      onPressOut?.(e)
    },
    [reduced, scale, onPressOut],
  )

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (disabled) return
      void fireHaptic(haptic)
      onPress?.(e)
    },
    [disabled, haptic, onPress],
  )

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animStyle, style, disabled ? { opacity: 0.45 } : null]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  )
}
