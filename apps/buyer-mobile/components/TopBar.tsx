import React from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCartStore } from '@chinooz/state'

export default function TopBar() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const count = useCartStore(s => s.count)

  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="bg-white border-b border-border px-4 pb-3"
    >
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text className="text-xl font-bold text-primary">Chinooz</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/search')}
          className="flex-1 mx-3 bg-background rounded-xl px-3 py-2.5 flex-row items-center"
          activeOpacity={0.7}
        >
          <Text className="text-text-muted text-sm">Search products...</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/cart')}
          className="relative w-11 h-11 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl">🛒</Text>
          {count > 0 && (
            <View className="absolute -top-1 -right-1 bg-error rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
              <Text className="text-white text-[10px] font-bold">{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
