import React from 'react'
import { Pressable, Text, ActivityIndicator } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { colors, radii, spacing } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { ButtonProps } from '@chinooz/types/components'

const variantStyles: Record<string, { bg: string; text: string }> = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.primary50, text: colors.primary },
  ghost: { bg: 'transparent', text: colors.primary },
  destructive: { bg: colors.error, text: colors.white },
}

const sizeStyles: Record<string, { height: number; px: number; fs: number }> = {
  sm: { height: 36, px: spacing[3], fs: 13 },
  md: { height: 44, px: spacing[4], fs: 14 },
  lg: { height: 52, px: spacing[5], fs: 16 },
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  onPress,
  children,
  leftIcon,
  rightIcon,
  testID,
}: ButtonProps) {
  const reduced = useReducedMotion()
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const s = variantStyles[variant]
  const sz = sizeStyles[size]

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) scale.value = withSpring(0.96, { damping: 15, stiffness: 400 })
      }}
      onPressOut={() => {
        if (!reduced) scale.value = withSpring(1, { damping: 15, stiffness: 400 })
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        animStyle,
        {
          backgroundColor: disabled ? colors.border : s.bg,
          borderRadius: radii.lg,
          height: sz.height,
          paddingHorizontal: sz.px,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: spacing[2],
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? ('stretch' as const) : undefined,
        },
      ]}
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
