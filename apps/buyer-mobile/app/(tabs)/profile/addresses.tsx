import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authStore } from '@chinooz/state'
import { EmptyState } from '@chinooz/ui'

export default function AddressesScreen() {
  const user = authStore(s => s.user)
  const addresses = user?.addresses ?? []

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">My Addresses</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {addresses.length === 0 ? (
          <EmptyState icon="📍" title="No addresses saved" subtitle="Add an address for faster checkout" />
        ) : (
          addresses.map(addr => (
            <View key={addr.id} className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Text className="text-sm font-semibold text-gray-900">{addr.label}</Text>
                  {addr.isDefault && (
                    <View className="ml-2 bg-[#F8EAF1] px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] text-[#8A1B57] font-semibold">Default</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text className="text-sm text-gray-600">{addr.fullName}</Text>
              <Text className="text-sm text-gray-600">{addr.phone}</Text>
              <Text className="text-sm text-gray-600">
                {addr.street}, {addr.municipality}, {addr.district}, {addr.province}
              </Text>
              <Text className="text-sm text-gray-600">Ward No: {addr.wardNo}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
