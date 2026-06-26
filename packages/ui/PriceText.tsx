import React from 'react'
import { View, Text } from 'react-native'
import { colors, spacing } from '@chinooz/theme'
import type { PriceTextProps } from '@chinooz/types/components'

function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`
}

const sizeMap: Record<string, { current: number; compare: number }> = {
  sm: { current: 14, compare: 11 },
  md: { current: 18, compare: 13 },
  lg: { current: 24, compare: 16 },
}

export default function PriceText({
  price,
  compareAtPrice,
  size = 'md',
  variant = 'default',
  testID,
}: PriceTextProps) {
  const sz = sizeMap[size]
  const isDeal = variant === 'deal'

  return (
    <View
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}
    >
      <Text
        style={{
          fontSize: sz.current,
          fontWeight: '700',
          color: isDeal ? colors.gold : colors.text,
        }}
      >
        {formatPrice(price)}
      </Text>
      {compareAtPrice && compareAtPrice > price && (
        <Text
          style={{
            fontSize: sz.compare,
            color: colors.textMuted,
            textDecorationLine: 'line-through',
          }}
        >
          {formatPrice(compareAtPrice)}
        </Text>
      )}
      {compareAtPrice && compareAtPrice > price && (
        <Text style={{ fontSize: sz.compare, color: colors.success, fontWeight: '600' }}>
          {Math.round((1 - price / compareAtPrice) * 100)}% OFF
        </Text>
      )}
    </View>
  )
}
