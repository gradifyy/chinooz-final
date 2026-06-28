import React, { useCallback, memo, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import {
  MapPin,
  Navigation,
  Clock,
  Wallet,
  Banknote,
  Package,
  Bike,
  Timer,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import type { JobRequest, JobHistoryEntry, VehicleHint, JobsTabKey } from './types'
import type { ActiveDelivery } from '@chinooz/state'
import type { DeliveryStatus } from '@chinooz/types'
import {
  formatNpr,
  formatNprTabular,
  formatEta,
  formatDuration,
  formatKm,
  formatClock,
  formatCountdown,
} from './format'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

/**
 * Translate with an inline English fallback. The rider i18n namespace is under
 * concurrent restructuring, so the card always renders correct copy even when
 * a key is momentarily missing — `t(key, { fallback })`-style behaviour.
 */
function useTt() {
  const { t } = useTranslation()
  return useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) => {
      const raw = t(key, vars ?? {})
      // i18next returns the key path itself when a translation is missing.
      if (raw === key || raw === undefined) return fallback ?? key
      return raw
    },
    [t],
  )
}

const VEHICLE_LABEL: Record<VehicleHint, { key: string; fallback: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  bike: { key: 'rider.jobs.jobCard.vehicleBike', fallback: 'Bike', icon: Bike },
  scooter: { key: 'rider.jobs.jobCard.vehicleScooter', fallback: 'Scooter', icon: Bike },
  cycle: { key: 'rider.jobs.jobCard.vehicleCycle', fallback: 'Cycle', icon: Bike },
  walk: { key: 'rider.jobs.jobCard.vehicleWalk', fallback: 'Walk', icon: Navigation },
}

