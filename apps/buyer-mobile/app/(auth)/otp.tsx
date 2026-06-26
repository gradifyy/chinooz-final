import React, { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function OtpScreen() {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const refs = useRef<TextInput[]>([])

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp]
    newOtp[index] = text
    setOtp(newOtp)
    if (text && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Enter verification code</Text>
        <Text className="text-sm text-gray-500 mb-8">OTP sent to 984*****67</Text>

        <View className="flex-row justify-between mb-8">
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => { refs.current[i] = ref! }}
              className="w-12 h-14 bg-gray-50 rounded-xl text-center text-xl font-bold text-gray-900 border border-gray-200"
              value={digit}
              onChangeText={text => handleChange(text, i)}
              keyboardType="number-pad"
              maxLength={1}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/create-profile')}
          className="bg-[#8A1B57] py-3.5 rounded-xl"
        >
          <Text className="text-white text-center font-semibold text-base">Verify</Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-4">
          <Text className="text-sm text-[#8A1B57] text-center font-semibold">Resend OTP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
