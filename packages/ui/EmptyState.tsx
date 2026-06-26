import React from 'react'
import { View, Text } from 'react-native'
import { colors, spacing } from '@chinooz/theme'
import Button from './Button'
import type { EmptyStateProps } from '@chinooz/types/components'

export default function EmptyState({
  icon,
  title,
  subtitle,
  action,
  testID,
}: EmptyStateProps) {
  return (
    <View
      testID={testID}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing[8],
        paddingVertical: spacing[12],
        gap: spacing[3],
      }}
    >
      {icon && <View style={{ marginBottom: spacing[2] }}>{icon}</View>}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
      {action && (
        <Button variant="primary" size="md" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </View>
  )
}
