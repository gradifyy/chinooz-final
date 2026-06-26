import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authStore } from '@chinooz/state'

const menuItems = [
  { id: 'orders', icon: '📋', label: 'My Orders', route: '/(tabs)/profile/orders' as const },
  { id: 'wishlist', icon: '❤️', label: 'My Wishlist', route: '/(tabs)/profile/wishlist' as const },
  { id: 'addresses', icon: '📍', label: 'My Addresses', route: '/(tabs)/profile/addresses' as const },
  { id: 'notifications', icon: '🔔', label: 'Notifications', route: '/(tabs)/home/notifications' as const },
  { id: 'settings', icon: '⚙️', label: 'Settings', route: '/(tabs)/profile/settings' as const },
]

export default function ProfileScreen() {
  const router = useRouter()
  const user = authStore(s => s.user)

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="items-center py-6">
          <View className="w-20 h-20 rounded-full bg-[#F8EAF1] items-center justify-center mb-3">
            <Text className="text-3xl">👤</Text>
          </View>
          {user ? (
            <>
              <Text className="text-lg font-bold text-gray-900">{user.name}</Text>
              <Text className="text-sm text-gray-500">{user.phone}</Text>
            </>
          ) : (
            <>
              <Text className="text-lg font-bold text-gray-900">Welcome!</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/phone')}
                className="mt-3 bg-[#8A1B57] px-6 py-2 rounded-full"
              >
                <Text className="text-white font-semibold text-sm">Log In / Sign Up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push(item.route)}
            className={`flex-row items-center bg-white rounded-xl px-4 py-3.5 ${index < menuItems.length - 1 ? 'mb-2' : ''}`}
            style={{ elevation: 1 }}
          >
            <Text className="text-xl mr-3">{item.icon}</Text>
            <Text className="text-sm font-medium text-gray-900 flex-1">{item.label}</Text>
            <Text className="text-gray-300">→</Text>
          </TouchableOpacity>
        ))}

        {user && (
          <TouchableOpacity
            onPress={() => authStore.getState().logout()}
            className="mt-4 items-center"
          >
            <Text className="text-sm text-red-500 font-medium">Log Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
