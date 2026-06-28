import React, { useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Navigation,
  MapPin,
  Clock,
  Wallet,
  Banknote,
  Play,
  CheckCircle2,
  XCircle,
  Package,
  Bike,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import {
  useActiveDeliveryStore,
  hasActiveDelivery,
  type ActiveDelivery,
} from '@chinooz/state'
import type { DeliveryStatus } from '@chinooz/types'
import { formatNpr, formatNprTabular, formatEta, formatKm } from './format'
import { ActiveEmptyView } from './JobStateViews'

function useTt() {
  const { t } = useTranslation()
  return useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) => {
      const raw = t(key, vars ?? {})
      if (raw === key || raw === undefined) return fallback ?? key
      return raw
    },
    [t],
  )
}

const STATUS_META: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  assigned: { label: 'Assigned', color: colors.info, bg: colors.infoLight, icon: Clock },
  heading_to_pickup: { label: 'Heading to pickup', color: colors.info, bg: colors.infoLight, icon: Navigation },
  at_pickup: { label: 'At pickup', color: colors.warning, bg: colors.warningLight, icon: MapPin },
  picked_up: { label: 'Picked up', color: colors.warning, bg: colors.warningLight, icon: Package },
  in_transit: { label: 'In transit', color: colors.info, bg: colors.infoLight, icon: Navigation },
  at_dropoff: { label: 'At drop-off', color: colors.warning, bg: colors.warningLight, icon: MapPin },
  delivered: { label: 'Delivered', color: colors.success, bg: colors.successLight, icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: colors.error, bg: colors.errorLight, icon: XCircle },
  failed: { label: 'Failed', color: colors.error, bg: colors.errorLight, icon: XCircle },
}

const FLOW_STEPS: DeliveryStatus[] = ['assigned', 'heading_to_pickup', 'at_pickup', 'picked_up', 'in_transit', 'at_dropoff', 'delivered']

function isActiveDelivery(d: ActiveDelivery | null): d is ActiveDelivery {
  return hasActiveDelivery(d)
}

interface ActiveTabProps {
  onResume?: (delivery: ActiveDelivery) => void
  onView?: (delivery: ActiveDelivery) => void
}

