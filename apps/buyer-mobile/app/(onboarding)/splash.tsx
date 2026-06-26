import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'

export default function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(onboarding)/walkthrough')
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <View className="flex-1 bg-[#8A1B57] items-center justify-center">
      <Text className="text-5xl font-bold text-white mb-2">Chinooz</Text>
      <Text className="text-base text-white/80">Shop Nepal, Love Local</Text>
    </View>
  )
}
