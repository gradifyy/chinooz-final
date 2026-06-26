import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { QuantityStepperProps } from '@chinooz/types/components'

export default function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  disabled,
  testID,
}: QuantityStepperProps) {
  const atMin = value <= min
  const atMax = value >= max

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity
        onPress={() => onChange(value - 1)}
        disabled={atMin || disabled}
        accessibilityLabel="Decrease quantity"
        style={{
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          opacity: atMin || disabled ? 0.4 : 1,
          minWidth: 44,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>−</Text>
      </TouchableOpacity>
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors.border,
          minWidth: 48,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{value}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        disabled={atMax || disabled}
        accessibilityLabel="Increase quantity"
        style={{
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          opacity: atMax || disabled ? 0.4 : 1,
          minWidth: 44,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>+</Text>
      </TouchableOpacity>
    </View>
  )
}
