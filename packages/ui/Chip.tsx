import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { ChipProps } from '@chinooz/types/components'

export default function Chip({
  label,
  variant = 'default',
  onPress,
  onRemove,
  testID,
}: ChipProps) {
  const isActive = variant === 'active'
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isActive ? colors.primary : colors.background,
        borderRadius: radii.full,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1.5],
        borderWidth: 1,
        borderColor: isActive ? colors.primary : colors.border,
        gap: spacing[1],
        minHeight: 36,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: isActive ? colors.white : colors.text,
        }}
      >
        {label}
      </Text>
      {variant === 'removable' && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 12, color: isActive ? colors.white : colors.textMuted }}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}
