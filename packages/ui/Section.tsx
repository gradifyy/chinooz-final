import React from 'react'
import { View, type ViewProps } from 'react-native'
import Text from './Text'
import Row from './Row'

interface SectionProps extends ViewProps {
  children: React.ReactNode
  title?: string
  action?: { label: string; onPress: () => void }
  gap?: number
}

export default function Section({
  children,
  title,
  action,
  gap = 12,
  style,
  ...rest
}: SectionProps) {
  return (
    <View style={[{ gap: 8 }, style]} {...rest}>
      {title && (
        <Row justify="space-between" align="center">
          <Text variant="h3">{title}</Text>
          {action && (
            <Text
              variant="label"
              color="#8A1B57"
            >
              {action.label}
            </Text>
          )}
        </Row>
      )}
      <View style={{ gap }}>{children}</View>
    </View>
  )
}
