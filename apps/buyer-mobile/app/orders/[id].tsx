import React, { useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useOrderById } from '@chinooz/hooks'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import SectionReveal from '../../components/SectionReveal'
import type { Order, OrderStatus, CartItem } from '@chinooz/types'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warning },
  confirmed: { bg: colors.infoLight, text: colors.info },
  processing: { bg: '#F3E8FF', text: '#7C3AED' },
  shipped: { bg: '#E0F2FE', text: '#0284C7' },
  delivered: { bg: colors.successLight, text: colors.success },
  cancelled: { bg: colors.errorLight, text: colors.error },
  returned: { bg: '#FEF3C7', text: '#D97706' },
}

const TIMELINE_ICONS: Record<OrderStatus, string> = {
  pending: '🕐',
  confirmed: '✓',
  processing: '📦',
  shipped: '🚚',
  delivered: '✅',
  cancelled: '✕',
  returned: '↩',
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

function StatusTimeline({ order }: { order: Order }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <View style={{ gap: spacing[3] }}>
      {order.timeline.map((entry, index) => {
        const isLast = index === order.timeline.length - 1
        const style = STATUS_COLORS[entry.status]
        return (
          <SectionReveal key={entry.status + index} delay={index * 50}>
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              {/* Timeline indicator */}
              <View style={{ alignItems: 'center', width: 32 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radii.full,
                    backgroundColor: isLast ? style.bg : colors.borderLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{TIMELINE_ICONS[entry.status]}</Text>
                </View>
                {!isLast && (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      backgroundColor: colors.borderLight,
                      minHeight: 24,
                    }}
                  />
                )}
              </View>

              {/* Content */}
              <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing[2] }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isLast ? '600' : '400',
                    color: isLast ? style.text : colors.textSecondary,
                  }}
                >
                  {t(`orders.${entry.status}`)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {new Date(entry.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                {entry.note && (
                  <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                    {entry.note}
                  </Text>
                )}
              </View>
            </View>
          </SectionReveal>
        )
      })}
    </View>
  )
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

  const { data: order, isLoading, isError } = useOrderById(id || '')

  if (!isLoggedIn) {
    router.replace('/phone-entry')
    return null
  }

  const sellerGroups = useMemo(() => {
    if (!order) return []
    return [...groupBySeller(order.items).entries()]
  }, [order])

  const statusStyle = order ? STATUS_COLORS[order.status] : null

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError || !order ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[8],
            gap: spacing[3],
          }}
        >
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
            {t('orders.notFound')}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing[6],
              paddingVertical: spacing[3],
              borderRadius: radii.lg,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
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
            <View style={{ gap: spacing[3] }}>
              <SectionHeader title={t('orders.statusTimeline')} />
              <StatusTimeline order={order} />
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
        </ScrollView>
      )}
    </View>
  )
}