const ACTIVE_STATUS_LABEL: Record<DeliveryStatus, string> = {
  assigned: 'Assigned',
  heading_to_pickup: 'Heading to pickup',
  at_pickup: 'At pickup',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  at_dropoff: 'At drop-off',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

type ActiveStatus = Exclude<DeliveryStatus, 'delivered' | 'cancelled' | 'failed'>

const ACTIVE_STATUS_COLOR: Record<DeliveryStatus, { bg: string; text: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  assigned: { bg: colors.infoLight, text: colors.info, icon: Clock },
  heading_to_pickup: { bg: colors.infoLight, text: colors.info, icon: Navigation },
  at_pickup: { bg: colors.warningLight, text: colors.warning, icon: MapPin },
  picked_up: { bg: colors.warningLight, text: colors.warning, icon: Package },
  in_transit: { bg: colors.infoLight, text: colors.info, icon: Navigation },
  at_dropoff: { bg: colors.warningLight, text: colors.warning, icon: MapPin },
  delivered: { bg: colors.successLight, text: colors.success, icon: CheckCircle2 },
  cancelled: { bg: colors.errorLight, text: colors.error, icon: XCircle },
  failed: { bg: colors.errorLight, text: colors.error, icon: XCircle },
}

const HISTORY_STATUS_COLOR = {
  completed: { bg: colors.successLight, text: colors.success, icon: CheckCircle2 },
  cancelled: { bg: colors.errorLight, text: colors.error, icon: XCircle },
} as const

type JobCardTab = JobsTabKey

interface CommonProps {
  testID?: string
  onPress?: () => void
  onAction?: () => void
}

interface AvailableProps extends CommonProps {
  tab: 'available'
  job: JobRequest
}

interface ActiveProps extends CommonProps {
  tab: 'active'
  delivery: ActiveDelivery
}

interface HistoryProps extends CommonProps {
  tab: 'history'
  entry: JobHistoryEntry
}

export type JobCardProps = AvailableProps | ActiveProps | HistoryProps

function JobCardImpl(props: JobCardProps) {
  const { tab, onPress, onAction, testID } = props
  const reduced = useReducedMotion()
  const tt = useTt()
  const scale = useSharedValue(1)

  const pressIn = useCallback(() => {
    if (!reduced) scale.value = withSpring(0.98, { damping: 15, stiffness: 400 })
  }, [reduced])
  const pressOut = useCallback(() => {
    if (!reduced) scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [reduced])

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  // Build per-variant view-model.
  const vm = useCardViewModel(props, tt)

  return (
    <AnimatedTouchable
      testID={testID}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={0.92}
      style={[styles.card, cardStyle]}
      accessibilityRole="button"
      accessibilityLabel={vm.a11yLabel}
      accessibilityHint={vm.a11yHint}
    >
      {/* Header: order ref + right-side status/freshness */}
      <View style={styles.header}>
        <Text style={styles.orderRef} numberOfLines={1}>
          {tt('rider.jobs.activeOrderRef', { ref: vm.orderRef }, `Order ${vm.orderRef}`)}
        </Text>
        {vm.rightPill}
      </View>

      {/* Route hero: pickup → drop-off */}
      <RouteHero
        pickupLabel={vm.pickupLabel}
        dropoffLabel={vm.dropoffLabel}
        pickupSub={vm.pickupSub}
        dropoffSub={vm.dropoffSub}
      />

      {/* Meta row: distance + ETA + vehicle + items */}
      <View style={styles.metaRow}>
        <MetaItem icon={<Navigation size={13} color={colors.textMuted} />} text={vm.distanceLabel} />
        <MetaItem icon={<Clock size={13} color={colors.textMuted} />} text={vm.timeLabel} />
        {vm.vehicleLabel && (
          <MetaItem icon={<Bike size={13} color={colors.textMuted} />} text={vm.vehicleLabel} />
        )}
        {vm.itemsLabel && (
          <MetaItem icon={<Package size={13} color={colors.textMuted} />} text={vm.itemsLabel} />
        )}
      </View>

      {/* Payout + COD row */}
      <View style={styles.moneyRow}>
        <View style={styles.payoutWrap} accessibilityLabel={vm.payoutAria}>
          <Wallet size={14} color={colors.primary} />
          <Text style={styles.payoutLabel}>
            {tt('rider.jobs.jobCard.payout', undefined, 'Payout')}
          </Text>
          <Text style={styles.payoutValue}>{formatNprTabular(vm.payout)}</Text>
        </View>
        {vm.codAmount != null && vm.codAmount > 0 ? (
          <View style={styles.codPill} accessibilityLabel={vm.codAria}>
            <Banknote size={12} color={colors.info} />
            <Text style={styles.codText}>
              {tt('rider.jobs.jobCard.cod', { amount: formatNpr(vm.codAmount) }, `COD ${formatNpr(vm.codAmount)}`)}
            </Text>
          </View>
        ) : (
          <View style={styles.prepaidPill}>
            <Text style={styles.prepaidText}>
              {tt('rider.jobs.jobCard.codNone', undefined, 'Prepaid')}
            </Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Footer: primary action (full-width) */}
      <TouchableOpacity
        onPress={onAction}
        activeOpacity={0.85}
        style={styles.actionBtn}
        accessibilityRole="button"
        accessibilityLabel={vm.actionAria}
      >
        <Text style={styles.actionText}>{vm.actionLabel}</Text>
        <ChevronRight size={16} color={colors.white} />
      </TouchableOpacity>
    </AnimatedTouchable>
  )
}

const JobCard = memo(JobCardImpl)
export default JobCard

/* ----------------------------- view model ----------------------------- */

interface CardViewModel {
  orderRef: string
  pickupLabel: string
  pickupSub?: string
  dropoffLabel: string
  dropoffSub?: string
  distanceLabel: string
  timeLabel: string
  vehicleLabel?: string
  itemsLabel?: string
  itemsAria?: string
  payout: number
  payoutAria: string
  codAmount: number | null
  codAria: string
  rightPill: React.ReactNode
  actionLabel: string
  actionAria: string
  a11yLabel: string
  a11yHint?: string
}

function useCardViewModel(props: JobCardProps, tt: (k: string, v?: Record<string, string | number>, f?: string) => string): CardViewModel {
  if (props.tab === 'available') {
    return availableViewModel(props.job, tt)
  }
  if (props.tab === 'active') {
    return activeViewModel(props.delivery, tt)
  }
  return historyViewModel(props.entry, tt)
}

function availableViewModel(job: JobRequest, tt: (k: string, v?: Record<string, string | number>, f?: string) => string): CardViewModel {
  const tripKm = job.tripDistanceKm.toFixed(1)
  const etaLabel = formatEta(job.etaDropoffMs)
  const vehicle = job.vehicle ? VEHICLE_LABEL[job.vehicle] : null
  const vehicleLabel = vehicle
    ? tt(vehicle.key, undefined, vehicle.fallback)
    : undefined
  const itemCount = job.itemCount ?? 0
  const itemsLabel = job.itemSummary
    ? job.itemSummary
    : itemCount > 0
      ? tt(itemCount === 1 ? 'rider.jobs.jobCard.itemsOne' : 'rider.jobs.jobCard.items', { count: itemCount }, `${itemCount} items`)
      : undefined
  const itemsAria = itemCount > 0
    ? tt('rider.jobs.jobCard.itemsAria', { count: itemCount }, `${itemCount} items`)
    : undefined

  return {
    orderRef: job.orderRef,
    pickupLabel: job.pickupLabel,
    pickupSub: tt('rider.jobs.jobCard.pickup', undefined, 'Pickup'),
    dropoffLabel: job.dropoffLabel,
    dropoffSub: tt('rider.jobs.jobCard.dropoff', undefined, 'Drop-off'),
    distanceLabel: tt('rider.jobs.jobCard.totalDistance', { km: tripKm }, `Trip ${tripKm} km`),
    timeLabel: tt('rider.jobs.jobCard.estTime', { time: etaLabel }, `${etaLabel} est.`),
    vehicleLabel,
    itemsLabel,
    itemsAria,
    payout: job.payout,
    payoutAria: tt('rider.jobs.jobCard.payoutAria', { amount: formatNpr(job.payout) }, `Payout ${formatNpr(job.payout)}`),
    codAmount: job.codAmount ?? null,
    codAria: tt('rider.jobs.jobCard.codAria', { amount: formatNpr(job.codAmount ?? 0) }, `Cash on delivery ${formatNpr(job.codAmount ?? 0)} to collect`),
    rightPill: <FreshnessPill expiresAtMs={job.expiresAtMs} />,
    actionLabel: tt('rider.jobs.jobCard.actionAccept', undefined, 'Accept'),
    actionAria: tt('rider.jobs.jobCard.actionAriaAccept', { ref: job.orderRef, amount: formatNpr(job.payout) }, `Accept job ${job.orderRef}, payout ${formatNpr(job.payout)}`),
    a11yLabel: tt(
      'rider.jobs.jobCard.cardAria',
      {
        ref: job.orderRef,
        pickup: job.pickupLabel,
        dropoff: job.dropoffLabel,
        km: tripKm,
        time: etaLabel,
        amount: formatNpr(job.payout),
        cod: job.codAmount ? `, COD ${formatNpr(job.codAmount)}` : '',
        items: itemsAria ?? '',
        status: '',
      },
      `Job ${job.orderRef}. ${job.pickupLabel} to ${job.dropoffLabel}. Trip ${tripKm} km, ${etaLabel}. Payout ${formatNpr(job.payout)}${job.codAmount ? `, COD ${formatNpr(job.codAmount)}` : ''}. ${itemsAria ?? ''}`.trim(),
    ),
    a11yHint: tt('rider.jobs.jobCard.actionAriaAccept', { ref: job.orderRef, amount: formatNpr(job.payout) }, `Accept job ${job.orderRef}`),
  }
}

function activeViewModel(d: ActiveDelivery, tt: (k: string, v?: Record<string, string | number>, f?: string) => string): CardViewModel {
  const status = d.status
  const etaLabel = formatEta(d.etaDropoffMs)
  const tripKm = (d.distanceMeters / 1000).toFixed(1)
  const sc = ACTIVE_STATUS_COLOR[status]
  const StatusIcon = sc.icon
  const statusLabel = ACTIVE_STATUS_LABEL[status]
  const vehicle = d.pickup ? null : null // active delivery has no vehicle hint in the entity

  return {
    orderRef: d.orderRef,
    pickupLabel: d.pickupLabel || d.pickup.label,
    pickupSub: tt('rider.jobs.jobCard.pickup', undefined, 'Pickup'),
    dropoffLabel: d.dropoffLabel || d.dropoff.label,
    dropoffSub: tt('rider.jobs.jobCard.dropoff', undefined, 'Drop-off'),
    distanceLabel: tt('rider.jobs.jobCard.totalDistance', { km: tripKm }, `Trip ${tripKm} km`),
    timeLabel: tt('rider.jobs.jobCard.estTime', { time: etaLabel }, `${etaLabel} est.`),
    vehicleLabel: undefined,
    itemsLabel: undefined,
    itemsAria: undefined,
    payout: d.payout,
    payoutAria: tt('rider.jobs.jobCard.payoutAria', { amount: formatNpr(d.payout) }, `Payout ${formatNpr(d.payout)}`),
    codAmount: d.isCod ? d.codAmount : null,
    codAria: tt('rider.jobs.jobCard.codAria', { amount: formatNpr(d.codAmount) }, `Cash on delivery ${formatNpr(d.codAmount)} to collect`),
    rightPill: (
      <View style={[styles.statusPill, { backgroundColor: sc.bg }]} accessibilityLabel={tt('rider.jobs.jobCard.statusAria', { status: statusLabel }, `Status: ${statusLabel}`)}>
        <StatusIcon size={12} color={sc.text} />
        <Text style={[styles.statusPillText, { color: sc.text }]}>{statusLabel}</Text>
      </View>
    ),
    actionLabel: tt('rider.jobs.jobCard.actionResume', undefined, 'Resume'),
    actionAria: tt('rider.jobs.jobCard.actionAriaResume', { ref: d.orderRef }, `Resume active delivery ${d.orderRef}`),
    a11yLabel: tt(
      'rider.jobs.jobCard.cardAria',
      {
        ref: d.orderRef,
        pickup: d.pickupLabel || d.pickup.label,
        dropoff: d.dropoffLabel || d.dropoff.label,
        km: tripKm,
        time: etaLabel,
        amount: formatNpr(d.payout),
        cod: d.isCod ? `, COD ${formatNpr(d.codAmount)}` : '',
        items: '',
        status: statusLabel,
      },
      `Job ${d.orderRef}. ${d.pickupLabel || d.pickup.label} to ${d.dropoffLabel || d.dropoff.label}. Trip ${tripKm} km, ${etaLabel}. Payout ${formatNpr(d.payout)}${d.isCod ? `, COD ${formatNpr(d.codAmount)}` : ''}. ${statusLabel}`.trim(),
    ),
    a11yHint: tt('rider.jobs.jobCard.actionAriaResume', { ref: d.orderRef }, `Resume active delivery ${d.orderRef}`),
  }
}

function historyViewModel(e: JobHistoryEntry, tt: (k: string, v?: Record<string, string | number>, f?: string) => string): CardViewModel {
  const isCompleted = e.status === 'completed'
  const sc = HISTORY_STATUS_COLOR[e.status]
  const StatusIcon = sc.icon
  const statusLabel = isCompleted
    ? tt('rider.jobs.jobCard.statusCompleted', undefined, 'Completed')
    : tt('rider.jobs.jobCard.statusCancelled', undefined, 'Cancelled')
  const tripKm = (e.tripDistanceKm ?? 0).toFixed(1)
  const timeLabel = e.durationMin != null ? formatDuration(e.durationMin) : formatClock(e.finishedAt)
  const vehicle = e.vehicle ? VEHICLE_LABEL[e.vehicle] : null
  const vehicleLabel = vehicle ? tt(vehicle.key, undefined, vehicle.fallback) : undefined
  const itemCount = e.itemCount ?? 0
  const itemsLabel = e.itemSummary
    ? e.itemSummary
    : itemCount > 0
      ? tt(itemCount === 1 ? 'rider.jobs.jobCard.itemsOne' : 'rider.jobs.jobCard.items', { count: itemCount }, `${itemCount} items`)
      : undefined
  const itemsAria = itemCount > 0
    ? tt('rider.jobs.jobCard.itemsAria', { count: itemCount }, `${itemCount} items`)
    : undefined

  return {
    orderRef: e.orderRef,
    pickupLabel: e.pickupLabel,
    pickupSub: tt('rider.jobs.jobCard.pickup', undefined, 'Pickup'),
    dropoffLabel: e.dropoffLabel,
    dropoffSub: tt('rider.jobs.jobCard.dropoff', undefined, 'Drop-off'),
    distanceLabel: tt('rider.jobs.jobCard.totalDistance', { km: tripKm }, `Trip ${tripKm} km`),
    timeLabel,
    vehicleLabel,
    itemsLabel,
    itemsAria,
    payout: e.payout,
    payoutAria: tt('rider.jobs.jobCard.payoutAria', { amount: formatNpr(e.payout) }, `Payout ${formatNpr(e.payout)}`),
    codAmount: e.codAmount && e.codAmount > 0 ? e.codAmount : null,
    codAria: tt('rider.jobs.jobCard.codAria', { amount: formatNpr(e.codAmount ?? 0) }, `Cash on delivery ${formatNpr(e.codAmount ?? 0)} to collect`),
    rightPill: (
      <View style={[styles.statusPill, { backgroundColor: sc.bg }]} accessibilityLabel={tt('rider.jobs.jobCard.statusAria', { status: statusLabel }, `Status: ${statusLabel}`)}>
        <StatusIcon size={12} color={sc.text} />
        <Text style={[styles.statusPillText, { color: sc.text }]}>{statusLabel}</Text>
      </View>
    ),
    actionLabel: tt('rider.jobs.jobCard.actionReceipt', undefined, 'View receipt'),
    actionAria: tt('rider.jobs.jobCard.actionAriaReceipt', { ref: e.orderRef }, `View receipt for job ${e.orderRef}`),
    a11yLabel: tt(
      'rider.jobs.jobCard.cardAria',
      {
        ref: e.orderRef,
        pickup: e.pickupLabel,
        dropoff: e.dropoffLabel,
        km: tripKm,
        time: timeLabel,
        amount: formatNpr(e.payout),
        cod: e.codAmount && e.codAmount > 0 ? `, COD ${formatNpr(e.codAmount)}` : '',
        items: itemsAria ?? '',
        status: statusLabel,
      },
      `Job ${e.orderRef}. ${e.pickupLabel} to ${e.dropoffLabel}. Trip ${tripKm} km, ${timeLabel}. Payout ${formatNpr(e.payout)}${e.codAmount && e.codAmount > 0 ? `, COD ${formatNpr(e.codAmount)}` : ''}. ${itemsAria ?? ''}. ${statusLabel}`.trim(),
    ),
    a11yHint: tt('rider.jobs.jobCard.actionAriaReceipt', { ref: e.orderRef }, `View receipt for job ${e.orderRef}`),
  }
}

/* ----------------------------- sub-pieces ----------------------------- */

function RouteHero({
  pickupLabel,
  dropoffLabel,
  pickupSub,
  dropoffSub,
}: {
  pickupLabel: string
  dropoffLabel: string
  pickupSub?: string
  dropoffSub?: string
}) {
  return (
    <View style={styles.route}>
      <View style={styles.routeRow}>
        <View style={styles.routeDotPrimary} />
        <View style={styles.routeTextWrap}>
          <Text style={styles.routeLabel} numberOfLines={1}>{pickupLabel}</Text>
          {pickupSub && <Text style={styles.routeSub}>{pickupSub}</Text>}
        </View>
      </View>
      <View style={styles.routeConnector} />
      <View style={styles.routeRow}>
        <View style={styles.routeDotDropoff} />
        <View style={styles.routeTextWrap}>
          <Text style={styles.routeLabel} numberOfLines={1}>{dropoffLabel}</Text>
          {dropoffSub && <Text style={styles.routeSub}>{dropoffSub}</Text>}
        </View>
      </View>
    </View>
  )
}

function MetaItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.metaItem}>
      {icon}
      <Text style={styles.metaText}>{text}</Text>
    </View>
  )
}

