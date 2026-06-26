import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { colors, radii, spacing } from '@chinooz/theme'
import type { CardProps } from '@chinooz/types/components'

export default function Card({
  padded = true,
  elevated = false,
  onPress,
  children,
  testID,
}: CardProps) {
  const content = (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: padded ? spacing[4] : 0,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...(elevated
          ? {
              shadowColor: colors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }
          : {}),
      }}
    >
      {children}
    </View>
  )

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.9}>{content}</TouchableOpacity>
  }
  return content
}
