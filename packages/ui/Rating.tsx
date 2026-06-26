import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { colors, spacing } from '@chinooz/theme'
import type { RatingProps } from '@chinooz/types/components'

const sizeMap: Record<string, number> = { sm: 14, md: 18, lg: 24 }

export default function Rating({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  interactive = false,
  onChange,
  testID,
}: RatingProps) {
  const starSize = sizeMap[size]

  return (
    <View
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] }}
    >
      {Array.from({ length: maxStars }).map((_, i) => {
        const filled = i < Math.floor(rating)
        const half = !filled && i < rating
        return (
          <TouchableOpacity
            key={i}
            onPress={() => interactive && onChange?.(i + 1)}
            disabled={!interactive}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text
              style={{
                fontSize: starSize,
                color: filled ? colors.gold : half ? colors.gold : colors.border,
                opacity: half ? 0.5 : 1,
              }}
            >
              ★
            </Text>
          </TouchableOpacity>
        )
      })}
      {showValue && (
        <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: spacing[1] }}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  )
}
