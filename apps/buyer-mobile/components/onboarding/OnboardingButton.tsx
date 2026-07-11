import React from 'react'
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Button, PressScale } from '@chinooz/ui'
import {
  onboardingColors,
  onboardingTypography,
  onboardingSpacing,
} from '../../lib/onboardingTheme'

interface OnboardingButtonProps {
  onPress: () => void
  children: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

/**
 * Thin wrapper over the shared Button so onboarding CTAs stay in lockstep
 * with the design system (springs, haptics, dark-ready colors).
 */
export function OnboardingButton({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: OnboardingButtonProps) {
  return (
    <View style={[{ alignSelf: 'stretch' }, style]}>
      <Button
        variant={variant === 'secondary' ? 'secondary' : 'primary'}
        size="lg"
        shape="pill"
        haptic="light"
        fullWidth
        disabled={disabled}
        loading={loading}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel || children}
      >
        {children}
      </Button>
    </View>
  )
}

interface TextButtonProps {
  onPress: () => void
  children: string
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  accessibilityLabel?: string
}

export function OnboardingTextButton({
  onPress,
  children,
  style,
  textStyle,
  accessibilityLabel,
}: TextButtonProps) {
  return (
    <PressScale
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || children}
      hitSlop={8}
      style={[
        {
          minHeight: 44,
          minWidth: 44,
          alignContent: 'center',
          justifyContent: 'center',
          paddingHorizontal: onboardingSpacing.lg,
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            ...onboardingTypography.bodyMedium,
            fontWeight: '600',
            color: onboardingColors.white,
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </PressScale>
  )
}
