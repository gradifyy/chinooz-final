import React from 'react'
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cartStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'
import { EmptyState } from '@chinooz/ui'

export default function CartScreen() {
  const router = useRouter()
  const items = cartStore(s => s.items)
  const updateQuantity = cartStore(s => s.updateQuantity)
  const removeItem = cartStore(s => s.removeItem)
  const total = cartStore(s => s.total())

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">Shopping Cart</Text>
        <Text className="text-sm text-gray-500">{items.length} items</Text>
      </View>

      {items.length === 0 ? (
        <EmptyState icon="🛒" title="Your cart is empty" subtitle="Start shopping to add items" />
      ) : (
        <>
          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {items.map(item => (
              <View key={item.productId} className="bg-white rounded-xl p-3 mb-2 flex-row" style={{ elevation: 1 }}>
                <Image
                  source={{ uri: item.product.images[0] }}
                  className="w-20 h-20 rounded-lg"
                  resizeMode="cover"
                />
                <View className="flex-1 ml-3 justify-between">
                  <View>
                    <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{item.product.name}</Text>
                    <Text className="text-sm font-bold text-[#8A1B57] mt-1">{formatNPR(item.product.price)}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center bg-gray-100 rounded-lg">
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-3 py-1"
                      >
                        <Text className="text-gray-600">−</Text>
                      </TouchableOpacity>
                      <Text className="text-sm font-semibold text-gray-900 px-2">{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-3 py-1"
                      >
                        <Text className="text-gray-600">+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(item.productId)}>
                      <Text className="text-xs text-red-500">Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-4 py-3 bg-white border-t border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900">Total</Text>
              <Text className="text-lg font-bold text-[#8A1B57]">{formatNPR(total)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/cart/checkout')}
              className="bg-[#8A1B57] py-3 rounded-xl"
            >
              <Text className="text-white text-center font-semibold text-base">Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}
