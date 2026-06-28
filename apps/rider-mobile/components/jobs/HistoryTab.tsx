import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Wallet, CheckCircle2, XCircle, History as HistoryIcon } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import type { JobHistoryEntry } from './types'
import { formatNpr, formatClock } from './format'

interface HistoryTabProps {
  entries: JobHistoryEntry[]
}

export default function HistoryTab({ entries }: HistoryTabProps) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return (
      <EmptyState
        testID="jobs-history-empty"
        icon={<HistoryIcon size={40} color={colors.textTertiary} />}
        title={t('rider.jobs.historyEmpty')}
        subtitle={t('rider.jobs.historyEmptySubtitle')}
      />
    )
  }

  return (
    <View style={styles.list} accessibilityLabel={t('rider.jobs.historyCount', { count: entries.length })}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('rider.jobs.historyTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('rider.jobs.historySubtitle')}</Text>
      </View>
      {entries.map(entry => (
        <HistoryCard key={entry.id} entry={entry} />
      ))}
    </View>
  )
}

function HistoryCard({ entry }: { entry: JobHistoryEntry }) {
  const { t } = useTranslation()
  const isCompleted = entry.status === 'completed'
  const StatusIcon = isCompleted ? CheckCircle2 : XCircle
  const statusColor = isCompleted ? colors.success : colors.error

  return (
    <View style={styles.card} testID={`jobs-history-item-${entry.id}`}>
      <View style={styles.cardTop}>
        <Text style={styles.orderRef}>{t('rider.jobs.activeOrderRef', { ref: entry.orderRef })}</Text>
        <View style={[styles.statusPill, { backgroundColor: isCompleted ? colors.successLight : colors.errorLight }]}>
          <StatusIcon size={13} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{entry.status}</Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <MapPin size={15} color={colors.textTertiary} />
          <Text style={styles.routeText} numberOfLines={1}>{entry.pickupLabel}</Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <Navigation size={15} color={colors.textTertiary} />
          <Text style={styles.routeText} numberOfLines={1}>{entry.dropoffLabel}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Wallet size={14} color={colors.primary} />
          <Text style={styles.payout}>{formatNpr(entry.payout)}</Text>
        </View>
        <Text style={styles.finishedAt}>{formatClock(entry.finishedAt)}</Text>
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
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radii.full },
  statusText: { fontSize: fontSize.xs[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', textTransform: 'capitalize' },
  route: { gap: spacing[1] },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  routeText: { flex: 1, fontSize: fontSize.base[0], color: colors.textSecondary },
  routeConnector: { marginLeft: 7, width: 2, height: 10, backgroundColor: colors.border },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  payout: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.primary },
  finishedAt: { fontSize: fontSize.sm[0], color: colors.textTertiary },
})
