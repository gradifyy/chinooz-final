import React, { useState } from 'react'
import { View, TextInput, Text, TouchableOpacity } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { InputProps } from '@chinooz/types/components'

export default function Input({
  value,
  defaultValue,
  onChangeText,
  placeholder,
  label,
  error,
  hint,
  disabled,
  readOnly,
  secureTextEntry,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  multiline,
  maxLength,
  testID,
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const [secure, setSecure] = useState(secureTextEntry)

  const rnKeyboardType = keyboardType === 'number' ? 'numeric' as const
    : keyboardType === 'email' ? 'email-address' as const
    : keyboardType === 'phone' ? 'phone-pad' as const
    : 'default' as const

  return (
    <View testID={testID}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: spacing[1.5] }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: error ? colors.error : focused ? colors.primary : colors.border,
          paddingHorizontal: spacing[3],
          minHeight: multiline ? 100 : 48,
        }}
      >
        {leftIcon && <View style={{ marginRight: spacing[2] }}>{leftIcon}</View>}
        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.text,
            paddingVertical: spacing[3],
            minHeight: multiline ? 80 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          value={value}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!disabled && !readOnly}
          secureTextEntry={secure}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          keyboardType={rnKeyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          multiline={multiline}
          maxLength={maxLength}
          accessibilityLabel={label ?? placeholder}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setSecure(!secure)} style={{ padding: spacing[1] }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{secure ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon}
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: colors.error, marginTop: spacing[1] }}>{error}</Text>
      )}
      {hint && !error && (
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing[1] }}>{hint}</Text>
      )}
    </View>
  )
}
