import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authStore } from '@chinooz/state'

export default function SettingsScreen() {
  const locale = authStore(s => s.locale)
  const setLocale = authStore(s => s.setLocale)
  const [notifications, setNotifications] = React.useState(true)

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-white rounded-xl mb-3" style={{ elevation: 1 }}>
          <View className="px-4 py-3.5 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-900">Language</Text>
            <TouchableOpacity
              onPress={() => setLocale(locale === 'en' ? 'ne' : 'en')}
              className="bg-[#F8EAF1] px-3 py-1 rounded-full"
            >
              <Text className="text-sm text-[#8A1B57] font-semibold">
                {locale === 'en' ? 'English' : 'नेपाली'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-white rounded-xl mb-3" style={{ elevation: 1 }}>
          <View className="px-4 py-3.5 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-900">Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E5E5E5', true: '#B23C7E' }}
              thumbColor={notifications ? '#8A1B57' : '#f4f3f4'}
            />
          </View>
        </View>

        {[
          { label: 'About Chinooz', value: 'v1.0.0' },
          { label: 'Privacy Policy', value: undefined },
          { label: 'Terms of Service', value: undefined },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            className={`bg-white rounded-xl px-4 py-3.5 flex-row items-center justify-between ${i < 2 ? 'mb-2' : ''}`}
            style={{ elevation: 1 }}
          >
            <Text className="text-sm font-medium text-gray-900">{item.label}</Text>
            <View className="flex-row items-center">
              {item.value && <Text className="text-xs text-gray-400 mr-2">{item.value}</Text>}
              <Text className="text-gray-300">→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
