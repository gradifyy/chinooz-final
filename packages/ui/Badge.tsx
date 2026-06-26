import React from 'react'
import { View, Text } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { BadgeProps } from '@chinooz/types/components'

const variantMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: colors.primary, text: colors.white },
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: '#92400E' },
  error: { bg: colors.errorLight, text: colors.error },
  info: { bg: colors.infoLight, text: colors.info },
  neutral: { bg: colors.border, text: colors.textSecondary },
  deal: { bg: colors.gold, text: colors.white },
}

const sizeMap: Record<string, { px: number; py: number; fs: number }> = {
  sm: { px: spacing[1.5], py: 2, fs: 10 },
  md: { px: spacing[2], py: spacing[0.5], fs: 11 },
}

export default function Badge({
  label,
  variant = 'primary',
  size = 'md',
  testID,
}: BadgeProps) {
  const v = variantMap[variant]
  const sz = sizeMap[size]
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: v.bg,
        borderRadius: radii.full,
        paddingHorizontal: sz.px,
        paddingVertical: sz.py,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: v.text, fontSize: sz.fs, fontWeight: '700', letterSpacing: 0.3 }}>
        {label}
      </Text>
    </View>
  )
}
