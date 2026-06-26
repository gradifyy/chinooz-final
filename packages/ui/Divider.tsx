import React from 'react'
import { View } from 'react-native'
import { colors } from '@chinooz/theme'
import type { DividerProps } from '@chinooz/types/components'

export default function Divider({
  orientation = 'horizontal',
  color = colors.border,
  testID,
}: DividerProps) {
  return (
    <View
      testID={testID}
      style={
        orientation === 'horizontal'
          ? { height: 1, backgroundColor: color, width: '100%' }
          : { width: 1, backgroundColor: color, height: '100%' }
      }
    />
  )
}
