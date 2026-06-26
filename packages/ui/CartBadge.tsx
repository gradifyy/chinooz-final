import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { cartStore } from '@chinooz/state'

interface CartBadgeProps {
  onPress: () => void
}

export default function CartBadge({ onPress }: CartBadgeProps) {
  const count = cartStore(s => s.items.reduce((sum, i) => sum + i.quantity, 0))

  return (
    <TouchableOpacity onPress={onPress} className="relative p-1">
      <Text className="text-xl text-gray-700">🛒</Text>
      {count > 0 && (
        <View className="absolute -top-0.5 -right-0.5 bg-[#8A1B57] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
