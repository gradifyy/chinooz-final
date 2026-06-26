import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

export default function LocationScreen() {
  const router = useRouter()

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-7xl mb-6">📍</Text>
        <Text className="text-2xl font-bold text-gray-900 text-center mb-3">Enable Location</Text>
        <Text className="text-base text-gray-500 text-center">
          We'll show products available near you and provide accurate delivery estimates
        </Text>
      </View>

      <View className="px-6 pb-12">
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          className="bg-[#8A1B57] py-3.5 rounded-xl mb-3"
        >
          <Text className="text-white text-center font-semibold text-base">Allow Location Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text className="text-sm text-gray-500 text-center">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
