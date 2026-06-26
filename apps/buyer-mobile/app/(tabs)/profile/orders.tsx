import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { EmptyState, Shimmer } from '@chinooz/ui'
import { formatNPR, formatDate } from '@chinooz/utils'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
}

export default function OrdersScreen() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'user-1'],
    queryFn: () => api.getUserOrders('user-1'),
  })

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold text-gray-900">My Orders</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View>
            {[1, 2, 3].map(i => <Shimmer key={i} width="100%" height={140} borderRadius={12} className="mb-3" />)}
          </View>
        ) : orders && orders.length > 0 ? (
          orders.map(order => (
            <View key={order.id} className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-gray-400">#{order.id}</Text>
                <View className={`px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                  <Text className="text-xs font-semibold capitalize">{order.status}</Text>
                </View>
              </View>
              {order.items.map(item => (
                <View key={item.productId} className="flex-row items-center py-1.5">
                  <Text className="text-sm text-gray-900 flex-1" numberOfLines={1}>{item.productName} x{item.quantity}</Text>
                  <Text className="text-sm text-gray-700">{formatNPR(item.price * item.quantity)}</Text>
                </View>
              ))}
              <View className="border-t border-gray-100 mt-2 pt-2 flex-row items-center justify-between">
                <Text className="text-xs text-gray-400">{formatDate(order.createdAt)}</Text>
                <Text className="text-sm font-bold text-[#8A1B57]">{formatNPR(order.total)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState icon="📋" title="No orders yet" subtitle="Your order history will appear here" />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
