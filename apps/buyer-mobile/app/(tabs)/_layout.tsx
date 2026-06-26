import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TopBar from '../../components/TopBar'

function TabIcon({ label, focused, isCenter }: { label: string; focused: boolean; isCenter?: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Categories: '📂',
    Deals: '🔥',
    Inbox: '💬',
    Profile: '👤',
  }

  if (isCenter) {
    return (
      <View
        style={[
          styles.centerTab,
          focused && styles.centerTabActive,
        ]}
      >
        <Text style={styles.centerIcon}>{icons[label]}</Text>
        <Text style={[styles.centerLabel, focused && styles.centerLabelActive]}>
          {label}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.tabItem}>
      <Text style={[styles.icon, focused && styles.iconActive]}>{icons[label]}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <>
      <TopBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E5E5',
            borderTopWidth: 1,
            height: 60 + (Platform.OS === 'ios' ? insets.bottom : 8),
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
            paddingTop: 6,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Categories" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="deals"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Deals" focused={focused} isCenter />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Inbox" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Profile" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </>
  )
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  labelActive: {
    color: '#8A1B57',
    fontWeight: '700',
  },
  centerTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8EAF1',
    marginTop: -20,
    shadowColor: '#8A1B57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  centerTabActive: {
    backgroundColor: '#8A1B57',
  },
  centerIcon: {
    fontSize: 22,
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A1B57',
    marginTop: 1,
  },
  centerLabelActive: {
    color: '#FFFFFF',
  },
})
