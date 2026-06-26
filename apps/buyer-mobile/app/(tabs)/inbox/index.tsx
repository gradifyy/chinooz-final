import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from '@chinooz/ui'

const threads = [
  {
    id: 'ai-assistant',
    name: 'Chinooz AI Assistant',
    avatar: '🤖',
    lastMessage: 'Hello! How can I help you today?',
    time: 'Just now',
    unread: 1,
    isAI: true,
  },
  {
    id: 'ord-1',
    name: 'Order Update',
    avatar: '📦',
    lastMessage: 'Your order #ord-1 has been delivered!',
    time: '2d ago',
    unread: 0,
  },
]

export default function InboxScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Inbox</Text>
      </View>

      {threads.length === 0 ? (
        <EmptyState icon="📥" title="No messages yet" subtitle="Messages from sellers and Chinooz will appear here" />
      ) : (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {threads.map(thread => (
            <TouchableOpacity
              key={thread.id}
              onPress={() => router.push(`/(tabs)/inbox/${thread.id}`)}
              className="flex-row items-center bg-white rounded-xl p-3 mb-2"
              style={{ elevation: 1 }}
            >
              <View className="w-12 h-12 rounded-full bg-[#F8EAF1] items-center justify-center">
                <Text className="text-xl">{thread.avatar}</Text>
              </View>
              <View className="flex-1 ml-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-gray-900">{thread.name}</Text>
                  <Text className="text-xs text-gray-400">{thread.time}</Text>
                </View>
                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{thread.lastMessage}</Text>
              </View>
              {thread.unread > 0 && (
                <View className="ml-2 bg-[#8A1B57] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold">{thread.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
