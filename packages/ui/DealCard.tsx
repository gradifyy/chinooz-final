import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { Deal } from '@chinooz/types'
import { formatTimeRemaining } from '@chinooz/utils'

interface DealCardProps {
  deal: Deal
  onPress: (deal: Deal) => void
}

export default function DealCard({ deal, onPress }: DealCardProps) {
  const timeLeft = formatTimeRemaining(deal.endsAt)

  return (
    <TouchableOpacity
      onPress={() => onPress(deal)}
      className="bg-white rounded-xl overflow-hidden mr-3 w-64"
      style={{ elevation: 2 }}
    >
      <Image
        source={{ uri: deal.image }}
        className="w-full h-32"
        resizeMode="cover"
      />
      <View className="absolute top-2 left-2 bg-[#E0A93B] px-2 py-0.5 rounded-full">
        <Text className="text-white text-xs font-bold">{deal.type.toUpperCase()}</Text>
      </View>
      <View className="p-3">
        <Text className="text-sm font-bold text-gray-900">{deal.title}</Text>
        <Text className="text-xs text-gray-500 mt-1">{deal.description}</Text>
        <View className="flex-row items-center justify-between mt-2">
          <View className="bg-[#F8EAF1] px-2 py-1 rounded-full">
            <Text className="text-[#8A1B57] text-xs font-bold">Up to {deal.percentOff}% OFF</Text>
          </View>
          <Text className="text-xs text-gray-400">{timeLeft}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
