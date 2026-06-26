import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const aiMessages = [
  { id: '1', text: "Hello! I'm the Chinooz AI assistant. How can I help you today?", isUser: false },
  { id: '2', text: 'You can ask me about products, track your orders, or get recommendations!', isUser: false },
]

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(threadId === 'ai-assistant' ? aiMessages : [])

  const sendMessage = () => {
    if (!message.trim()) return
    setMessages(prev => [...prev, { id: String(Date.now()), text: message, isUser: true }])
    setMessage('')
    if (threadId === 'ai-assistant') {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { id: String(Date.now()), text: "Thanks for your message! I'm here to help with your shopping needs.", isUser: false },
        ])
      }, 1000)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-gray-700">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          {threadId === 'ai-assistant' ? 'Chinooz AI Assistant' : 'Support'}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 16 }}>
          {messages.map(msg => (
            <View
              key={msg.id}
              className={`max-w-[80%] mb-3 ${msg.isUser ? 'self-end' : 'self-start'}`}
            >
              <View
                className={`rounded-2xl px-4 py-2.5 ${
                  msg.isUser ? 'bg-[#8A1B57] rounded-tr-sm' : 'bg-white rounded-tl-sm border border-gray-100'
                }`}
              >
                <Text className={`text-sm ${msg.isUser ? 'text-white' : 'text-gray-900'}`}>{msg.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="flex-row items-center px-4 py-2 border-t border-gray-100 bg-white">
          <TextInput
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 mr-2"
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            onPress={sendMessage}
            className="bg-[#8A1B57] w-10 h-10 rounded-full items-center justify-center"
          >
            <Text className="text-white text-lg">↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
