import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
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
  const s = variantStyles[variant]
  const sz = sizeStyles[size]

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={{
        backgroundColor: disabled ? colors.border : s.bg,
        borderRadius: radii.lg,
        height: sz.height,
        paddingHorizontal: sz.px,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        opacity: disabled ? 0.5 : 1,
        alignSelf: fullWidth ? 'stretch' : undefined,
      }}
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
    </TouchableOpacity>
  )
}
