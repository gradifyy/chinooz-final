import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Wallet, Clock, PackageCheck } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import {
  useActiveDeliveryStore,
  hasActiveDelivery,
  type ActiveDelivery,
} from '@chinooz/state'
import type { DeliveryStatus } from '@chinooz/types'
import { formatNpr, formatEta, formatClock } from './format'

const STATUS_LABELS: Record<DeliveryStatus, string> = {
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

/** Type guard so the destructuring below narrows to ActiveDelivery. */
function isActiveDelivery(d: ActiveDelivery | null): d is ActiveDelivery {
  return hasActiveDelivery(d)
}

export default function ActiveTab() {
  const { t } = useTranslation()
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)

  if (!isActiveDelivery(activeDelivery)) {
    return (
      <EmptyState
        testID="jobs-active-empty"
        icon={<PackageCheck size={40} color={colors.textTertiary} />}
        title={t('rider.jobs.activeEmpty')}
        subtitle={t('rider.jobs.activeEmptySubtitle')}
      />
    )
  }

  const { orderRef, pickupLabel, dropoffLabel, payout, status, acceptedAt, etaDropoffMs } = activeDelivery

  return (
    <View style={styles.wrap} accessibilityLabel={t('rider.jobs.segmentActiveAria')}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('rider.jobs.activeTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('rider.jobs.activePresentSubtitle')}</Text>
      </View>

      <View style={styles.card} testID="jobs-active-card">
        <View style={styles.cardTop}>
          <Text style={styles.orderRef}>{t('rider.jobs.activeOrderRef', { ref: orderRef })}</Text>
          <View style={styles.stagePill}>
            <Text style={styles.stageText}>{STATUS_LABELS[status]}</Text>
          </View>
        </View>

        <View style={styles.route}>
          <View style={styles.routeRow}>
            <View style={styles.dotPrimary} />
            <Text style={styles.routeText} numberOfLines={1}>{pickupLabel}</Text>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={styles.dotMuted} />
            <Text style={styles.routeText} numberOfLines={1}>{dropoffLabel}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Wallet size={15} color={colors.primary} />
            <Text style={styles.metaLabel}>{t('rider.jobs.activePayout')}</Text>
            <Text style={styles.metaValue}>{formatNpr(payout)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={15} color={colors.textMuted} />
            <Text style={styles.metaLabel}>{t('rider.jobs.activeEta', { eta: formatEta(etaDropoffMs) })}</Text>
          </View>
        </View>

        <View style={styles.acceptedAtRow}>
          <MapPin size={13} color={colors.textTertiary} />
          <Text style={styles.acceptedAtText}>{formatClock(acceptedAt)}</Text>
        </View>
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
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansBold[0], fontWeight: '700', color: colors.text },
  stagePill: { backgroundColor: colors.primary50, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radii.full },
  stageText: { fontSize: fontSize.sm[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.primary },
  route: { gap: spacing[1] },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dotPrimary: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.primary },
  dotMuted: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.textTertiary },
  routeText: { flex: 1, fontSize: fontSize.base[0], color: colors.textSecondary },
  routeConnector: { marginLeft: 4, width: 2, height: 12, backgroundColor: colors.border },
  divider: { height: 1, backgroundColor: colors.borderLight },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1 },
  metaLabel: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500' },
  metaValue: { fontSize: fontSize.base[0], color: colors.text, fontWeight: '600' },
  acceptedAtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  acceptedAtText: { fontSize: fontSize.sm[0], color: colors.textTertiary },
})
