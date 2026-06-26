import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cartStore } from '@chinooz/state'
import { formatNPR } from '@chinooz/utils'

const paymentMethods = [
  { id: 'cod', name: 'Cash on Delivery', icon: '💵' },
  { id: 'khalti', name: 'Khalti', icon: '🔵' },
  { id: 'esewa', name: 'eSewa', icon: '🟢' },
  { id: 'connectIPS', name: 'Connect IPS', icon: '🏦' },
]

export default function CheckoutScreen() {
  const router = useRouter()
  const items = cartStore(s => s.items)
  const total = cartStore(s => s.total())
  const clearCart = cartStore(s => s.clearCart)
  const [selectedPayment, setSelectedPayment] = useState('cod')
  const [placed, setPlaced] = useState(false)

  const handlePlaceOrder = () => {
    setPlaced(true)
    clearCart()
  }

  if (placed) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center px-8">
        <Text className="text-6xl mb-4">✅</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">Order Placed Successfully!</Text>
        <Text className="text-sm text-gray-500 text-center mt-2">You'll receive a confirmation shortly.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          className="mt-6 bg-[#8A1B57] py-3 px-8 rounded-xl"
        >
          <Text className="text-white font-semibold">Continue Shopping</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-4 pt-2 pb-3 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-gray-700">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Checkout</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
          <Text className="text-sm font-semibold text-gray-900 mb-2">Delivery Address</Text>
          <Text className="text-sm text-gray-500">Baneshwor Height, Kathmandu</Text>
          <Text className="text-sm text-gray-500">Ayush Chaudhary - 9841234567</Text>
        </View>

        <View className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
          <Text className="text-sm font-semibold text-gray-900 mb-3">Payment Method</Text>
          {paymentMethods.map(pm => (
            <TouchableOpacity
              key={pm.id}
              onPress={() => setSelectedPayment(pm.id)}
              className={`flex-row items-center py-3 border-b border-gray-50 ${selectedPayment === pm.id ? '' : ''}`}
            >
              <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                selectedPayment === pm.id ? 'border-[#8A1B57]' : 'border-gray-300'
              }`}>
                {selectedPayment === pm.id && <View className="w-3 h-3 rounded-full bg-[#8A1B57]" />}
              </View>
              <Text className="text-xl mr-2">{pm.icon}</Text>
              <Text className="text-sm text-gray-900">{pm.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
          <Text className="text-sm font-semibold text-gray-900 mb-2">Order Summary</Text>
          {items.map(item => (
            <View key={item.productId} className="flex-row items-center justify-between py-1.5">
              <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>{item.product.name} x{item.quantity}</Text>
              <Text className="text-sm text-gray-900">{formatNPR(item.product.price * item.quantity)}</Text>
            </View>
          ))}
          <View className="border-t border-gray-100 mt-2 pt-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">Subtotal</Text>
              <Text className="text-sm text-gray-900">{formatNPR(total)}</Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-sm text-gray-600">Shipping</Text>
              <Text className="text-sm text-green-600">Free</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 py-3 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handlePlaceOrder}
          className="bg-[#8A1B57] py-3 rounded-xl"
        >
          <Text className="text-white text-center font-semibold text-base">
            Place Order • {formatNPR(total)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
