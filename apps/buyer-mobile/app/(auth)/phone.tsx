import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PhoneScreen() {
  const router = useRouter()
  const [phone, setPhone] = useState('')

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Enter your phone number</Text>
        <Text className="text-sm text-gray-500 mb-8">We'll send you a verification code</Text>

        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 h-14 border border-gray-200">
          <Text className="text-base text-gray-700 font-semibold mr-2">🇳🇵 +977</Text>
          <TextInput
            className="flex-1 text-base text-gray-900"
            value={phone}
            onChangeText={setPhone}
            placeholder="98XXXXXXXX"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/otp')}
          disabled={phone.length < 10}
          className={`mt-6 py-3.5 rounded-xl ${phone.length < 10 ? 'bg-gray-300' : 'bg-[#8A1B57]'}`}
        >
          <Text className="text-white text-center font-semibold text-base">Send OTP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
