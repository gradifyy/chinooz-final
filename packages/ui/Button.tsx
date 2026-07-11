import React, { useCallback, useMemo } from 'react'
import { Text, ActivityIndicator, Pressable, type ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { radii, spacing, springs } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useUIColors } from './UITheme'
import type { ButtonProps } from '@chinooz/types/components'

const sizeStyles: Record<string, { height: number; px: number; fs: number }> = {
  sm: { height: 44, px: spacing[3], fs: 13 },
  md: { height: 44, px: spacing[4], fs: 14 },
  lg: { height: 52, px: spacing[5], fs: 16 },
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

async function fireHaptic(kind: NonNullable<ButtonProps['haptic']>) {
  if (!kind || kind === 'none') return
  try {
    if (kind === 'selection') {
      await Haptics.selectionAsync()
      return
    }
    const style =
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    await Haptics.impactAsync(style)
  } catch {
    // Soft-fail when haptics unavailable (web / unsupported)
  }
}

export default function Button({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  haptic = 'light',
  disabled,
  loading,
  fullWidth,
  onPress,
  children,
  leftIcon,
  rightIcon,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useUIColors()
  const reduced = useReducedMotion()
  const scale = useSharedValue(1)

  const variantStyles = useMemo(
    () => ({
      primary: { bg: colors.primary, text: colors.white },
      secondary: { bg: colors.primary50, text: colors.primary },
      ghost: { bg: 'transparent', text: colors.primary },
      destructive: { bg: colors.error, text: colors.white },
    }),
    [colors],
  )

  const s = variantStyles[variant]
  const sz = sizeStyles[size]
  const radius = shape === 'pill' ? radii.full : radii.lg

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    if (!reduced && !disabled && !loading) {
      scale.value = withSpring(0.97, springs.press)
    }
  }, [reduced, disabled, loading, scale])

  const handlePressOut = useCallback(() => {
    if (!reduced) {
      scale.value = withSpring(1, springs.press)
    }
  }, [reduced, scale])

  const handlePress = useCallback(() => {
    if (disabled || loading) return
    void fireHaptic(haptic)
    onPress?.()
  }, [disabled, loading, haptic, onPress])

  const containerStyle: ViewStyle = {
    backgroundColor: disabled ? colors.border : s.bg,
    borderRadius: radius,
    height: sz.height,
    paddingHorizontal: sz.px,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : undefined,
  }

  return (
    <AnimatedPressable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
      }
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[animStyle, containerStyle]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={s.text} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={{
              color: disabled ? colors.textTertiary : s.text,
              fontSize: sz.fs,
              fontWeight: '600',
            }}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </AnimatedPressable>
  )
}
