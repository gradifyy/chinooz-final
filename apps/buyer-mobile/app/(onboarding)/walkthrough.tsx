import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'

const slides = [
  {
    icon: '🛍️',
    title: 'Welcome to Chinooz',
    subtitle: "Nepal's favorite online marketplace",
  },
  {
    icon: '🚚',
    title: 'Fast Delivery Across Nepal',
    subtitle: 'Free delivery on orders over NPR 1,000',
  },
  {
    icon: '💰',
    title: 'Best Prices Guaranteed',
    subtitle: 'Daily deals and exclusive discounts',
  },
]

const { width } = Dimensions.get('window')

export default function WalkthroughScreen() {
  const router = useRouter()
  const [page, setPage] = useState(0)

  const slide = slides[page]

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-7xl mb-6">{slide.icon}</Text>
        <Text className="text-2xl font-bold text-gray-900 text-center mb-3">{slide.title}</Text>
        <Text className="text-base text-gray-500 text-center">{slide.subtitle}</Text>
      </View>

      <View className="px-6 pb-12">
        <View className="flex-row justify-center mb-8">
          {slides.map((_, i) => (
            <View
              key={i}
              className={`w-2.5 h-2.5 rounded-full mx-1 ${
                i === page ? 'bg-[#8A1B57] w-6' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>

        <View className="flex-row gap-3">
          {page < slides.length - 1 ? (
            <>
              <TouchableOpacity
                onPress={() => router.replace('/(onboarding)/location')}
                className="flex-1 py-3 rounded-xl border border-gray-200"
              >
                <Text className="text-gray-700 text-center font-semibold">Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPage(page + 1)}
                className="flex-1 bg-[#8A1B57] py-3 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => router.replace('/(onboarding)/location')}
              className="flex-1 bg-[#8A1B57] py-3 rounded-xl"
            >
              <Text className="text-white text-center font-semibold text-base">Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}