export default function ActiveTab({ onResume, onView }: ActiveTabProps) {
  const tt = useTt()
  const reduced = useReducedMotion()
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)

  const tick = useCallback(() => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
  }, [reduced])

  if (!isActiveDelivery(activeDelivery)) {
    return <ActiveEmptyView testID="jobs-active-empty" />
  }

  const d = activeDelivery
  const statusMeta = STATUS_META[d.status]
  const StatusIcon = statusMeta.icon
  const etaLabel = formatEta(d.etaDropoffMs)
  const tripKm = (d.distanceMeters / 1000).toFixed(1)
  const currentStepIdx = FLOW_STEPS.indexOf(d.status)

  return (
    <View style={styles.wrap} accessibilityLabel={tt('rider.jobs.segmentActiveAria', undefined, 'Active delivery in progress')}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tt('rider.jobs.activeTitle', undefined, 'Active delivery')}</Text>
        <Text style={styles.sectionSubtitle}>{tt('rider.jobs.activePresentSubtitle', undefined, 'Your current in-progress delivery')}</Text>
      </View>

      <View
        style={styles.card}
        testID="jobs-active-card"
        accessibilityRole="summary"
        accessibilityLabel={tt(
          'rider.jobs.active.cardAria',
          { ref: d.orderRef, pickup: d.pickupLabel || d.pickup.label, dropoff: d.dropoffLabel || d.dropoff.label, status: statusMeta.label, amount: formatNpr(d.payout) },
          `Active delivery ${d.orderRef}. ${d.pickupLabel || d.pickup.label} to ${d.dropoffLabel || d.dropoff.label}. Status: ${statusMeta.label}. Payout ${formatNpr(d.payout)}.`,
        )}
      >
        <View style={[styles.statusBanner, { backgroundColor: statusMeta.bg }]}>
          <StatusIcon size={16} color={statusMeta.color} />
          <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.orderRef}>
          {tt('rider.jobs.activeOrderRef', { ref: d.orderRef }, `Order ${d.orderRef}`)}
        </Text>

        <View style={styles.route}>
          <View style={styles.routeRow}>
            <View style={styles.routeDotPrimary} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel} numberOfLines={1}>{d.pickupLabel || d.pickup.label}</Text>
              <Text style={styles.routeSub}>{tt('rider.jobs.jobCard.pickup', undefined, 'Pickup')}</Text>
            </View>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={styles.routeDotDropoff} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel} numberOfLines={1}>{d.dropoffLabel || d.dropoff.label}</Text>
              <Text style={styles.routeSub}>{tt('rider.jobs.jobCard.dropoff', undefined, 'Drop-off')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Navigation size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{tt('rider.jobs.jobCard.totalDistance', { km: tripKm }, `Trip ${tripKm} km`)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{tt('rider.jobs.jobCard.estTime', { time: etaLabel }, `${etaLabel} est.`)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Bike size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatKm(parseFloat(tripKm))}</Text>
          </View>
        </View>

        <View style={styles.moneyRow}>
          <View style={styles.payoutWrap}>
            <Wallet size={14} color={colors.primary} />
            <Text style={styles.payoutLabel}>{tt('rider.jobs.jobCard.payout', undefined, 'Payout')}</Text>
            <Text style={styles.payoutValue}>{formatNprTabular(d.payout)}</Text>
          </View>
          {d.isCod && d.codAmount > 0 ? (
            <View style={styles.codPill}>
              <Banknote size={12} color={colors.info} />
              <Text style={styles.codText}>
                {tt('rider.jobs.jobCard.cod', { amount: formatNpr(d.codAmount) }, `COD ${formatNpr(d.codAmount)}`)}
              </Text>
            </View>
          ) : (
            <View style={styles.prepaidPill}>
              <Text style={styles.prepaidText}>{tt('rider.jobs.jobCard.codNone', undefined, 'Prepaid')}</Text>
            </View>
          )}
        </View>

        {currentStepIdx >= 0 && (
          <View style={styles.stepsRow} accessibilityLabel={tt('rider.jobs.active.progressAria', { step: currentStepIdx + 1, total: FLOW_STEPS.length, status: statusMeta.label }, `Step ${currentStepIdx + 1} of ${FLOW_STEPS.length}: ${statusMeta.label}`)}>
            {FLOW_STEPS.map((step, i) => (
              <View key={step} style={[styles.stepDot, i < currentStepIdx && styles.stepDone, i === currentStepIdx && styles.stepCurrent]} />
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => { tick(); onResume?.(d) }}
          activeOpacity={0.85}
          style={styles.resumeBtn}
          accessibilityRole="button"
          accessibilityLabel={tt('rider.jobs.jobCard.actionAriaResume', { ref: d.orderRef }, `Resume active delivery ${d.orderRef}`)}
          testID="jobs-active-resume"
        >
          <Play size={18} color={colors.white} fill={colors.white} />
          <Text style={styles.resumeText}>{tt('rider.jobs.active.resumeCta', undefined, 'Resume delivery')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  sectionHeader: { gap: spacing[1], marginBottom: spacing[1] },
  sectionTitle: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    gap: spacing[3],
    ...shadow('md'),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
  },
  statusText: { fontSize: fontSize.base[0], fontWeight: '700', fontFamily: fontFamily.sansBold[0] },
  orderRef: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textSecondary, fontFamily: fontFamily.sansSemiBold[0] },
  route: { gap: spacing[1] },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  routeDotPrimary: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.primary },
  routeDotDropoff: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.textTertiary },
  routeTextWrap: { flex: 1, gap: 1 },
  routeLabel: { fontSize: fontSize.base[0], fontWeight: '500', color: colors.text, fontFamily: fontFamily.sans[0] },
  routeSub: { fontSize: fontSize.xs[0], color: colors.textTertiary, fontFamily: fontFamily.sans[0] },
  routeConnector: { marginLeft: 4, width: 2, height: 12, backgroundColor: colors.border },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.background, paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radii.full },
  metaText: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },
  moneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  payoutWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  payoutLabel: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },
  payoutValue: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansBold[0], fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  codPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.infoLight, paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radii.full },
  codText: { fontSize: fontSize.sm[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.info, fontVariant: ['tabular-nums'] },
  prepaidPill: { backgroundColor: colors.borderLight, paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radii.full },
  prepaidText: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },
  stepsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing[1] },
  stepDot: { flex: 1, height: 4, borderRadius: radii.full, backgroundColor: colors.borderLight },
  stepDone: { backgroundColor: colors.success },
  stepCurrent: { backgroundColor: colors.primary },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3.5],
    minHeight: 52,
  },
  resumeText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
