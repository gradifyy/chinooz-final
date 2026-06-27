import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  findNodeHandle,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import NetInfo from '@react-native-community/netinfo'
import { colors, spacing, radii, duration } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useOrderById } from '@chinooz/hooks'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { OrderStatusTimeline } from '@chinooz/ui'
import EmptyState from '@chinooz/ui/EmptyState'
import SectionReveal from '../../components/SectionReveal'
import OrderActions from '../../components/OrderActions'
import { OrderDetailSkeleton } from '../../components/Skeletons'
import type { Order, OrderStatus, CartItem, TimelineStep, ShipmentTimeline } from '@chinooz/types'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warning },
  confirmed: { bg: colors.infoLight, text: colors.info },
  processing: { bg: '#F3E8FF', text: '#7C3AED' },
  shipped: { bg: '#E0F2FE', text: '#0284C7' },
  delivered: { bg: colors.successLight, text: colors.success },
  cancelled: { bg: colors.errorLight, text: colors.error },
  returned: { bg: '#FEF3C7', text: '#D97706' },
}

function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim() || item.name
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

const ALL_STEPS = ['ordered', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const

function buildTimelineSteps(order: Order, t: (key: string) => string): TimelineStep[] {
  const timelineMap = new Map<string, { timestamp: string; note?: string }>()
  for (const entry of order.timeline) {
    timelineMap.set(entry.status, { timestamp: entry.timestamp, note: entry.note })
  }

  const isCancelled = order.status === 'cancelled'
  const isReturned = order.status === 'returned'
  const lastTimelineStatus = order.timeline[order.timeline.length - 1]?.status

  const labelMap: Record<string, string> = {
    ordered: t('orders.ordered'),
    pending: t('orders.ordered'),
    confirmed: t('orders.confirmed'),
    processing: t('orders.packed'),
    packed: t('orders.packed'),
    shipped: t('orders.shipped'),
    out_for_delivery: t('orders.outForDelivery'),
    delivered: t('orders.delivered'),
    cancelled: t('orders.cancelled'),
    returned: t('orders.returned'),
  }

  const steps: TimelineStep[] = []

  for (const stepKey of ALL_STEPS) {
    const statusKey = stepKey === 'ordered' ? 'pending' : stepKey === 'packed' ? 'processing' : stepKey
    const entry = timelineMap.get(statusKey)

    if (entry) {
      let stepStatus: 'completed' | 'current' | 'upcoming' = 'completed'
      if (statusKey === lastTimelineStatus && !isCancelled && !isReturned) {
        stepStatus = 'current'
      }
      steps.push({
        key: stepKey,
        label: labelMap[stepKey] || stepKey,
        status: stepStatus,
        timestamp: entry.timestamp,
        note: entry.note,
      })
    } else {
      const stepIndex = ALL_STEPS.indexOf(stepKey)
      const lastCompletedIndex = ALL_STEPS.indexOf(
        lastTimelineStatus === 'pending' ? 'ordered' :
        lastTimelineStatus === 'processing' ? 'packed' :
        lastTimelineStatus as typeof ALL_STEPS[number]
      )

      if (isCancelled || isReturned) {
        steps.push({
          key: stepKey,
          label: labelMap[stepKey] || stepKey,
          status: 'upcoming',
        })
      } else if (stepIndex <= lastCompletedIndex) {
        steps.push({
          key: stepKey,
          label: labelMap[stepKey] || stepKey,
          status: 'completed',
        })
      } else if (stepIndex === lastCompletedIndex + 1) {
        steps.push({
          key: stepKey,
          label: labelMap[stepKey] || stepKey,
          status: 'current',
        })
      } else {
        steps.push({
          key: stepKey,
          label: labelMap[stepKey] || stepKey,
          status: 'upcoming',
        })
      }
    }
  }

  // Add cancelled/returned as the final step if applicable
  if (isCancelled) {
    const entry = timelineMap.get('cancelled')
    steps.push({
      key: 'cancelled',
      label: labelMap['cancelled'],
      status: 'current',
      timestamp: entry?.timestamp,
      note: entry?.note,
    })
  } else if (isReturned) {
    const entry = timelineMap.get('returned')
    steps.push({
      key: 'returned',
      label: labelMap['returned'],
      status: 'current',
      timestamp: entry?.timestamp,
      note: entry?.note,
    })
  }

  return steps
}

function SubOrderCard({
  sellerName,
  items,
  index,
}: {
  sellerName: string
  items: CartItem[]
  index: number
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const sellerTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <SectionReveal delay={200 + index * 50}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing[4],
          borderWidth: 1,
          borderColor: colors.borderLight,
          gap: spacing[3],
        }}
      >
        {/* Seller header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
            {sellerName}
          </Text>
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: radii.full,
              paddingHorizontal: spacing[2],
              paddingVertical: spacing[0.5],
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
              {items.length} {items.length === 1 ? t('orders.item') : t('orders.items')}
            </Text>
          </View>
        </View>

        {/* Items */}
        {items.map((item) => (
          <OrderItemRow key={item.id} item={item} />
        ))}
      </View>
    </SectionReveal>
  )
}

