import React from 'react'
import { View, Text } from 'react-native'
import { colors } from '@chinooz/theme'
import { getInitials, getImageSource } from '@chinooz/utils'
import SafeImage from './SafeImage'
import type { AvatarProps } from '@chinooz/types/components'

const sizeMap: Record<string, number> = { sm: 32, md: 40, lg: 56, xl: 72 }

export default function Avatar({
  source,
  name,
  size = 'md',
  fallback,
  testID,
}: AvatarProps) {
  const dim = sizeMap[size]
  const safeName = typeof name === 'string' ? name : ''
  const initials = getInitials(safeName)

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={safeName || 'Avatar'}
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: colors.primary50,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {source ? (
        <SafeImage
          source={source}
          style={{ width: dim, height: dim }}
          accessibilityLabel={safeName || 'Avatar image'}
        />
      ) : fallback ? (
        fallback
      ) : (
        <Text
          style={{ fontSize: dim * 0.35, fontWeight: '600', color: colors.primary }}
          numberOfLines={1}
          accessibilityLabel={safeName || 'Avatar placeholder'}
        >
          {initials}
        </Text>
      )}
    </View>
  )
}
