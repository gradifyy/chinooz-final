import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authStore } from '@chinooz/state'

export default function CreateProfileScreen() {
  const router = useRouter()
  const setUser = authStore(s => s.setUser)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const handleSave = () => {
    setUser({
      id: 'user-1',
      phone: '9841234567',
      name: name || 'Chinooz User',
      email: email || undefined,
      addresses: [],
    })
    router.replace('/(tabs)/home')
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Create Your Profile</Text>
        <Text className="text-sm text-gray-500 mb-8">Help us personalize your experience</Text>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Full Name</Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 h-14 text-base text-gray-900 border border-gray-200"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Email (optional)</Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 h-14 text-base text-gray-900 border border-gray-200"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          className="bg-[#8A1B57] py-3.5 rounded-xl"
        >
          <Text className="text-white text-center font-semibold text-base">Save Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
