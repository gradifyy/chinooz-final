import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import type { SharedValue } from 'react-native-reanimated'
import { useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { useAppTheme } from '../../components/ThemeProvider'
import Icon, { type IconName } from '../../components/Icon'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { useUnreadNotificationCount, useUnreadMessageCount } from '@chinooz/hooks'
import { colors as lightColors, radii, fontSz, duration } from '@chinooz/theme'

interface ScrollContextValue {
  scrollY: SharedValue<number>
  scrollToTop: () => void
  setScrollToTop: (fn: () => void) => void
  viewportHeight: number
}

export const ScrollContext = createContext<ScrollContextValue>({
  scrollY: { value: 0 } as unknown as SharedValue<number>,
  scrollToTop: () => {},
  setScrollToTop: () => {},
  viewportHeight: 800,
})

export function useHomeScroll() {
  return useContext(ScrollContext)
}

function TabIcon({
  label,
  focused,
  isCenter,
  unreadCount = 0,
}: {
  label: string
  focused: boolean
  isCenter?: boolean
  unreadCount?: number
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const totalUnread = unreadCount

  const iconMap: Record<string, { name: IconName; activeName: IconName }> = {
    Home: { name: 'home-outline', activeName: 'home' },
    Categories: { name: 'grid-outline', activeName: 'grid' },
    Deals: { name: 'flame-outline', activeName: 'flame' },
    Inbox: { name: 'chatbubble-outline', activeName: 'chatbubble' },
    Profile: { name: 'person-outline', activeName: 'person' },
  }

  const tabKeys: Record<string, string> = {
    Home: 'nav.home',
    Categories: 'nav.categories',
    Deals: 'nav.deals',
    Inbox: 'nav.inbox',
    Profile: 'nav.profile',
  }

  if (isCenter) {
    return (
      <DealsTab
        label={t(tabKeys[label])}
        focused={focused}
        iconName={iconMap[label]?.name ?? 'flame-outline'}
        activeIconName={iconMap[label]?.activeName ?? 'flame'}
        reduced={reduced}
      />
    )
  }

  return (
    <TabIconInner
      label={t(tabKeys[label])}
      focused={focused}
      iconName={iconMap[label]?.name ?? 'home-outline'}
      activeIconName={iconMap[label]?.activeName ?? 'home'}
      showBadge={label === 'Inbox' && totalUnread > 0}
      unreadCount={totalUnread}
      reduced={reduced}
    />
  )
}

function TabIconInner({
  label,
  focused,
  iconName,
  activeIconName,
  showBadge,
  unreadCount,
  reduced,
}: {
  label: string
  focused: boolean
  iconName: IconName
  activeIconName: IconName
  showBadge: boolean
  unreadCount: number
  reduced: boolean
}) {
  const { colors } = useAppTheme()
  const bounce = useSharedValue(0)
  const pill = useSharedValue(focused ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      pill.value = focused ? 1 : 0
      return
    }
    pill.value = withTiming(focused ? 1 : 0, { duration: 220 })
    if (focused) {
      bounce.value = withSequence(
        withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 9, stiffness: 400 }),
      )
    }
  }, [focused, reduced, bounce, pill])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bounce.value * 5 }, { scale: 1 + bounce.value * 0.16 }],
  }))
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pill.value,
    transform: [{ scale: 0.6 + pill.value * 0.4 }],
  }))

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[styles.activePill, { backgroundColor: colors.primary50 }, pillStyle]}
          pointerEvents="none"
        />
        <Animated.View style={iconStyle}>
          <Icon
            name={focused ? activeIconName : iconName}
            size={22}
            color={focused ? colors.primary : colors.textMuted}
          />
        </Animated.View>
        {showBadge && <InboxBadge count={unreadCount} reduced={reduced} />}
      </View>
      <Text
        style={[
          styles.label,
          { color: focused ? colors.primary : colors.textMuted },
          focused && styles.labelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

function InboxBadge({ count, reduced }: { count: number; reduced: boolean }) {
  const { t } = useTranslation()
  const scale = useSharedValue(1)

  useEffect(() => {
    if (reduced) return
    scale.value = withSequence(
      withTiming(1.3, { duration: duration.fast }),
      withSpring(1, { damping: 10, stiffness: 400 }),
    )
  }, [count, reduced, scale])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      style={[styles.navBadge, animStyle]}
      accessibilityLabel={t('a11y.unreadCount', { count })}
    >
      <Text style={styles.navBadgeText}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  )
}

function DealsTab({
  label,
  focused,
  iconName,
  activeIconName,
  reduced,
}: {
  label: string
  focused: boolean
  iconName: IconName
  activeIconName: IconName
  reduced: boolean
}) {
  const { colors } = useAppTheme()
  // Soft static elevation only — perpetual glow was decorative noise (P2).
  const scale = useSharedValue(focused ? 1 : 0.96)

  useEffect(() => {
    if (reduced) {
      scale.value = 1
      return
    }
    scale.value = withSpring(focused ? 1 : 0.96, { damping: 16, stiffness: 320 })
  }, [focused, reduced, scale])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: focused ? 0.28 : 0.12,
  }))

  return (
    <Animated.View
      style={[
        styles.centerTab,
        {
          backgroundColor: focused ? colors.primary : colors.primary50,
          shadowColor: colors.primary,
        },
        animStyle,
      ]}
    >
      <Icon
        name={focused ? activeIconName : iconName}
        size={22}
        color={focused ? colors.white : colors.primary}
      />
      <Text style={[styles.centerLabel, { color: focused ? colors.white : colors.primary }]}>
        {label}
      </Text>
    </Animated.View>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const { colors } = useAppTheme()
  // Subscribe once here (not per-tab-icon) so unread-count changes don't
  // re-render all five tab icons.
  const { data: notifCount } = useUnreadNotificationCount()
  const { data: msgCount } = useUnreadMessageCount()
  const totalUnread = (notifCount ?? 0) + (msgCount ?? 0)
  const scrollY = useSharedValue(0)
  const scrollToTopRef = useRef<(() => void) | null>(null)

  const scrollToTop = useCallback(() => {
    scrollToTopRef.current?.()
  }, [])

  const setScrollToTop = useCallback((fn: () => void) => {
    scrollToTopRef.current = fn
  }, [])

  return (
    <ScrollContext.Provider value={{ scrollY, scrollToTop, setScrollToTop, viewportHeight: 800 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            // Soft elevated bar — full blur needs expo-blur; hairline + surface is the system fallback
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 60 + (Platform.OS === 'ios' ? insets.bottom : 8),
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
            paddingTop: 6,
          },
          tabBarShowLabel: false,
        }}
        screenListeners={{
          tabPress: e => {
            Haptics.selectionAsync().catch(() => {})
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
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Inbox" focused={focused} unreadCount={totalUnread} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
          }}
        />
      </Tabs>
    </ScrollContext.Provider>
  )
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  iconWrap: {
    width: 46,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    width: 44,
    height: 30,
    borderRadius: 12,
  },
  label: {
    fontSize: fontSz('xs')[0],
    fontWeight: '500',
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '700',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: lightColors.error,
    borderRadius: radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    fontSize: fontSz('xs')[0],
    fontWeight: '600',
    color: lightColors.white,
  },
  centerTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: radii['2xl'],
    marginTop: -20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  centerTabActive: {},
  centerLabel: {
    fontSize: fontSz('2xs')[0],
    fontWeight: '700',
    marginTop: 1,
  },
})
