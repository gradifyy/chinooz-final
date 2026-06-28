import React, { useMemo, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Clock,
  Printer,
  MessageCircle,
  AlertTriangle,
  Check,
  Package,
  Truck,
  XCircle,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { formatNPR } from '@chinooz/utils'
import { useSellerOrderById } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { OrderStatusTimeline } from '@chinooz/ui'
import type {
  SellerSubOrder,
  SellerOrderStatusKey,
  TimelineStep,
  TimelineStepStatus,
} from '@chinooz/types'

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

const STEP_KEYS = ['ordered', 'confirmed', 'packed', 'shipped', 'delivered'] as const

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length < 6) return phone
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`
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

function buildTimelineSteps(order: SellerSubOrder, t: (k: string) => string): TimelineStep[] {
  const statusOrderMap: Record<SellerOrderStatusKey, number> = {
    new: 0, to_pack: 1, to_ship: 2, shipped: 3, completed: 4,
    cancelled_returned: -1, action_needed: -1,
  }
  const isCancelled = order.statusKey === 'cancelled_returned' && order.status === 'cancelled'
  const isReturned = order.statusKey === 'cancelled_returned' && order.status === 'returned'
  const currentIdx = statusOrderMap[order.statusKey]
  const labelMap: Record<string, string> = {
    ordered: t('seller.orders.tabNew'),
    confirmed: t('seller.orders.tabToPack'),
    packed: t('seller.orders.tabToShip'),
    shipped: t('seller.orders.tabShipped'),
    delivered: t('seller.orders.tabCompleted'),
    cancelled: t('seller.orders.tabCancelledReturned'),
    returned: t('seller.orders.tabCancelledReturned'),
  }
  const steps: TimelineStep[] = []
  for (let i = 0; i < STEP_KEYS.length; i++) {
    const key = STEP_KEYS[i]
    let status: TimelineStepStatus = 'upcoming'
    if (isCancelled || isReturned) {
      status = i < currentIdx ? 'completed' : 'upcoming'
    } else if (i < currentIdx) {
      status = 'completed'
    } else if (i === currentIdx) {
      status = 'current'
    }
    steps.push({ key, label: labelMap[key] ?? key, status, timestamp: i === 0 ? order.createdAt : undefined })
  }
  if (isCancelled) {
    steps.push({ key: 'cancelled', label: labelMap['cancelled'], status: 'current', timestamp: order.createdAt })
  } else if (isReturned) {
    steps.push({ key: 'returned', label: labelMap['returned'], status: 'current', timestamp: order.createdAt })
  }
  return steps
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any

const FULFILL_ACTIONS: Record<SellerOrderStatusKey, { labelKey: string; ariaKey: string; Icon: IconType; primary: boolean } | null> = {
  new: { labelKey: 'seller.orders.actionAccept', ariaKey: 'seller.orders.actionAcceptAria', Icon: Check, primary: true },
  to_pack: { labelKey: 'seller.orders.actionPack', ariaKey: 'seller.orders.actionPackAria', Icon: Package, primary: true },
  to_ship: { labelKey: 'seller.orders.actionShip', ariaKey: 'seller.orders.actionShipAria', Icon: Truck, primary: true },
  shipped: { labelKey: 'seller.orders.actionPrintLabel', ariaKey: 'seller.orders.actionPrintLabelAria', Icon: Printer, primary: false },
  completed: null,
  cancelled_returned: null,
  action_needed: null,
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

function SectionHeader({ title, id }: { title: string; id: string }) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header" nativeID={id}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionDivider} />
    </View>
  )
}

function SummaryLine({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, muted && styles.summaryLabelMuted]}>{label}</Text>
      <Text style={styles.summaryValue}>{formatNPR(Math.abs(value))}</Text>
    </View>
  )
}

export default function SellerOrderDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const sellerId = useSellerSessionStore(s => s.sellerId)

  const { data: order, isLoading, isError } = useSellerOrderById(sellerId ?? null, id ?? null)

  useEffect(() => {
    analytics.screen({ name: 'seller-order-detail' })
  }, [])

  const timelineSteps = useMemo(() => {
    if (!order) return []
    return buildTimelineSteps(order, t)
  }, [order, t])

  const handleContact = useCallback(() => {
    router.push(`/messages?order=${order?.orderId ?? ''}` as any)
  }, [router, order])

  const handleCancel = useCallback(() => {
    router.push('/(tabs)/orders' as any)
  }, [router])

  if (!isLoggedIn) return <Redirect href="/onboarding" />

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('seller.orders.detailBack')}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('seller.orders.detail')}</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('seller.orders.detailLoading')}</Text>
        </View>
      </View>
    )
  }

  if (isError || !order) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('seller.orders.detailBack')}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('seller.orders.detail')}</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerWrap}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorTitle}>{t('seller.orders.detailNotFound')}</Text>
          <Text style={styles.errorSubtitle}>{t('seller.orders.detailNotFoundSub')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders' as any)} style={styles.retryBtn} accessibilityRole="button">
            <Text style={styles.retryText}>{t('seller.orders.detailBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vatAmount = Math.round((subtotal * 0.13) / 1.13)
  const deliveryFee = Math.max(0, order.total - subtotal)
  const discount = subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0
  const maskedPhone = maskPhone(order.buyerPhone)

  const fulfill = FULFILL_ACTIONS[order.statusKey]
  const canCancel = order.statusKey === 'new' || order.statusKey === 'to_pack'
  const canPrint = order.statusKey === 'shipped' || order.statusKey === 'completed'

  const sla = computeShipBy(order)
  const slaText = sla
    ? sla.isOverdue
      ? t('seller.orders.slaOverdue')
      : sla.isDueToday
        ? t('seller.orders.slaDueToday')
        : t('seller.orders.slaShipBy', { date: formatDateShort(sla.date.toISOString()) })
    : null
  const slaColor = sla?.isOverdue || sla?.isDueToday ? colors.warning : colors.textMuted

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('seller.orders.detailBack')}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('seller.orders.detail')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={styles.card} accessibilityLabel={t('seller.orders.detail')}>
          <View style={styles.headerCardTop}>
            <View style={styles.headerCardLeft}>
              <Text accessibilityRole="header" style={styles.orderId}>{order.orderId}</Text>
              <Text style={styles.orderDate}>{t('seller.orders.orderDate')}: {formatDateLong(order.createdAt)}</Text>
            </View>
            <StatusPill statusKey={order.statusKey} t={t} />
          </View>

          <View style={styles.headerChips}>
            <View style={[styles.payPill, { backgroundColor: order.paymentType === 'cod' ? colors.warningLight : colors.successLight }]}>
              <Text style={[styles.payPillText, { color: order.paymentType === 'cod' ? colors.warning : colors.success }]}>
                {order.paymentType === 'cod' ? t('seller.orders.paymentCod') : t('seller.orders.paymentPrepaid')}
              </Text>
            </View>
            <Text style={[styles.paidText, { color: order.paymentType !== 'cod' ? colors.success : colors.textMuted }]}>
              {order.paymentType !== 'cod' ? t('seller.orders.paid') : t('seller.orders.unpaid')}
            </Text>
            {slaText && (
              <View style={styles.slaRow}>
                <Clock size={12} color={slaColor} />
                <Text style={[styles.slaText, { color: slaColor }]} accessibilityLabel={slaText}>{slaText}</Text>
              </View>
            )}
          </View>

          {order.actionNeeded && (
            <View style={styles.actionBanner}>
              <AlertTriangle size={14} color={colors.error} />
              <Text style={styles.actionBannerText}>{order.actionReason ?? t('seller.orders.actionNeededLabel')}</Text>
            </View>
          )}

          {order.estimatedDelivery && order.statusKey !== 'completed' && order.statusKey !== 'cancelled_returned' && (
            <Text style={styles.estDelivery}>
              {t('seller.orders.estimatedDelivery')}: {formatDateShort(order.estimatedDelivery)}
            </Text>
          )}
        </View>

        {/* Items */}
        <View style={styles.sectionWrap}>
          <SectionHeader title={t('seller.orders.sectionItems')} id="items-heading" />
          <View style={styles.card}>
            {order.items.map((item, i) => {
              const variantText = item.name.split('—')[1]?.trim() || item.sku
              const lineTotal = item.price * item.quantity
              return (
                <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
                  <Image source={{ uri: item.image }} style={styles.itemThumb} />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name.split('—')[0]?.trim() || item.name}</Text>
                    {variantText ? (
                      <View style={styles.variantChip}>
                        <Text style={styles.variantChipText} numberOfLines={1}>{variantText}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.itemMeta}>
                      {t('seller.orders.qty')}: {item.quantity} · {formatNPR(item.price)} {t('seller.orders.each')}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatNPR(lineTotal)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Price breakdown */}
        <View style={styles.sectionWrap}>
          <SectionHeader title={t('seller.orders.sectionPriceBreakdown')} id="price-heading" />
          <View style={styles.card}>
            <SummaryLine label={t('seller.orders.subtotal')} value={subtotal} />
            <SummaryLine label={t('seller.orders.vatIncl')} value={vatAmount} muted />
            <SummaryLine label={t('seller.orders.deliveryFee')} value={deliveryFee} />
            {discount > 0 && <SummaryLine label={t('seller.orders.discount')} value={-discount} muted />}
            <View style={styles.cardDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('seller.orders.total')}</Text>
              <Text style={styles.totalValue}>{formatNPR(order.total)}</Text>
            </View>
            <Text style={styles.payoutHint}>{t('seller.orders.payoutRelevant')}</Text>
          </View>
        </View>

        {/* Buyer & shipping */}
        <View style={styles.sectionWrap}>
          <SectionHeader title={t('seller.orders.sectionBuyer')} id="buyer-heading" />
          <View style={styles.card}>
            <View style={styles.buyerRow}>
              <Text style={styles.buyerLabel}>{t('seller.orders.buyerName')}</Text>
              <Text style={styles.buyerValue}>{order.buyerName}</Text>
            </View>
            <View style={styles.buyerRow}>
              <Text style={styles.buyerLabel}>{t('seller.orders.contact')}</Text>
              <Text
                style={styles.buyerValueMono}
                accessibilityLabel={`${t('seller.orders.contactMasked')}: ${maskedPhone}`}
              >
                {maskedPhone}
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.buyerRow}>
              <Text style={styles.buyerLabel}>{t('seller.orders.deliveryAddress')}</Text>
              <Text style={styles.buyerValue}>{order.city}, {order.district}</Text>
            </View>
            <View style={styles.deliveryRow}>
              <View>
                <Text style={styles.buyerLabel}>{t('seller.orders.deliveryMethod')}</Text>
                <Text style={styles.buyerValueCapitalize}>{order.shippingMethod}</Text>
              </View>
              {order.estimatedDelivery && (
                <View>
                  <Text style={styles.buyerLabel}>{t('seller.orders.estimatedDelivery')}</Text>
                  <Text style={styles.buyerValue}>{formatDateShort(order.estimatedDelivery)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.sectionWrap}>
          <SectionHeader title={t('seller.orders.sectionTimeline')} id="timeline-heading" />
          <View style={styles.card}>
            <OrderStatusTimeline steps={timelineSteps} isCod={order.paymentType === 'cod'} />
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing[2] }]}>
        {fulfill && (
          <TouchableOpacity
            style={[styles.actionBtn, fulfill.primary ? styles.actionBtnPrimary : styles.actionBtnSecondary]}
            accessibilityRole="button"
            accessibilityLabel={t(fulfill.ariaKey)}
            activeOpacity={0.85}
          >
            <fulfill.Icon size={16} color={fulfill.primary ? colors.white : colors.text} />
            <Text style={fulfill.primary ? styles.actionBtnPrimaryText : styles.actionBtnSecondaryText}>
              {t(fulfill.labelKey)}
            </Text>
          </TouchableOpacity>
        )}
        {canPrint && !fulfill && (
          <TouchableOpacity style={styles.actionBtnSecondary} accessibilityRole="button" accessibilityLabel={t('seller.orders.actionPrintLabelAria')} activeOpacity={0.85}>
            <Printer size={16} color={colors.text} />
            <Text style={styles.actionBtnSecondaryText}>{t('seller.orders.actionPrintLabel')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={handleContact}
          accessibilityRole="button"
          accessibilityLabel={t('seller.orders.actionContactBuyerAria')}
          activeOpacity={0.85}
        >
          <MessageCircle size={16} color={colors.text} />
          <Text style={styles.actionBtnSecondaryText}>{t('seller.orders.actionContactBuyer')}</Text>
        </TouchableOpacity>
        {canCancel && (
          <TouchableOpacity
            style={styles.actionBtnDestructive}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.actionCancelAria')}
            activeOpacity={0.85}
          >
            <XCircle size={16} color={colors.error} />
            <Text style={styles.actionBtnDestructiveText}>{t('seller.orders.actionCancel')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing[4], gap: spacing[4] },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  loadingText: { fontSize: 14, color: colors.textMuted },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: 6 },
  errorIcon: { fontSize: 40, marginBottom: spacing[2] },
  errorTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  errorSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerCardLeft: { flex: 1, minWidth: 0 },
  orderId: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  orderDate: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
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
  headerChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  payPill: { paddingHorizontal: spacing[2.5], paddingVertical: 3, borderRadius: radii.full },
  payPillText: { fontSize: 12, fontWeight: '600' },
  paidText: { fontSize: 12, fontWeight: '500' },
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  slaText: { fontSize: 12, fontWeight: '600' },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
  },
  actionBannerText: { fontSize: 13, fontWeight: '600', color: colors.error, flex: 1 },
  estDelivery: { fontSize: 14, fontWeight: '500', color: colors.primary },
  sectionWrap: { gap: spacing[3] },
  sectionHeader: { gap: spacing[2] },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sectionDivider: { height: 1, backgroundColor: colors.border },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing[3], marginTop: spacing[1] },
  itemThumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.shimmer },
  itemBody: { flex: 1, minWidth: 0, gap: 4 },
  itemName: { fontSize: 16, color: colors.text },
  variantChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  variantChipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  itemMeta: { fontSize: 12, color: colors.textMuted },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 14, color: colors.text },
  summaryLabelMuted: { color: colors.textMuted },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cardDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing[1] },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  payoutHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  buyerRow: { gap: 2 },
  buyerLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  buyerValue: { fontSize: 16, fontWeight: '500', color: colors.text },
  buyerValueMono: {
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  buyerValueCapitalize: { fontSize: 16, fontWeight: '500', color: colors.text, textTransform: 'capitalize' },
  deliveryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 44,
  },
  actionBtnPrimary: { backgroundColor: colors.primary, flex: 1 },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  actionBtnSecondaryText: { color: colors.text, fontWeight: '600', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  actionBtnDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '0D',
  },
  actionBtnDestructiveText: { color: colors.error, fontWeight: '600', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
})
