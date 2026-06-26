import React from 'react'
import { ActivityIndicator } from 'react-native'
import { colors } from '@chinooz/theme'
import type { SpinnerProps } from '@chinooz/types/components'

const sizeMap: Record<string, 'small' | 'large'> = { sm: 'small', md: 'small', lg: 'large' }

export default function Spinner({ size = 'md', color = colors.primary, testID }: SpinnerProps) {
  return <ActivityIndicator testID={testID} size={sizeMap[size]} color={color} />
}
