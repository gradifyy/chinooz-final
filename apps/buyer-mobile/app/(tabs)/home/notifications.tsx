import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from '@chinooz/ui'

const notifications = [
  {
    id: '1',
    type: 'order',
    title: 'Order Delivered!',
    body: 'Your order #ord-1 has been delivered successfully.',
    time: '2 days ago',
    read: false,
  },
  {
    id: '2',
    type: 'deal',
    title: 'Flash Sale Live!',
    body: 'Up to 50% off on electronics. Hurry, offers end soon!',
    time: '1 day ago',
    read: true,
  },
]

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold text-gray-900">Notifications</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications" subtitle="We'll notify you about orders and deals" />
        ) : (
          notifications.map(n => (
            <View
              key={n.id}
              className={`bg-white rounded-xl p-4 mb-2 ${!n.read ? 'border-l-4 border-[#8A1B57]' : ''}`}
              style={{ elevation: 1 }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-semibold text-gray-900">{n.title}</Text>
                <Text className="text-xs text-gray-400">{n.time}</Text>
              </View>
              <Text className="text-xs text-gray-500">{n.body}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
