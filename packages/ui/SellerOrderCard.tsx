import React, { useCallback, useEffect, useRef, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check, AlertTriangle, Clock, Printer, Eye, Package, Truck } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import Skeleton from './Skeleton'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { SellerOrderCardProps } from '@chinooz/types/components'
import type { SellerSubOrder, SellerOrderStatusKey } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const STATUS_META: Record<
  SellerOrderStatusKey,
  { bg: string; text: string; dot: string; labelKey: string }
> = {
  new: { bg: colors.infoLight, text: colors.info, dot: colors.info, labelKey: 'seller.orders.tabNew' },
  to_pack: { bg: colors.warningLight, text: colors.warning, dot: colors.warning, labelKey: 'seller.orders.tabToPack' },
  to_ship: { bg: colors.warningLight, text: colors.warning, dot: colors.warning, labelKey: 'seller.orders.tabToShip' },
  shipped: { bg: colors.infoLight, text: colors.info, dot: colors.info, labelKey: 'seller.orders.tabShipped' },
  completed: { bg: colors.successLight, text: colors.success, dot: colors.success, labelKey: 'seller.orders.tabCompleted' },
  cancelled_returned: { bg: colors.errorLight, text: colors.error, dot: colors.error, labelKey: 'seller.orders.tabCancelledReturned' },
  action_needed: { bg: colors.errorLight, text: colors.error, dot: colors.error, labelKey: 'seller.orders.tabActionNeeded' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any

const ACTION_MAP: Record<
  SellerOrderStatusKey,
  { labelKey: string; ariaKey: string; Icon: IconType } | null
> = {
  new: { labelKey: 'seller.orders.actionAccept', ariaKey: 'seller.orders.actionAcceptAria', Icon: Check },
  to_pack: { labelKey: 'seller.orders.actionPack', ariaKey: 'seller.orders.actionPackAria', Icon: Package },
  to_ship: { labelKey: 'seller.orders.actionShip', ariaKey: 'seller.orders.actionShipAria', Icon: Truck },
  shipped: { labelKey: 'seller.orders.actionPrintLabel', ariaKey: 'seller.orders.actionPrintLabelAria', Icon: Printer },
  completed: { labelKey: 'seller.orders.actionView', ariaKey: 'seller.orders.actionViewAria', Icon: Eye },
  cancelled_returned: { labelKey: 'seller.orders.actionView', ariaKey: 'seller.orders.actionViewAria', Icon: Eye },
  action_needed: { labelKey: 'seller.orders.actionView', ariaKey: 'seller.orders.actionViewAria', Icon: Eye },
}

const THUMB_SIZE = 32
const THUMB_OVERLAP = 8
const MAX_THUMBS = 3

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function computeShipBy(order: SellerSubOrder): { date: Date; isOverdue: boolean; isDueToday: boolean } | null {
  if (order.statusKey === 'shipped' || order.statusKey === 'completed' || order.statusKey === 'cancelled_returned') return null
  const created = new Date(order.createdAt).getTime()
  const slaDays = order.shippingMethod === 'sameday' ? 0 : order.shippingMethod === 'express' ? 1 : 2
  const shipBy = new Date(created + slaDays * 86400000)
  shipBy.setHours(23, 59, 59, 999)
  const now = Date.now()
  const isOverdue = now > shipBy.getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const shipByDay = new Date(shipBy)
  shipByDay.setHours(0, 0, 0, 0)
  const isDueToday = !isOverdue && shipByDay.getTime() === today.getTime()
  return { date: shipBy, isOverdue, isDueToday }
}

function StatusPill({ statusKey, t }: { statusKey: SellerOrderStatusKey; t: (k: string) => string }) {
  const m = STATUS_META[statusKey]
  return (
    <View style={[styles.statusPill, { backgroundColor: m.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.statusText, { color: m.text }]}>{t(m.labelKey)}</Text>
    </View>
  )
}

function ThumbStack({ items }: { items: SellerSubOrder['items'] }) {
  const visible = items.slice(0, MAX_THUMBS)
  const overflow = items.length - MAX_THUMBS
  return (
    <View style={styles.thumbStack}>
      {visible.map((item, i) => (
        <View
          key={item.id}
          style={[
            styles.thumb,
            { marginLeft: i > 0 ? -THUMB_OVERLAP : 0, zIndex: MAX_THUMBS - i },
          ]}
        >
          <Image source={{ uri: item.image }} style={styles.thumbImg} />
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.thumbOverflow, { marginLeft: -THUMB_OVERLAP }]}>
          <Text style={styles.thumbOverflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  )
}

function Checkbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
}) {
  return (
    <TouchableOpacity
      onPress={onChange}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={ariaLabel}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
    >
      {checked && <Check size={14} color={colors.white} strokeWidth={3} />}
    </TouchableOpacity>
  )
}

function SlaIndicator({ order, t }: { order: SellerSubOrder; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const sla = computeShipBy(order)
  if (!sla) return null
  const dateStr = sla.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const text = sla.isOverdue
    ? t('seller.orders.slaOverdue')
    : sla.isDueToday
      ? t('seller.orders.slaDueToday')
      : t('seller.orders.slaShipBy', { date: dateStr })
  const color = sla.isOverdue || sla.isDueToday ? colors.warning : colors.textMuted
  return (
    <View style={styles.slaRow} accessibilityLabel={text}>
      <Clock size={12} color={color} />
      <Text style={[styles.slaText, { color }]}>{text}</Text>
    </View>
  )
}

function ActionButton({
  order,
  onAction,
  t,
}: {
  order: SellerSubOrder
  onAction?: (order: SellerSubOrder) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const config = ACTION_MAP[order.statusKey]
  if (!config) return null
  const Icon = config.Icon
  const label = t(config.labelKey)
  const aria = t(config.ariaKey, { id: order.orderId })
  const isPrimary = order.statusKey === 'new' || order.statusKey === 'to_pack' || order.statusKey === 'to_ship'
  const handlePress = useCallback(() => {
    onAction?.(order)
  }, [order, onAction])
  if (isPrimary) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={aria}
        style={styles.actionBtnPrimary}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        activeOpacity={0.85}
      >
        <Icon size={16} color={colors.white} />
        <Text style={styles.actionBtnPrimaryText}>{label}</Text>
      </TouchableOpacity>
    )
  }
  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={aria}
      style={styles.actionBtnSecondary}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      activeOpacity={0.85}
    >
      <Icon size={16} color={colors.textMuted} />
      <Text style={styles.actionBtnSecondaryText}>{label}</Text>
    </TouchableOpacity>
  )
}

export function SellerOrderCardSkeleton() {
  return (
    <View style={styles.skeletonCard} accessibilityLiveRegion="polite" accessibilityRole="progressbar">
      <View style={styles.skeletonHeader}>
        <Skeleton width={120} height={16} />
        <Skeleton width={72} height={20} borderRadius={radii.full} />
      </View>
      <View style={styles.skeletonThumbs}>
        <Skeleton width={32} height={32} borderRadius={radii.sm} />
        <Skeleton width={32} height={32} borderRadius={radii.sm} />
        <Skeleton width={60} height={14} />
      </View>
      <Skeleton width="80%" height={14} />
      <View style={styles.skeletonFooter}>
        <Skeleton width={72} height={20} borderRadius={radii.full} />
        <Skeleton width={80} height={16} />
      </View>
    </View>
  )
}

const SellerOrderCard = memo(function SellerOrderCard({
  order,
  selected = false,
  onToggleSelect,
  onPress,
  onAction,
  index = 0,
  loading = false,
  testID,
}: SellerOrderCardProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const scale = useRef(new Animated.Value(1)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (loading) return
    Animated.timing(fade, {
      toValue: 1,
      duration: reduced ? 0 : 280,
      delay: reduced ? 0 : Math.min(index * 50, 250),
      useNativeDriver: true,
    }).start()
  }, [fade, index, reduced, loading])

  const pressIn = useCallback(() => {
    if (reduced) return
    Animated.spring(scale, { toValue: 0.98, damping: 15, stiffness: 400, useNativeDriver: true }).start()
  }, [reduced, scale])

  const pressOut = useCallback(() => {
    if (reduced) return
    Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: true }).start()
  }, [reduced, scale])

  if (loading) return <SellerOrderCardSkeleton />

  const isNew = order.statusKey === 'new'
  const statusMeta = STATUS_META[order.statusKey]
  const statusLabel = t(statusMeta.labelKey)
  const ariaLabel = t('seller.orders.rowAria', {
    id: order.orderId,
    buyer: order.buyerName,
    total: formatNPR(order.total),
    status: statusLabel,
  })
  const isCod = order.paymentType === 'cod'
  const isPaid = !isCod

  const handleCheckboxPress = useCallback(
    () => {
      onToggleSelect?.(order.subOrderId)
    },
    [order.subOrderId, onToggleSelect],
  )

  return (
    <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
      <AnimatedTouchable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        onPress={onPress ? () => onPress(order) : undefined}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.9}
        style={[styles.card, isNew && styles.cardNew]}
      >
        {isNew && <View style={styles.cardAccent} />}

        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {onToggleSelect && (
              <Checkbox
                checked={selected}
                onChange={handleCheckboxPress}
                ariaLabel={t('seller.orders.selectOrder', { id: order.orderId })}
              />
            )}
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardOrderId} numberOfLines={1}>
                {order.orderId}
              </Text>
              <Text style={styles.cardDateTime}>
                {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
              </Text>
            </View>
          </View>
          <StatusPill statusKey={order.statusKey} t={t} />
        </View>

        {order.actionNeeded && (
          <View style={styles.cardActionBanner}>
            <AlertTriangle size={13} color={colors.error} />
            <Text style={styles.cardActionText} numberOfLines={1}>
              {order.actionReason ?? t('seller.orders.actionNeededLabel')}
            </Text>
          </View>
        )}

        <View style={styles.cardItemsRow}>
          <ThumbStack items={order.items} />
          <Text style={styles.cardItemCount}>
            {order.itemCount} {order.itemCount === 1 ? t('seller.orders.item') : t('seller.orders.items')}
          </Text>
        </View>

        <Text style={styles.cardBuyer} numberOfLines={1}>
          {order.buyerName} · {order.city}, {order.district}
        </Text>

        <View style={styles.cardDivider} />

        <SlaIndicator order={order} t={t} />

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <View style={[styles.cardPayPill, { backgroundColor: isCod ? colors.warningLight : colors.successLight }]}>
              <Text style={[styles.cardPayText, { color: isCod ? colors.warning : colors.success }]}>
                {isCod ? t('seller.orders.paymentCod') : t('seller.orders.paymentPrepaid')}
              </Text>
            </View>
            <Text style={[styles.cardPaidText, { color: isPaid ? colors.success : colors.textMuted }]}>
              {isPaid ? t('seller.orders.paid') : t('seller.orders.unpaid')}
            </Text>
          </View>
          <Text style={styles.cardTotal}>{formatNPR(order.total)}</Text>
        </View>

        <View style={styles.cardActionRow}>
          <ActionButton order={order} onAction={onAction} t={t} />
        </View>
      </AnimatedTouchable>
    </Animated.View>
  )
})

export default SellerOrderCard

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardNew: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary + '33',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    minWidth: 0,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardOrderId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  cardDateTime: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: radii.full },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  cardActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  cardActionText: { fontSize: 12, fontWeight: '600', color: colors.error, flex: 1 },
  cardItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  thumbStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.shimmer,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbOverflow: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  thumbOverflowText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  cardItemCount: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  cardBuyer: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
  },
  cardDivider: { height: 1, backgroundColor: colors.borderLight },
  slaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  slaText: { fontSize: 12, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardPayPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  cardPayText: { fontSize: 12, fontWeight: '600' },
  cardPaidText: { fontSize: 12, fontWeight: '500' },
  cardTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 40,
  },
  actionBtnPrimaryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 40,
  },
  actionBtnSecondaryText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonThumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
})
