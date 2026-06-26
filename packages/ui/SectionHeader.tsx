import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

interface SectionHeaderProps {
  title: string
  actionLabel?: string
  onAction?: () => void
}

export default function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <Text className="text-lg font-bold text-gray-900">{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text className="text-sm text-[#8A1B57] font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
