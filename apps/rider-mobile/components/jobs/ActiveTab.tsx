import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { PackageCheck } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import {
  useActiveDeliveryStore,
  hasActiveDelivery,
  type ActiveDelivery,
} from '@chinooz/state'
import JobCard from './JobCard'

/** Type guard so the destructuring below narrows to ActiveDelivery. */
function isActiveDelivery(d: ActiveDelivery | null): d is ActiveDelivery {
  return hasActiveDelivery(d)
}

interface ActiveTabProps {
  /** Resume the active delivery (open the Active route). */
  onResume?: (delivery: ActiveDelivery) => void
  /** Open the job detail (RJ4) surface for the active delivery. */
  onView?: (delivery: ActiveDelivery) => void
}

export default function ActiveTab({ onResume, onView }: ActiveTabProps) {
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

  return (
    <View style={styles.wrap} accessibilityLabel={t('rider.jobs.segmentActiveAria')}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('rider.jobs.activeTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('rider.jobs.activePresentSubtitle')}</Text>
      </View>

      <JobCard
        tab="active"
        delivery={activeDelivery}
        testID="jobs-active-card"
        onPress={() => onView?.(activeDelivery)}
        onAction={() => onResume?.(activeDelivery)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  sectionHeader: { gap: spacing[1], marginBottom: spacing[1] },
  sectionTitle: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
})
