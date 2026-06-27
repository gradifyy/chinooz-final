import React, { useCallback, memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radii } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import type { OrderCardProps, Order, OrderStatus } from '@chinooz/types'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#F59E0B' },
  confirmed: { bg: '#FEF3C7', text: '#F59E0B' },
  processing: { bg: '#DBEAFE', text: '#2563EB' },
  shipped: { bg: '#DBEAFE', text: '#2563EB' },
  delivered: { bg: '#DCFCE7', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
  returned: { bg: '#FEE2E2', text: '#DC2626' },
}

const ACTION_CONFIG: Record<string, { labelKey: string; variant: 'primary' | 'outline' | 'text' }> = {
  pending: { labelKey: 'orderCard.payNow', variant: 'primary' },
  confirmed: { labelKey: 'orderCard.payNow', variant: 'primary' },
  processing: { labelKey: 'orderCard.viewDetails', variant: 'text' },
  shipped: { labelKey: 'orderCard.track', variant: 'outline' },
  delivered: { labelKey: 'orderCard.buyAgain', variant: 'outline' },
  cancelled: { labelKey: 'orderCard.viewDetails', variant: 'text' },
  returned: { labelKey: 'orderCard.viewDetails', variant: 'text' },
}

const MAX_VISIBLE_THUMBS = 4
const THUMB_SIZE = 48
const THUMB_OVERLAP = 8

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusPill({ status }: { status: OrderStatus }) {
  const { t } = useTranslation()
  const c = STATUS_COLORS[status]
  const label = t(`orderCard.status.${status}`)
  return (
    <View
      style={[styles.statusPill, { backgroundColor: c.bg }]}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <Text style={[styles.statusText, { color: c.text }]}>{label}</Text>
    </View>
  )
}

function ThumbStack({ items }: { items: Order['items'] }) {
  const visible = items.slice(0, MAX_VISIBLE_THUMBS)
  const overflow = items.length - MAX_VISIBLE_THUMBS

  return (
    <View style={styles.thumbRow}>
      {visible.map((item, i) => (
        <View
          key={item.id}
          style={[
            styles.thumb,
            i > 0 && { marginLeft: -THUMB_OVERLAP },
            { zIndex: MAX_VISIBLE_THUMBS - i },
          ]}
        >
          <SafeImage
            source={item.image}
            style={styles.thumbImage}
            accessibilityLabel={item.name}
          />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.thumb,
            styles.thumbOverflow,
            { marginLeft: -THUMB_OVERLAP, zIndex: 0 },
          ]}
        >
          <Text style={styles.thumbOverflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  )
}

function ActionButton({
  order,
  onAction,
}: {
  order: Order
  onAction?: (order: Order) => void
}) {
  const { t } = useTranslation()
  const config = ACTION_CONFIG[order.status] ?? ACTION_CONFIG.cancelled!
  const label = t(config.labelKey)
  const chevronScale = useSharedValue(1)

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevronScale.value * 3 }],
  }))

  const handlePressIn = useCallback(() => {
    if (config.variant === 'text') {
      chevronScale.value = withSpring(1, { damping: 15, stiffness: 400 })
    }
  }, [])

  const handlePressOut = useCallback(() => {
    chevronScale.value = withSpring(0, { damping: 15, stiffness: 300 })
  }, [])

  if (config.variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={() => onAction?.(order)}
        style={styles.actionPrimary}
        activeOpacity={0.85}
        accessibilityLabel={`${label} for order ${order.id}`}
        accessibilityRole="button"
      >
        <Text style={styles.actionPrimaryText}>{label}</Text>
      </TouchableOpacity>
    )
  }

  if (config.variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={() => onAction?.(order)}
        style={styles.actionOutline}
        activeOpacity={0.85}
        accessibilityLabel={`${label} for order ${order.id}`}
        accessibilityRole="button"
      >
        <Text style={styles.actionOutlineText}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <AnimatedTouchable
      onPress={() => onAction?.(order)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.actionTextRow}
      activeOpacity={0.7}
      accessibilityLabel={`${label} for order ${order.id}`}
      accessibilityRole="button"
    >
      <Text style={styles.actionTextLink}>{label}</Text>
      <Animated.Text style={[styles.actionChevron, chevronStyle]}>›</Animated.Text>
    </AnimatedTouchable>
  )
}

const OrderCard = memo(function OrderCard({
  order,
  sellerName,
  shipmentCount,
  onPress,
  onAction,
  testID,
}: OrderCardProps) {
  const { t } = useTranslation()
  const cardScale = useSharedValue(1)

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }, [])

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [])

  const itemCount = order.items.length
  const firstImageUri = order.items[0]?.image
  const a11yLabel = `Order ${order.id}, ${STATUS_COLORS[order.status].text} status, ${formatNPR(order.total)}, ${itemCount} item${itemCount !== 1 ? 's' : ''}`

  return (
    <AnimatedTouchable
      testID={testID}
      onPress={() => onPress?.(order)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[styles.card, cardStyle]}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
    >
      {/* Header row: order id + date */}
      <View style={styles.header}>
        <Text style={styles.orderId} numberOfLines={1}>
          {order.id}
        </Text>
        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
      </View>

      {/* Seller / store name */}
      <Text style={styles.seller} numberOfLines={1}>
        {sellerName ?? t('orderCard.multipleSellers')}
      </Text>

      {/* Status pill + multi-seller shipment pill */}
      <View style={styles.badgeRow}>
        <StatusPill status={order.status} />
        {shipmentCount != null && shipmentCount > 1 && (
          <View style={styles.shipmentPill}>
            <Text style={styles.shipmentText}>
              {t('orderCard.shipments', { count: shipmentCount })}
            </Text>
          </View>
        )}
      </View>

      {/* Thumbnails + item count */}
      <View style={styles.itemsRow}>
        <ThumbStack items={order.items} />
        <Text style={styles.itemCount}>
          {itemCount} {itemCount === 1 ? t('orderCard.item') : t('orderCard.items')}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Footer: total + action */}
      <View style={styles.footer}>
        <Text style={styles.total}>{formatNPR(order.total)}</Text>
        <ActionButton order={order} onAction={onAction} />
      </View>
    </AnimatedTouchable>
  )
})

export default OrderCard

export function OrderCardSkeleton({ testID }: { testID?: string }) {
  return (
    <View
      testID={testID}
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel="Loading order"
      accessibilityState={{ busy: true }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={120} height={14} borderRadius={radii.sm} />
        <Skeleton width={90} height={12} borderRadius={radii.sm} />
      </View>

      {/* Seller */}
      <Skeleton width="50%" height={14} borderRadius={radii.sm} />

      {/* Status pill */}
      <View style={styles.badgeRow}>
        <Skeleton width={72} height={22} borderRadius={radii.full} />
      </View>

      {/* Thumbnails row */}
      <View style={styles.itemsRow}>
        <View style={styles.thumbRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.thumb, i > 0 && { marginLeft: -THUMB_OVERLAP }]}>
              <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={radii.md} />
            </View>
          ))}
        </View>
        <Skeleton width={50} height={12} borderRadius={radii.sm} />
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <Skeleton width={100} height={16} borderRadius={radii.sm} />
        <Skeleton width={90} height={36} borderRadius={radii.md} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    gap: spacing[2.5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing[2],
  },
  date: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  seller: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusPill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shipmentPill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shipmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.shimmer,
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumbOverflow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverflowText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  itemCount: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  actionOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
  },
  actionTextLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionChevron: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
})
