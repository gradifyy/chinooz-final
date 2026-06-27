import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  AppState,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  Layout,
} from 'react-native-reanimated'
import NetInfo from '@react-native-community/netinfo'
import { colors, radii, spacing, duration, easing } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { getOrders } from '@chinooz/mock-data'
import { useSessionStore } from '@chinooz/state'
import { useQueryClient } from '@tanstack/react-query'
import type { Order, OrderStatus } from '@chinooz/types'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import EmptyState from '@chinooz/ui/EmptyState'
import { OrderCardSkeleton } from '../../components/Skeletons'

type TabKey = 'all' | 'to_pay' | 'processing' | 'shipped' | 'delivered' | 'cancelled_returned'

interface TabDef {
  key: TabKey
  labelKey: string
  statuses: OrderStatus[]
}

const TABS: TabDef[] = [
  { key: 'all', labelKey: 'orders.tabAll', statuses: [] },
  { key: 'to_pay', labelKey: 'orders.tabToPay', statuses: ['pending', 'confirmed'] },
  { key: 'processing', labelKey: 'orders.tabProcessing', statuses: ['processing'] },
  { key: 'shipped', labelKey: 'orders.tabShipped', statuses: ['shipped'] },
  { key: 'delivered', labelKey: 'orders.tabDelivered', statuses: ['delivered'] },
  { key: 'cancelled_returned', labelKey: 'orders.tabCancelledReturned', statuses: ['cancelled', 'returned'] },
]

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warning },
  confirmed: { bg: colors.infoLight, text: colors.info },
  processing: { bg: '#F3E8FF', text: '#7C3AED' },
  shipped: { bg: '#E0F2FE', text: '#0284C7' },
  delivered: { bg: colors.successLight, text: colors.success },
  cancelled: { bg: colors.errorLight, text: colors.error },
  returned: { bg: '#FEF3C7', text: '#D97706' },
}

const VALID_TABS: TabKey[] = TABS.map(t => t.key)

function CountBadge({ count, active }: { count: number; active: boolean }) {
  const scale = useSharedValue(1)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (count > 0 && !reduced) {
      scale.value = withSpring(1.3, { damping: 8, stiffness: 400 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 })
      })
    }
  }, [count])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (count === 0) return null

  return (
    <Animated.View
      style={[styles.badge, active && styles.badgeActive, animStyle]}
      accessibilityLabel={`${count} orders`}
    >
      <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count}</Text>
    </Animated.View>
  )
}

