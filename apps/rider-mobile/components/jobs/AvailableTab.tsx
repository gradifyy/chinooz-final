import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Navigation, WifiOff, Lock, Landmark } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import type { JobRequest } from './types'
import JobCard from './JobCard'

/** A job is COD when it carries a positive codAmount. */
function isCodJob(job: JobRequest): boolean {
  return !!job.codAmount && job.codAmount > 0
}

interface AvailableTabProps {
  requests: JobRequest[]
  isOnline: boolean
  onGoOnline: () => void
  onAccept?: (job: JobRequest) => void
  /** Open the job detail (RJ4) surface for a request. */
  onView?: (job: JobRequest) => void
  /** True when the rider is at the COD float limit (new COD jobs blocked). */
  codAtLimit?: boolean
  /** Open the deposit / settle flow to unlock COD jobs. */
  onDepositToUnlock?: () => void
}

export default function AvailableTab({
  requests,
  isOnline,
  onGoOnline,
  onAccept,
  onView,
  codAtLimit = false,
  onDepositToUnlock,
}: AvailableTabProps) {
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

  const hasBlockedCod = codAtLimit && requests.some(isCodJob)

  return (
    <View style={styles.list} accessibilityLabel={t('rider.jobs.availableCountAria', { count: requests.length })}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('rider.jobs.availableTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('rider.jobs.availableSubtitle')}</Text>
      </View>

      {hasBlockedCod && (
        <View
          accessibilityRole="summary"
          accessibilityLabel={t('rider.wallet.jobsCodBlockedAria', { limit: '' })}
          accessibilityLiveRegion="polite"
          style={styles.blockedBanner}
        >
          <View style={styles.blockedHeader}>
            <Lock size={16} color={colors.error} />
            <Text style={styles.blockedTitle}>{t('rider.wallet.jobsCodBlockedTitle')}</Text>
          </View>
          <Text style={styles.blockedSub}>{t('rider.wallet.jobsCodBlockedSub')}</Text>
          {onDepositToUnlock && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.wallet.jobsCodBlockedAction')}
              onPress={onDepositToUnlock}
              style={styles.blockedCta}
              activeOpacity={0.9}
            >
              <Landmark size={15} color={colors.white} />
              <Text style={styles.blockedCtaText}>{t('rider.wallet.jobsCodBlockedAction')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {requests.map(job => {
        const blocked = codAtLimit && isCodJob(job)
        if (blocked) {
          return <BlockedJobCard key={job.id} job={job} />
        }
        return (
          <JobCard
            key={job.id}
            tab="available"
            job={job}
            testID={`jobs-available-item-${job.id}`}
            onPress={() => onView?.(job)}
            onAction={() => onAccept?.(job)}
          />
        )
      })}
    </View>
  )
}

function BlockedJobCard({ job }: { job: JobRequest }) {
  const { t } = useTranslation()
  return (
    <View
      style={styles.cardBlocked}
      testID={`jobs-available-item-${job.id}`}
      accessibilityRole="summary"
      accessibilityLabel={t('rider.wallet.jobsCodBlockedTitle')}
    >
      <View style={styles.blockedHeader}>
        <Lock size={16} color={colors.error} />
        <Text style={styles.orderRef}>{t('rider.jobs.activeOrderRef', { ref: job.orderRef })}</Text>
      </View>
      <Text style={styles.blockedSub}>{t('rider.wallet.jobsCodBlockedSub')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[3] },
  sectionHeader: { gap: spacing[1], marginBottom: spacing[1] },
  sectionTitle: { fontSize: fontSize.md[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  sectionSubtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
  blockedBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing[4],
    gap: spacing[2],
  },
  blockedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  blockedTitle: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansBold[0] },
  blockedSub: { fontSize: fontSize.sm[0], color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  blockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radii.lg,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  blockedCtaText: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  cardBlocked: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
    opacity: 0.6,
  },
  orderRef: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text, flex: 1 },
})
