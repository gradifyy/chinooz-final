import React from 'react'
import { View, Dimensions, type ViewProps } from 'react-native'

interface GridProps extends ViewProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  minItemWidth?: number
}

export default function Grid({
  children,
  columns,
  gap = 12,
  minItemWidth,
  style,
  ...rest
}: GridProps) {
  const screenWidth = Dimensions.get('window').width
  const resolvedColumns = columns ?? (minItemWidth
    ? Math.max(1, Math.floor((screenWidth + gap) / (minItemWidth + gap)))
    : 2)

  const itemWidth = (screenWidth - 16 * 2 - gap * (resolvedColumns - 1)) / resolvedColumns

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap,
        },
        style,
      ]}
      {...rest}
    >
      {React.Children.map(children, child => (
        <View style={{ width: itemWidth }}>{child}</View>
      ))}
    </View>
  )
}
