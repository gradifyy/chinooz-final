import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { History as HistoryIcon } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import type { JobHistoryEntry } from './types'
import JobCard from './JobCard'

interface HistoryTabProps {
  entries: JobHistoryEntry[]
  /** Open the receipt / job detail (RJ4) surface for a history entry. */
  onView?: (entry: JobHistoryEntry) => void
}

export default function HistoryTab({ entries, onView }: HistoryTabProps) {
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
        <JobCard
          key={entry.id}
          tab="history"
          entry={entry}
          testID={`jobs-history-item-${entry.id}`}
          onPress={() => onView?.(entry)}
          onAction={() => onView?.(entry)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  sectionHeader: { gap: spacing[1], marginBottom: spacing[1] },
  sectionTitle: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
})
