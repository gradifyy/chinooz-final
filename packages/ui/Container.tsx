import React from 'react'
import { View, type ViewProps } from 'react-native'

interface ContainerProps extends ViewProps {
  children: React.ReactNode
  maxWidth?: number
  padded?: boolean
}

export default function Container({
  children,
  maxWidth = 1280,
  padded = true,
  style,
  ...rest
}: ContainerProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth,
          alignSelf: 'center',
        },
        padded && { paddingHorizontal: 16 },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
