import React, { useCallback, useState } from 'react'
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { duration } from '@chinooz/theme'
import {
  onboardingColors,
  onboardingShapes,
  onboardingTypography,
  onboardingAnimations,
} from '../../lib/onboardingTheme'

interface OnboardingInputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function OnboardingInput({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  ...textInputProps
}: OnboardingInputProps) {
  const [, setIsFocused] = useState(false)
  const borderColor = useSharedValue(onboardingColors.inputBorder)

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true)
      borderColor.value = withTiming(onboardingColors.inputBorderActive, {
        duration: onboardingAnimations.inputFocus.duration,
        easing: Easing.out(Easing.cubic),
      })
      onFocus?.(e)
    },
    [borderColor, onFocus],
  )

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false)
      borderColor.value = withTiming(onboardingColors.inputBorder, {
        duration: duration.fast,
        easing: Easing.out(Easing.cubic),
      })
      onBlur?.(e)
    },
    [borderColor, onBlur],
  )

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }))

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Animated.View
        style={[styles.inputContainer, error ? styles.inputError : null, animatedBorderStyle]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
          ]}
          placeholderTextColor={onboardingColors.inputPlaceholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label ?? textInputProps.placeholder}
          {...textInputProps}
        />

        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </Animated.View>

      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...onboardingTypography.label,
    color: onboardingColors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: onboardingShapes.inputHeight,
    borderRadius: onboardingShapes.inputRadius,
    borderWidth: 1,
    borderColor: onboardingColors.inputBorder,
    backgroundColor: onboardingColors.inputBackground,
    paddingHorizontal: onboardingShapes.inputPadding,
  },
  inputError: {
    borderColor: onboardingColors.error,
  },
  input: {
    flex: 1,
    ...onboardingTypography.bodyLarge,
    color: onboardingColors.textPrimary,
    padding: 0,
    margin: 0,
  },
  inputWithLeftIcon: {
    marginLeft: 12,
  },
  inputWithRightIcon: {
    marginRight: 12,
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIcon: {
    marginLeft: 0,
  },
  errorText: {
    ...onboardingTypography.label,
    color: onboardingColors.error,
    marginTop: 8,
  },
})
