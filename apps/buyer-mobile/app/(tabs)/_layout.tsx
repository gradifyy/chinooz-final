import { Tabs, usePathname, useRouter } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { useEffect, createContext, useContext, useCallback } from 'react'
import TopBar from '../../components/TopBar'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { useUnreadNotificationCount, useUnreadMessageCount } from '@chinooz/hooks'
import { colors, radii } from '@chinooz/theme'

export const ScrollContext = createContext<{ scrollY: any; scrollToTop: () => void }>({
  scrollY: { value: 0 },
  scrollToTop: () => {},
})

export function useHomeScroll() {
  return useContext(ScrollContext)
}

const homeScrollY = { value: 0 } as any
let scrollToTopFn: (() => void) | null = null

export function getHomeScrollHandlers() {
  return {
    scrollY: homeScrollY,
    scrollToTop: () => scrollToTopFn?.(),
    setScrollToTop: (fn: () => void) => { scrollToTopFn = fn },
  }
}

const tabKeys: Record<string, string> = {
  Home: 'nav.home',
  Categories: 'nav.categories',
  Deals: 'nav.deals',
  Inbox: 'nav.inbox',
  Profile: 'nav.profile',
}

const tabIcons: Record<string, string> = {
  Home: '🏠',
  Categories: '📂',
  Deals: '🔥',
  Inbox: '💬',
  Profile: '👤',
}

function TabIcon({ label, focused, isCenter }: { label: string; focused: boolean; isCenter?: boolean }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const { data: notifCount } = useUnreadNotificationCount()
  const { data: msgCount } = useUnreadMessageCount()
  const totalUnread = (notifCount ?? 0) + (msgCount ?? 0)

  if (isCenter) {
    return (
      <DealsTab label={t(tabKeys[label])} focused={focused} icon={tabIcons[label]} reduced={reduced} />
    )
  }

  return (
    <View style={styles.tabItem}>
      <View>
        <Text style={[styles.icon, focused && styles.iconActive]}>{tabIcons[label]}</Text>
        {label === 'Inbox' && totalUnread > 0 && (
          <InboxBadge count={totalUnread} reduced={reduced} />
        )}
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{t(tabKeys[label])}</Text>
    </View>
  )
}

function InboxBadge({ count, reduced }: { count: number; reduced: boolean }) {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (reduced) return
    scale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withSpring(1, { damping: 10, stiffness: 400 }),
    )
  }, [count])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      style={[styles.navBadge, animStyle]}
      accessibilityLabel={`${count} unread`}
    >
      <Text style={styles.navBadgeText}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  )
}

function DealsTab({ label, focused, icon, reduced }: { label: string; focused: boolean; icon: string; reduced: boolean }) {
  const glow = useSharedValue(0.2)

  useEffect(() => {
    if (reduced) {
      glow.value = 0.3
      return
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )
  }, [reduced])

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: focused ? 0.35 : glow.value,
  }))

  return (
    <Animated.View
      style={[
        styles.centerTab,
        focused && styles.centerTabActive,
        glowStyle,
      ]}
    >
      <Text style={styles.centerIcon}>{icon}</Text>
      <Text style={[styles.centerLabel, focused && styles.centerLabelActive]}>
        {label}
      </Text>
    </Animated.View>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const { scrollY, scrollToTop, setScrollToTop } = getHomeScrollHandlers()

  return (
    <>
      <AnimatedTopBar scrollY={scrollY} />
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
        screenListeners={{
          tabPress: (e) => {
            if (e.target?.startsWith('index')) {
              setTimeout(() => scrollToTop(), 50)
            }
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Categories" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="deals"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Deals" focused={focused} isCenter />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Inbox" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
          }}
        />
      </Tabs>
    </>
  )
}

function AnimatedTopBar({ scrollY }: { scrollY: any }) {
  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: scrollY.value > 10 ? 0.08 : 0,
    shadowRadius: scrollY.value > 10 ? 8 : 0,
    elevation: scrollY.value > 10 ? 3 : 0,
  }))

  return (
    <Animated.View style={[{ zIndex: 30 }, shadowStyle]}>
      <TopBar />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  icon: { fontSize: 20, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, fontWeight: '500', color: '#6B7280', marginTop: 2 },
  labelActive: { color: '#8A1B57', fontWeight: '700' },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.error,
    borderRadius: radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
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
    shadowRadius: 12,
    elevation: 6,
  },
  centerTabActive: { backgroundColor: '#8A1B57' },
  centerIcon: { fontSize: 22 },
  centerLabel: { fontSize: 9, fontWeight: '700', color: '#8A1B57', marginTop: 1 },
  centerLabelActive: { color: '#FFFFFF' },
})
