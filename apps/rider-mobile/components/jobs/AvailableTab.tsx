import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Wallet, Clock, WifiOff } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import type { JobRequest } from './types'
import { formatNpr, formatEta } from './format'

interface AvailableTabProps {
  requests: JobRequest[]
  isOnline: boolean
  onGoOnline: () => void
  onAccept?: (job: JobRequest) => void
}

export default function AvailableTab({ requests, isOnline, onGoOnline, onAccept }: AvailableTabProps) {
  const { t } = useTranslation()

  if (!isOnline) {
    return (
      <EmptyState
        testID="jobs-available-offline"
        icon={<WifiOff size={40} color={colors.textTertiary} />}
        title={t('rider.jobs.availableEmptyOfflineTitle')}
        subtitle={t('rider.jobs.availableEmptyOfflineSubtitle')}
        action={{ label: t('rider.jobs.offlineAction'), onPress: onGoOnline }}
      />
    )
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        testID="jobs-available-empty"
        icon={<Navigation size={40} color={colors.textTertiary} />}
        title={t('rider.jobs.availableEmpty')}
        subtitle={t('rider.jobs.availableEmptySubtitle')}
      />
    )
  }

  return (
    <View style={styles.list} accessibilityLabel={t('rider.jobs.availableCountAria', { count: requests.length })}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('rider.jobs.availableTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('rider.jobs.availableSubtitle')}</Text>
      </View>
      {requests.map(job => (
        <AvailableJobCard key={job.id} job={job} onAccept={onAccept} />
      ))}
    </View>
  )
}

function AvailableJobCard({ job, onAccept }: { job: JobRequest; onAccept?: (job: JobRequest) => void }) {
  const { t } = useTranslation()
  return (
    <View style={styles.card} testID={`jobs-available-item-${job.id}`}>
      <View style={styles.cardTop}>
        <Text style={styles.orderRef}>{t('rider.jobs.activeOrderRef', { ref: job.orderRef })}</Text>
        <Text style={styles.payout}>{formatNpr(job.payout)}</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <MapPin size={16} color={colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{job.pickupLabel}</Text>
          <Text style={styles.routeMeta}>{job.pickupDistanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <Navigation size={16} color={colors.textMuted} />
          <Text style={styles.routeText} numberOfLines={1}>{job.dropoffLabel}</Text>
          <Text style={styles.routeMeta}>{job.tripDistanceKm.toFixed(1)} km</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaPill}>
          <Clock size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatEta(job.etaDropoffMs)}</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t('rider.jobs.offlineAction')}, ${formatNpr(job.payout)}`}
          onPress={() => onAccept?.(job)}
          style={styles.acceptBtn}
        >
          <Wallet size={15} color={colors.white} />
          <Text style={styles.acceptText}>{formatNpr(job.payout)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
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
  orderRef: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  payout: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansBold[0], fontWeight: '700', color: colors.primary },
  route: { gap: spacing[1] },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  routeText: { flex: 1, fontSize: fontSize.base[0], color: colors.textSecondary },
  routeMeta: { fontSize: fontSize.sm[0], color: colors.textTertiary, fontWeight: '500' },
  routeConnector: { marginLeft: 7, width: 2, height: 10, backgroundColor: colors.border },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[2] },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.background, paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radii.full },
  metaText: { fontSize: fontSize.sm[0], color: colors.textMuted, fontWeight: '500' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.primary, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radii.lg, minHeight: 44 },
  acceptText: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.white },
})
