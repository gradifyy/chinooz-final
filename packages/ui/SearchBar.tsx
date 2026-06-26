import React from 'react'
import { View, TextInput, TouchableOpacity, Text } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { SearchBarProps } from '@chinooz/types/components'

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search...',
  onClear,
  testID,
}: SearchBarProps) {
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: radii.lg,
        paddingHorizontal: spacing[3],
        height: 44,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 16, color: colors.textMuted, marginRight: spacing[2] }}>⌕</Text>
      <TextInput
        style={{ flex: 1, fontSize: 14, color: colors.text, height: '100%' }}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