/** Freshness / expiry countdown pill for available jobs. */
function FreshnessPill({ expiresAtMs }: { expiresAtMs?: number }) {
  const tt = useTt()
  const [now, setNow] = useState(Date.now())

  // Tick every second so the countdown stays live while the card is mounted.
  useEffect(() => {
    if (expiresAtMs == null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAtMs])

  if (expiresAtMs == null) return <View style={styles.freshnessEmpty} />

  const countdown = formatCountdown(expiresAtMs, now)
  if (countdown == null) {
    // Expired — announce once.
    const expiredLabel = tt('rider.jobs.jobCard.freshnessExpired', undefined, 'Expired')
    return (
      <View
        style={[styles.freshnessPill, styles.freshnessExpired]}
        accessibilityLabel={expiredLabel}
      >
        <Timer size={11} color={colors.error} />
        <Text style={[styles.freshnessText, { color: colors.error }]}>{expiredLabel}</Text>
      </View>
    )
  }

  const soon = expiresAtMs - now <= 30_000
  const aria = tt('rider.jobs.jobCard.freshnessAria', { time: countdown }, `Request expires in ${countdown}`)
  const label = tt('rider.jobs.jobCard.freshnessLabel', undefined, 'Expires in')
  return (
    <View
      style={[styles.freshnessPill, soon && styles.freshnessSoon]}
      accessibilityLabel={aria}
    >
      <Timer size={11} color={soon ? colors.error : colors.textMuted} />
      <Text style={[styles.freshnessText, { color: soon ? colors.error : colors.textMuted }]}>
        {label} {countdown}
      </Text>
    </View>
  )
}

/* ----------------------------- skeleton ----------------------------- */

export function JobCardSkeleton({ testID }: { testID?: string }) {
  const tt = useTt()
  const aria = tt('rider.jobs.jobCard.skeletonAria', undefined, 'Loading job')
  return (
    <View
      testID={testID}
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={aria}
      accessibilityState={{ busy: true }}
    >
      {/* header */}
      <View style={styles.header}>
        <View style={styles.skelOrderRef} />
        <View style={styles.skelPill} />
      </View>
      {/* route hero */}
      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={styles.skelDot} />
          <View style={styles.skelRouteLine} />
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={styles.skelDot} />
          <View style={styles.skelRouteLineShort} />
        </View>
      </View>
      {/* meta */}
      <View style={styles.metaRow}>
        <View style={styles.skelMeta} />
        <View style={styles.skelMeta} />
        <View style={styles.skelMetaShort} />
      </View>
      {/* money */}
      <View style={styles.moneyRow}>
        <View style={styles.skelPayout} />
        <View style={styles.skelCod} />
      </View>
      <View style={styles.divider} />
      {/* action */}
      <View style={styles.skelAction} />
    </View>
  )
}

/* ----------------------------- styles ----------------------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing[4],
    gap: spacing[3],
    ...shadow('sm'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  orderRef: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  route: { gap: spacing[1] },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  routeDotPrimary: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  routeDotDropoff: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.textTertiary,
  },
  routeTextWrap: { flex: 1, gap: 1 },
  routeLabel: {
    fontSize: fontSize.base[0],
    fontWeight: '500',
    color: colors.text,
  },
  routeSub: {
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
  },
  routeConnector: {
    marginLeft: 4,
    width: 2,
    height: 12,
    backgroundColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  metaText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontWeight: '500',
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  payoutWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  payoutLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontWeight: '500',
  },
  payoutValue: {
    fontSize: fontSize.md[0],
    fontFamily: fontFamily.sansBold[0],
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  codPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  codText: {
    fontSize: fontSize.sm[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.info,
    fontVariant: ['tabular-nums'],
  },
  prepaidPill: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  prepaidText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontWeight: '500',
  },
  divider: { height: 1, backgroundColor: colors.borderLight },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing[2.5],
    minHeight: 48,
  },
  actionText: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.white,
  },
  // status / freshness pills
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  statusPillText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
  },
  freshnessEmpty: { width: 0, height: 0 },
  freshnessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
  },
  freshnessSoon: {
    backgroundColor: colors.errorLight,
  },
  freshnessText: {
    fontSize: fontSize.xs[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  freshnessExpired: {
    backgroundColor: colors.errorLight,
  },
  // skeleton
  skelOrderRef: { width: 120, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skelPill: { width: 72, height: 22, borderRadius: radii.full, backgroundColor: colors.shimmer },
  skelDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.shimmer },
  skelRouteLine: { flex: 1, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skelRouteLineShort: { width: 120, height: 14, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skelMeta: { width: 80, height: 22, borderRadius: radii.full, backgroundColor: colors.shimmer },
  skelMetaShort: { width: 56, height: 22, borderRadius: radii.full, backgroundColor: colors.shimmer },
  skelPayout: { width: 110, height: 18, borderRadius: radii.sm, backgroundColor: colors.shimmer },
  skelCod: { width: 72, height: 22, borderRadius: radii.full, backgroundColor: colors.shimmer },
  skelAction: { width: '100%', height: 48, borderRadius: radii.md, backgroundColor: colors.shimmer },
})
