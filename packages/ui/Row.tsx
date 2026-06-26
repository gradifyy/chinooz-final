import React from 'react'
import { View, type ViewProps } from 'react-native'

interface RowProps extends ViewProps {
  children: React.ReactNode
  gap?: number
  align?: 'stretch' | 'center' | 'flex-start' | 'flex-end' | 'baseline'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  wrap?: boolean
}

export default function Row({
  children,
  gap = 0,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
  ...rest
}: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