function OrderItemRow({ item }: { item: CartItem }) {
  const { t } = useTranslation()
  const router = useRouter()
  const lineTotal = item.price * item.quantity

  const variantText = item.name.split('—')[1]?.trim()

  return (
    <TouchableOpacity
      onPress={() => router.push(`/product/${item.productId}`)}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        gap: spacing[3],
        alignItems: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${variantText ? `, ${variantText}` : ''}, ${t('orders.quantity')} ${item.quantity}, ${formatNPR(lineTotal)}`}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: item.image }}
        style={{
          width: 56,
          height: 56,
          borderRadius: radii.md,
          backgroundColor: colors.shimmer,
        }}
      />

      {/* Details */}
      <View style={{ flex: 1, gap: spacing[0.5] }}>
        <Text style={{ fontSize: 16, color: colors.text }} numberOfLines={1}>
          {item.name.split('—')[0]?.trim() || item.name}
        </Text>
        {variantText && (
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textMuted }}>
            {variantText}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {t('orders.quantity')}: {item.quantity}
        </Text>
      </View>

      {/* Price */}
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatNPR(lineTotal)}
      </Text>
    </TouchableOpacity>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{title}</Text>
      <View style={{ height: 1, backgroundColor: colors.border }} />
    </View>
  )
}

function PriceBreakdown({ order }: { order: Order }) {
  const { t } = useTranslation()
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vatAmount = Math.round(subtotal * 0.13 / 1.13)
  const deliveryFee = order.total > subtotal ? order.total - subtotal : 0
  const discount = subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing[4],
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: spacing[2],
      }}
      accessibilityLabel={`Order total: ${formatNPR(order.total)}`}
    >
      <SummaryLine label={t('orders.subtotal')} value={subtotal} />
      <SummaryLine label={t('orders.vatInclusive')} value={vatAmount} muted />
      <SummaryLine label={t('orders.deliveryFee')} value={deliveryFee} />
      {discount > 0 && (
        <SummaryLine label={t('orders.discount')} value={-discount} muted />
      )}
      <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing[1] }} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
          {t('orders.grandTotal')}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatNPR(order.total)}
        </Text>
      </View>
    </View>
  )
}

function SummaryLine({
  label,
  value,
  muted,
}: {
  label: string
  value: number
  muted?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
      <Text style={{ fontSize: 14, color: muted ? colors.textMuted : colors.text }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatNPR(Math.abs(value))}
      </Text>
    </View>
  )
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const scrollRef = useRef<ScrollView>(null)
  const timelineY = useRef(0)

  const { data: order, isLoading, isError } = useOrderById(id || '')
  const [isOffline, setIsOffline] = useState(false)

  // Offline detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false)
      setIsOffline(offline)
    })
    return () => unsubscribe()
  }, [])

  // Logged-out state
  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={detailStyles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={detailStyles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('orders.orderDetail')}
          </Text>
          <View style={{ width: 40, height: 40 }} />
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>🔒</Text>}
          title={t('orders.signInPrompt')}
          action={{ label: t('orders.signIn'), onPress: () => router.push('/phone-entry') }}
        />
      </View>
    )
  }

  const sellerGroups = useMemo(() => {
    if (!order) return []
    return [...groupBySeller(order.items).entries()]
  }, [order])

  const timelineSteps = useMemo(() => {
    if (!order) return []
    return buildTimelineSteps(order, t)
  }, [order, t])

  const shipments = useMemo((): ShipmentTimeline[] | undefined => {
    if (!order || sellerGroups.length <= 1) return undefined
    return sellerGroups.map(([sellerName]) => ({
      sellerName,
      steps: timelineSteps,
      estimatedDelivery: order.estimatedDelivery,
    }))
  }, [order, sellerGroups, timelineSteps])

  const statusStyle = order ? STATUS_COLORS[order.status] : null

  const scrollToTimeline = useCallback(() => {
    scrollRef.current?.scrollTo({ y: timelineY.current, animated: true })
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Offline banner */}
      {isOffline && (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(200)}
          style={detailStyles.offlineBanner}
        >
          <View style={detailStyles.offlineDot} />
          <Text style={detailStyles.offlineText}>{t('orders.offlineCached')}</Text>
        </Animated.View>
      )}

      {/* Top Bar */}
      <View style={detailStyles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={detailStyles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
          {t('orders.orderDetail')}
        </Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      {isLoading ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(duration.normal)}
          style={{ flex: 1 }}
          accessibilityRole="progressbar"
          accessibilityLabel={t('common.loadingOrderDetail')}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <OrderDetailSkeleton />
          </ScrollView>
        </Animated.View>
      ) : isError || !order ? (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(duration.normal)}
          style={detailStyles.errorContainer}
        >
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={detailStyles.errorTitle}>
            {isError ? t('orders.errorTitle') : t('orders.notFound')}
          </Text>
          <Text style={detailStyles.errorSubtitle}>
            {isError ? t('orders.errorSubtitle') : t('orders.notFoundSubtitle')}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/orders')}
            activeOpacity={0.85}
            style={detailStyles.backToOrdersBtn}
            accessibilityRole="button"
            accessibilityLabel={t('orders.backToOrders')}
          >
            <Text style={detailStyles.backToOrdersText}>{t('orders.backToOrders')}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[5],
            paddingBottom: insets.bottom + spacing[6],
          }}
        >
          {/* Header */}
          <SectionReveal delay={0}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                padding: spacing[4],
                borderWidth: 1,
                borderColor: colors.borderLight,
                gap: spacing[3],
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '600', color: colors.text }}>
                  {order.id.toUpperCase()}
                </Text>
                {statusStyle && (
                  <View
                    style={{
                      backgroundColor: statusStyle.bg,
                      paddingHorizontal: spacing[2.5],
                      paddingVertical: spacing[0.5],
                      borderRadius: radii.full,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
                      {t(`orders.${order.status}`)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                {t('orders.orderDate')}:{' '}
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              {order.estimatedDelivery &&
                order.status !== 'delivered' &&
                order.status !== 'cancelled' &&
                order.status !== 'returned' && (
                  <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>
                    {t('orders.estimatedDelivery')}:{' '}
                    {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}
            </View>
          </SectionReveal>

          {/* Status Timeline */}
          <SectionReveal delay={50}>
            <View
              style={{ gap: spacing[3] }}
              onLayout={e => { timelineY.current = e.nativeEvent.layout.y }}
            >
              <SectionHeader title={t('orders.statusTimeline')} />
              <OrderStatusTimeline
                steps={timelineSteps}
                shipments={shipments}
              />
            </View>
          </SectionReveal>

          {/* Sub-orders / Seller breakdown */}
          <SectionReveal delay={100}>
            <View style={{ gap: spacing[3] }}>
              <SectionHeader title={t('orders.orderItems')} />
              {sellerGroups.length > 1 ? (
                sellerGroups.map(([sellerName, items], index) => (
                  <SubOrderCard
                    key={sellerName}
                    sellerName={sellerName}
                    items={items}
                    index={index}
                  />
                ))
              ) : (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: radii.lg,
                    padding: spacing[4],
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    gap: spacing[3],
                  }}
                >
                  {order.items.map((item) => (
                    <OrderItemRow key={item.id} item={item} />
                  ))}
                </View>
              )}
            </View>
          </SectionReveal>

          {/* Delivery Address */}
          <SectionReveal delay={150}>
            <View style={{ gap: spacing[3] }}>
              <SectionHeader title={t('orders.deliveryAddress')} />
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  padding: spacing[4],
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  gap: spacing[1],
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {order.address.fullName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {order.address.phone}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ''}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {order.address.city}, {order.address.district}, {order.address.province}
                </Text>
                {order.address.postalCode && (
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>
                    {order.address.postalCode}
                  </Text>
                )}
              </View>
            </View>
          </SectionReveal>

          {/* Price Breakdown */}
          <SectionReveal delay={200}>
            <View style={{ gap: spacing[3] }}>
              <SectionHeader title={t('orders.paymentSummary')} />
              <PriceBreakdown order={order} />
            </View>
          </SectionReveal>

          {/* Order Actions */}
          <SectionReveal delay={250}>
            <OrderActions order={order} onScrollToTimeline={scrollToTimeline} />
          </SectionReveal>
        </ScrollView>
      )}
    </View>
  )
}

import { StyleSheet } from 'react-native'

const detailStyles = StyleSheet.create({
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
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
  backToOrdersBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  backToOrdersText: {
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
})
