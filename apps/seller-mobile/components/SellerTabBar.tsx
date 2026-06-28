import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  withSequence,
  interpolate,
} from 'react-native-reanimated'
import { LayoutDashboard, Package, Plus, ClipboardList, Menu } from 'lucide-react-native'
import { colors, spacing, radii, fontSize, fontFamily, shadows, easing } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'

const SPRING_CONFIG = { damping: 22, stiffness: 320, mass: 0.7 }
const BADGE_SPRING = { damping: 12, stiffness: 400, mass: 0.5 }

interface TabConfig {
  key: string
  labelKey: string
  href: string
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>
  ActiveIcon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>
}

const TABS: TabConfig[] = [
  {
    key: 'dashboard',
    labelKey: 'seller.nav.dashboard',
    href: '/(tabs)/dashboard',
    Icon: LayoutDashboard,
    ActiveIcon: LayoutDashboard,
  },
  {
    key: 'products',
    labelKey: 'seller.nav.products',
    href: '/(tabs)/products',
    Icon: Package,
    ActiveIcon: Package,
  },
]

const END_TABS: TabConfig[] = [
  {
    key: 'orders',
    labelKey: 'seller.nav.orders',
    href: '/(tabs)/orders',
    Icon: ClipboardList,
    ActiveIcon: ClipboardList,
  },
  {
    key: 'more',
    labelKey: 'seller.nav.more',
    href: '/(tabs)/more',
    Icon: Menu,
    ActiveIcon: Menu,
  },
]

function BadgePill({ count, reduced, label }: { count: number; reduced: boolean; label: string }) {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (reduced || count === 0) return
    scale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withSpring(1, BADGE_SPRING),
    )
  }, [count, reduced])

  if (count === 0) return null

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      style={[styles.badge, animStyle]}
      accessibilityLabel={label}
    >
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  )
}

function TabItem({
  tab,
  active,
  reduced,
  onPress,
  badgeCount,
  badgeLabel,
}: {
  tab: TabConfig
  active: boolean
  reduced: boolean
  onPress: () => void
  badgeCount?: number
  badgeLabel?: string
}) {
  const { t } = useTranslation()
  const Icon = active ? tab.ActiveIcon : tab.Icon
  const color = active ? colors.primary : '#6B7280'

  const scale = useSharedValue(1)
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    if (reduced) return
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 })
  }
  const handlePressOut = () => {
    if (reduced) return
    scale.value = withSpring(1, SPRING_CONFIG)
  }

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(tab.labelKey)}
      aria-current={active ? 'page' : undefined}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.tabIconWrap, scaleStyle]}>
        <Icon size={24} color={color} strokeWidth={active ? 2.5 : 2} fill={active ? colors.primary : 'none'} />
        {badgeCount != null && badgeCount > 0 && (
          <BadgePill count={badgeCount} reduced={reduced} label={badgeLabel ?? ''} />
        )}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: active ? colors.primary : '#6B7280' },
          active && styles.tabLabelActive,
        ]}
        numberOfLines={1}
      >
        {t(tab.labelKey)}
      </Text>
    </TouchableOpacity>
  )
}

function CenterAddButton({ reduced, onPress }: { reduced: boolean; onPress: () => void }) {
  const { t } = useTranslation()
  const scale = useSharedValue(1)
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    if (reduced) return
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 })
  }
  const handlePressOut = () => {
    if (reduced) return
    scale.value = withSpring(1, SPRING_CONFIG)
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t('seller.nav.addAria')}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      style={styles.centerAddOuter}
    >
      <Animated.View
        style={[styles.centerAddInner, scaleStyle]}
      >
        <Plus size={28} color={colors.white} strokeWidth={2.5} />
      </Animated.View>
    </TouchableOpacity>
  )
}

export function SellerTabBar({ onAddPress }: { onAddPress: () => void }) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()

  const newOrderCount = 2
  const moreUnread = 1

  const isActive = (href: string) => {
    const seg = href.replace('/(tabs)/', '')
    return pathname.startsWith(`/${seg}`) || pathname.startsWith(`/tabs/${seg}`)
  }

  const handleTabPress = (href: string) => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    router.push(href as any)
  }

  const barHeight = 56 + (Platform.OS === 'ios' ? insets.bottom : 8)

  return (
    <View
      style={[styles.bar, { height: barHeight, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 }]}
      accessibilityRole="tablist"
    >
      {TABS.map(tab => (
        <TabItem
          key={tab.key}
          tab={tab}
          active={isActive(tab.href)}
          reduced={reducedMotion}
          onPress={() => handleTabPress(tab.href)}
        />
      ))}

      <View style={styles.centerSlot}>
        <CenterAddButton reduced={reducedMotion} onPress={onAddPress} />
      </View>

      {END_TABS.map(tab => (
        <TabItem
          key={tab.key}
          tab={tab}
          active={isActive(tab.href)}
          reduced={reducedMotion}
          onPress={() => handleTabPress(tab.href)}
          badgeCount={tab.key === 'orders' ? newOrderCount : tab.key === 'more' ? moreUnread : undefined}
          badgeLabel={
            tab.key === 'orders'
              ? t('seller.nav.newOrders', { count: newOrderCount })
              : tab.key === 'more'
                ? t('seller.nav.unreadMore', { count: moreUnread })
                : undefined
          }
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 6,
    ...shadows.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  tabLabelActive: {
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  centerSlot: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAddOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    marginTop: -16,
  },
  centerAddInner: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radii.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