function SegmentControl({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: TabKey
  onTabChange: (key: TabKey) => void
  counts: Record<TabKey, number>
}) {
  const { t } = useTranslation()
  const indicatorX = useSharedValue(0)
  const indicatorW = useSharedValue(0)
  const tabWidths = useRef<Record<string, number>>({})
  const tabPositions = useRef<Record<string, number>>({})
  const reduced = useReducedMotion()

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }))

  const handleTabLayout = (key: TabKey, event: any) => {
    const { width, x } = event.nativeEvent.layout
    tabWidths.current[key] = width
    tabPositions.current[key] = x
    if (key === activeTab) {
      indicatorX.value = x
      indicatorW.value = width
    }
  }

  const handlePress = (key: TabKey) => {
    const pos = tabPositions.current[key] ?? 0
    const w = tabWidths.current[key] ?? 0
    if (reduced) {
      indicatorX.value = pos
      indicatorW.value = w
    } else {
      indicatorX.value = withSpring(pos, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      })
      indicatorW.value = withSpring(w, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      })
    }
    onTabChange(key)
  }

  useEffect(() => {
    const pos = tabPositions.current[activeTab] ?? 0
    const w = tabWidths.current[activeTab] ?? 0
    if (reduced) {
      indicatorX.value = pos
      indicatorW.value = w
    } else {
      indicatorX.value = withSpring(pos, { damping: 20, stiffness: 300, mass: 0.8 })
      indicatorW.value = withSpring(w, { damping: 20, stiffness: 300, mass: 0.8 })
    }
  }, [activeTab])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.segmentContainer}
      accessibilityRole="tablist"
    >
      <View style={styles.segmentTrack}>
        <Animated.View
          style={[styles.segmentIndicator, indicatorStyle]}
        />
        {TABS.map(tab => {
          const isActive = tab.key === activeTab
          const count = counts[tab.key]
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handlePress(tab.key)}
              onLayout={(e) => handleTabLayout(tab.key, e)}
              style={styles.segmentTab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                {t(tab.labelKey)}
              </Text>
              <CountBadge count={count} active={isActive} />
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}

function SellerBreakdown({ order }: { order: Order }) {
  const { t } = useTranslation()
  const sellers = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const item of order.items) {
      const name = item.name.split(' — ')[0] || item.name
      const existing = map.get(name)
      if (existing) {
        existing.count += item.quantity
      } else {
        map.set(name, { name, count: item.quantity })
      }
    }
    return [...map.values()]
  }, [order.items])

  if (sellers.length <= 1) return null

  return (
    <View style={styles.sellerBox}>
      <Text style={styles.sellerTitle}>{t('orders.subOrders')}</Text>
      {sellers.map(s => (
        <Text key={s.name} style={styles.sellerRow}>
          {t('orders.soldBy')}: {s.name} ({s.count} {s.count === 1 ? t('orders.item') : t('orders.items')})
        </Text>
      ))}
    </View>
  )
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { t } = useTranslation()
  const statusStyle = STATUS_COLORS[order.status]
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const firstItem = order.items[0]

  const statusLabel = t(`orders.${order.status}`)

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.id}, ${statusLabel}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>{order.id.toUpperCase()}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.itemRow}>
          <View style={styles.itemThumb}>
            <Text style={styles.itemThumbText}>
              {firstItem.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {firstItem.name}
            </Text>
            {order.items.length > 1 && (
              <Text style={styles.moreItems}>
                +{order.items.length - 1} {order.items.length - 1 === 1 ? t('orders.item') : t('orders.items')}
              </Text>
            )}
          </View>
        </View>
      </View>

      <SellerBreakdown order={order} />

      <View style={styles.cardFooter}>
        <Text style={styles.itemCount}>
          {itemCount} {itemCount === 1 ? t('orders.item') : t('orders.items')}
        </Text>
        <Text style={styles.totalText}>{formatNPR(order.total)}</Text>
      </View>

      {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned' && (
        <View style={styles.deliveryRow}>
          <Text style={styles.deliveryLabel}>{t('orders.estimatedDelivery')}</Text>
          <Text style={styles.deliveryDate}>
            {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function OrdersScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ status?: string }>()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const queryClient = useQueryClient()

  const initialTab: TabKey = (() => {
    const s = params.status
    if (s && VALID_TABS.includes(s as TabKey)) return s as TabKey
    return 'all'
  })()

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Offline detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false)
      setIsOffline(offline)
    })
    return () => unsubscribe()
  }, [])

  // Auto-recover when coming back online
  useEffect(() => {
    if (!isOffline && orders.length === 0 && !loading) {
      fetchOrders()
    }
  }, [isOffline])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setHasError(false)
    try {
      const statusParam = activeTab === 'all' ? undefined : activeTab
      const searchParam = searchQuery.trim() || undefined
      const data = await getOrders({ status: statusParam, search: searchParam })
      setOrders(data)
    } catch {
      setOrders([])
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: 0,
      to_pay: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled_returned: 0,
    }
    for (const order of orders) {
      c.all++
      if (order.status === 'pending' || order.status === 'confirmed') c.to_pay++
      if (order.status === 'processing') c.processing++
      if (order.status === 'shipped') c.shipped++
      if (order.status === 'delivered') c.delivered++
      if (order.status === 'cancelled' || order.status === 'returned') c.cancelled_returned++
    }
    return c
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders
    const tab = TABS.find(t => t.key === activeTab)
    if (!tab) return orders
    return orders.filter(o => tab.statuses.includes(o.status))
  }, [orders, activeTab])

  const getTabEmptyMessage = useCallback(() => {
    switch (activeTab) {
      case 'to_pay': return { title: t('orders.noToPayOrders'), subtitle: t('orders.noToPayOrdersNe') }
      case 'processing': return { title: t('orders.noProcessingOrders'), subtitle: t('orders.noProcessingOrdersNe') }
      case 'shipped': return { title: t('orders.noShippedOrders'), subtitle: t('orders.noShippedOrdersNe') }
      case 'delivered': return { title: t('orders.noDeliveredOrders'), subtitle: t('orders.noDeliveredOrdersNe') }
      case 'cancelled_returned': return { title: t('orders.noCancelledReturnedOrders'), subtitle: t('orders.noCancelledReturnedOrdersNe') }
      default: return { title: t('orders.noOrders'), subtitle: t('orders.noOrdersSubtitle') }
    }
  }, [activeTab, t])

  const renderOrder = useCallback(
    ({ item, index }: { item: Order; index: number }) => (
      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(index * 60).duration(duration.normal)}
        layout={reduced ? undefined : Layout.springify()}
      >
        <OrderCard
          order={item}
          onPress={() => router.push(`/orders/${item.id}`)}
        />
      </Animated.View>
    ),
    [router, reduced],
  )

  // Logged-out state
  if (!isLoggedIn) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('orders.myOrders')}</Text>
          <View style={styles.backButton} />
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>🔒</Text>}
          title={t('orders.signInPrompt')}
          action={{ label: t('orders.signIn'), onPress: () => router.push('/phone-entry') }}
        />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Offline banner */}
      {isOffline && (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(200)}
          style={styles.offlineBanner}
        >
          <View style={styles.offlineDot} />
          <Text style={styles.offlineText}>{t('orders.offlineCached')}</Text>
        </Animated.View>
      )}

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('orders.myOrders')}</Text>
        <View style={styles.backButton} />
      </View>

      <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('orders.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            accessibilityLabel={t('orders.searchPlaceholder')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={t('orders.clearSearch')}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(duration.normal)}
          style={styles.loadingContainer}
          accessibilityRole="progressbar"
          accessibilityLabel={t('common.loadingOrders')}
        >
          {[0, 1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
        </Animated.View>
      ) : hasError ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(duration.normal)}
          style={styles.errorContainer}
        >
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('orders.errorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('orders.errorSubtitle')}</Text>
          <TouchableOpacity
            onPress={fetchOrders}
            activeOpacity={0.85}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : filteredOrders.length === 0 ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(duration.slower)}
          style={styles.emptyContainer}
        >
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>{getTabEmptyMessage().title}</Text>
          <Text style={styles.emptySubtitle}>{getTabEmptyMessage().subtitle}</Text>
          {activeTab !== 'all' && (
            <TouchableOpacity
              onPress={() => setActiveTab('all')}
              activeOpacity={0.85}
              style={styles.clearTabBtn}
              accessibilityRole="button"
              accessibilityLabel={t('orders.clearTab')}
            >
              <Text style={styles.clearTabText}>{t('orders.clearTab')}</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'all' && (
            <TouchableOpacity
              onPress={() => router.push('/')}
              activeOpacity={0.85}
              style={styles.shopCta}
              accessibilityRole="button"
              accessibilityLabel={t('cart.startShopping')}
            >
              <Text style={styles.shopCtaText}>{t('cart.startShopping')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: colors.text,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  segmentContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    height: 40,
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  segmentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    height: 40,
    gap: spacing[1],
    zIndex: 1,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    zIndex: 1,
  },
  segmentLabelActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1.5],
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.white,
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 40,
  },
  searchIcon: {
    fontSize: 18,
    color: colors.textMuted,
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textMuted,
    padding: spacing[1],
  },
  loadingContainer: {
    flex: 1,
    gap: spacing[3],
    padding: spacing[4],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearTabBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  clearTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  shopCta: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  shopCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  listContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: spacing[2],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumbText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  itemInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  moreItems: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sellerBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[0.5],
  },
  sellerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[0.5],
  },
  sellerRow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  itemCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deliveryDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
})
