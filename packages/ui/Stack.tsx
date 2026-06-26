import React from 'react'
import { View, type ViewProps } from 'react-native'

interface StackProps extends ViewProps {
  children: React.ReactNode
  gap?: number
  align?: 'stretch' | 'center' | 'flex-start' | 'flex-end'
}

export default function Stack({
  children,
  gap = 0,
  align,
  style,
  ...rest
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'column',
          gap,
          alignItems: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
