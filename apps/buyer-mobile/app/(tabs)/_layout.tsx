import { Tabs, useRouter } from 'expo-router'
import { View, Text, TouchableOpacity } from 'react-native'
import { CartBadge } from '@chinooz/ui'

export default function TabLayout() {
  const router = useRouter()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#8A1B57',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="categories/index"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🧭</Text>,
        }}
      />
      <Tabs.Screen
        name="deals/index"
        options={{
          title: 'Deals',
          tabBarIcon: ({ color }) => (
            <View className="relative">
              <View className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#8A1B57] rounded-full items-center justify-center shadow-lg" style={{ elevation: 6 }}>
                <Text style={{ fontSize: 22, color: '#FFFFFF' }}>🔥</Text>
              </View>
              <View className="mt-5" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox/index"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📥</Text>,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}
