import React from 'react'
import { View, Text, Image } from 'react-native'
import { colors } from '@chinooz/theme'
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
  const initials = name
    ? name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <View
      testID={testID}
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
        <Image source={{ uri: source }} style={{ width: dim, height: dim }} />
      ) : fallback ? (
        fallback
      ) : (
        <Text style={{ fontSize: dim * 0.35, fontWeight: '600', color: colors.primary }}>
          {initials}
        </Text>
      )}
    </View>
  )
}
