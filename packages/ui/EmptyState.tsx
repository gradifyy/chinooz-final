import React from 'react'
import { View, Text } from 'react-native'

interface EmptyStateProps {
  icon: string
  title: string
  subtitle?: string
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-lg font-semibold text-gray-900 text-center">{title}</Text>
      {subtitle && (
        <Text className="text-sm text-gray-500 text-center mt-2">{subtitle}</Text>
      )}
    </View>
  )
}
