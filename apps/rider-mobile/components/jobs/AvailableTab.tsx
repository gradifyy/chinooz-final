import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation, Wallet, Clock, WifiOff, Lock, Landmark, Banknote } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { EmptyState } from '@chinooz/ui'
import type { JobRequest } from './types'
import { formatNpr, formatEta } from './format'

/** A job is COD when it carries a positive codAmount. */
function isCodJob(job: JobRequest): boolean {
  return !!job.codAmount && job.codAmount > 0
}

interface AvailableTabProps {
  requests: JobRequest[]
  isOnline: boolean
  onGoOnline: () => void
  onAccept?: (job: JobRequest) => void
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

      {requests.map(job => (
        <AvailableJobCard
          key={job.id}
          job={job}
          onAccept={onAccept}
          blocked={codAtLimit && isCodJob(job)}
        />
      ))}
    </View>
  )
}

function AvailableJobCard({
  job,
  onAccept,
  blocked,
}: {
  job: JobRequest
  onAccept?: (job: JobRequest) => void
  blocked?: boolean
}) {
  const { t } = useTranslation()
  const isCod = isCodJob(job)
  return (
    <View
      style={[styles.card, blocked && styles.cardBlocked]}
      testID={`jobs-available-item-${job.id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.orderRefWrap}>
          <Text style={styles.orderRef}>{t('rider.jobs.activeOrderRef', { ref: job.orderRef })}</Text>
          {isCod && (
            <View style={styles.codPill}>
              <Banknote size={11} color={blocked ? colors.textTertiary : colors.primary} />
              <Text style={[styles.codPillText, blocked && styles.codPillTextBlocked]}>COD</Text>
            </View>
          )}
        </View>
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

        {blocked ? (
          <View
            accessibilityRole="summary"
            accessibilityLabel={t('rider.wallet.jobsCodBlockedTitle')}
            style={styles.acceptBtnBlocked}
          >
            <Lock size={15} color={colors.textTertiary} />
            <Text style={styles.acceptTextBlocked}>{t('rider.wallet.statusAtLimit')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t('rider.jobs.offlineAction')}, ${formatNpr(job.payout)}`}
            onPress={() => onAccept?.(job)}
            style={styles.acceptBtn}
          >
            <Wallet size={15} color={colors.white} />
            <Text style={styles.acceptText}>{formatNpr(job.payout)}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardBlocked: {
    opacity: 0.55,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRefWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  orderRef: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.text },
  codPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
  },
  codPillText: { fontSize: 10, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  codPillTextBlocked: { color: colors.textTertiary },
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
  acceptBtnBlocked: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.background, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radii.lg, minHeight: 44, borderWidth: 1, borderColor: colors.border },
  acceptTextBlocked: { fontSize: fontSize.base[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600', color: colors.textTertiary },
})
