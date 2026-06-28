import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Clock,
  LifeBuoy,
  CircleCheck,
  CircleAlert,
  RefreshCw,
  PartyPopper,
  ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useRiderSessionStore } from '@chinooz/state'
import { useRiderApprovalStatus } from '@chinooz/hooks'
import type { RiderVerificationItem } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { SlideUp } from '@chinooz/ui/Animate'
import { analytics } from '@chinooz/analytics'
import LanguageToggle from '../components/LanguageToggle'
import { PendingSkeleton, OnboardingError } from '../components/OnboardingStates'

type ItemStatus = 'pending' | 'verified' | 'rejected'

/**
 * RO6 — rider approval / pending state.
 *
 * Shows per-item verification status, estimated time, and a support link.
 * When rejected, shows reasons and a resubmit path. When approved, offers
 * a go-online checklist CTA. Also the landing screen for existing pending
 * riders from RO2 (OTP branching).
 */
export default function PendingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const logout = useRiderSessionStore(s => s.logout)

  const { data: result, isLoading: loading, isError: error, refetch, isRefetching } = useRiderApprovalStatus('rider-pending')

  useEffect(() => {
    analytics.screen({ name: 'rider-pending' })
  }, [])

  const handleRefresh = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    refetch()
  }, [refetch])

  const handleLogout = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_pending_logout' })
    logout()
    router.replace('/welcome')
  }, [logout, router])

  const handleSupport = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_pending_support' })
    router.push('/support')
  }, [router])

  const handleResubmit = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_pending_resubmit' })
    router.push('/onboarding/documents')
  }, [router])

  const handleGoOnline = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_pending_go_online' })
    router.push('/go-online')
  }, [router])

  const isRejected = result?.state === 'rejected'
  const isApproved = result?.state === 'approved'

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      {loading ? (
        <PendingSkeleton ariaLabel={t('rider.onboarding.states.loadingPendingAria')} />
      ) : error ? (
        <OnboardingError
          title={t('rider.onboarding.states.errorTitle')}
          body={t('rider.onboarding.states.errorBody')}
          ariaLabel={t('rider.onboarding.states.errorTitle')}
          retryLabel={t('rider.onboarding.states.errorRetry')}
          retryAria={t('rider.onboarding.states.errorRetryAria')}
          calmText={t('rider.onboarding.states.progressSaved')}
          onRetry={() => refetch()}
        />
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Status region — announced as status for screen readers */}
        <View
          accessibilityRole="summary"
          accessibilityLiveRegion="polite"
        >
          <SlideUp delay={reduced ? 0 : 100} distance={reduced ? 0 : 20}>
            <View style={[styles.iconWrap, isRejected && styles.iconWrapRejected, isApproved && styles.iconWrapApproved]} accessibilityRole="image">
              {isApproved ? (
                <PartyPopper size={40} color={colors.success} strokeWidth={2} />
              ) : isRejected ? (
                <CircleAlert size={40} color={colors.error} strokeWidth={2} />
              ) : (
                <Clock size={40} color={colors.primary} strokeWidth={2} />
              )}
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {isApproved
                ? t('rider.pending.approvedTitle')
                : isRejected
                  ? t('rider.pending.statusRejected')
                  : t('rider.pending.title')}
            </Text>
            <Text style={styles.subtitle}>
              {isApproved
                ? t('rider.pending.approvedBody')
                : isRejected
                  ? t('rider.pending.rejectionReason')
                  : t('rider.pending.subtitle')}
            </Text>
            {!isApproved && !isRejected && result ? (
              <Text style={styles.estimatedTime}>
                {t('rider.pending.estimatedTime').replace('{{hours}}', String(result.estimatedTimeHours))}
              </Text>
            ) : null}
            {!isApproved && !isRejected ? (
              <Text style={styles.hint}>{t('rider.pending.hint')}</Text>
            ) : null}
          </SlideUp>
        </View>

        {/* Per-item verification status */}
        {result && !isApproved ? (
          <SlideUp delay={reduced ? 0 : 200} distance={reduced ? 0 : 12}>
            <View style={styles.verificationSection}>
              <Text style={styles.verificationTitle} accessibilityRole="header">
                {t('rider.pending.verificationTitle')}
              </Text>
              <View style={styles.verificationList}>
                {result.items.map((item: RiderVerificationItem) => (
                  <VerificationPill
                    key={item.key}
                    label={t(item.labelKey)}
                    status={item.status}
                    reason={item.rejectionReasonKey ? t(item.rejectionReasonKey) : undefined}
                  />
                ))}
              </View>
            </View>
          </SlideUp>
        ) : null}

        {/* Rejection → resubmit path */}
        {isRejected ? (
          <SlideUp delay={reduced ? 0 : 300} distance={reduced ? 0 : 12}>
            <View style={styles.resubmitCard}>
              <Text style={styles.resubmitBody}>
                {t('rider.pending.resubmitBody')}
              </Text>
              <TouchableOpacity
                onPress={handleResubmit}
                style={styles.resubmitBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('rider.pending.resubmitAria')}
              >
                <RefreshCw size={18} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.resubmitBtnText}>
                  {t('rider.pending.resubmit')}
                </Text>
              </TouchableOpacity>
            </View>
          </SlideUp>
        ) : null}
      </ScrollView>
      )}

      {/* Footer actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        <SlideUp delay={reduced ? 0 : 250} distance={reduced ? 0 : 12}>
          {isApproved ? (
            <TouchableOpacity
              onPress={handleGoOnline}
              style={styles.goOnlineBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('rider.pending.goOnlineAria')}
            >
              <Text style={styles.goOnlineBtnText}>
                {t('rider.pending.goOnline')}
              </Text>
              <ChevronRight size={20} color={colors.white} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSupport}
              style={styles.supportButton}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('rider.pending.contactSupport')}
            >
              <LifeBuoy size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.supportText}>{t('rider.pending.contactSupport')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('rider.pending.logoutAria')}
          >
            <Text style={styles.logoutText}>{t('rider.pending.logout')}</Text>
          </TouchableOpacity>
        </SlideUp>
      </View>
    </View>
  )
}

// ----- Sub-components ----------------------------------------------------

function VerificationPill({
  label,
  status,
  reason,
}: {
  label: string
  status: ItemStatus
  reason?: string
}) {
  const config = {
    pending: { bg: colors.warningLight, text: colors.warning, icon: Clock },
    verified: { bg: colors.successLight, text: colors.success, icon: CircleCheck },
    rejected: { bg: colors.errorLight, text: colors.error, icon: CircleAlert },
  } as const

  const cfg = config[status]
  const Icon = cfg.icon
  const statusLabel = status === 'pending' ? 'Pending review' : status === 'verified' ? 'Verified' : 'Needs attention'

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]} accessibilityRole="summary">
      <View style={styles.pillHeader}>
        <Icon size={16} color={cfg.text} strokeWidth={2.5} />
        <Text style={[styles.pillLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.pillStatus, { color: cfg.text }]}>
          {statusLabel}
        </Text>
      </View>
      {reason ? (
        <Text style={styles.pillReason} accessibilityRole="alert">
          {reason}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[6],
    gap: spacing[5],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    alignSelf: 'center',
  },
  iconWrapRejected: {
    backgroundColor: colors.errorLight,
  },
  iconWrapApproved: {
    backgroundColor: colors.successLight,
  },
  title: {
    fontSize: fontSize['2xl'][0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansBold[0],
  },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  estimatedTime: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  hint: {
    fontSize: fontSize.sm[0],
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing[1],
  },
  // Verification section
  verificationSection: {
    gap: spacing[3],
  },
  verificationTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  verificationList: {
    gap: spacing[2.5],
  },
  pill: {
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1.5],
  },
  pillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pillLabel: {
    flex: 1,
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  pillStatus: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  pillReason: {
    fontSize: fontSize.xs[0],
    color: colors.error,
    fontFamily: fontFamily.sans[0],
    lineHeight: 16,
    paddingLeft: spacing[4] + spacing[2],
  },
  // Resubmit card
  resubmitCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  resubmitBody: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 18,
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radii.md,
  },
  resubmitBtnText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  // Footer
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  goOnlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: radii.md,
  },
  goOnlineBtnText: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  supportText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
  },
  logoutText: {
    fontSize: fontSize.md[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
})
