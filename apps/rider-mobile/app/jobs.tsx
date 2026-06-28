import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  AccessibilityInfo,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Circle, Radio, Flame, ChevronRight } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { SegmentedControl } from '@chinooz/ui'
import { useOnlineStatusStore, useActiveDeliveryStore, hasActiveDelivery, useCodLimitStatus } from '@chinooz/state'
import { jobRequestToActivePayload } from '@chinooz/rs3'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../components/A11yProvider'
import AvailableTab from '../components/jobs/AvailableTab'
import ActiveTab from '../components/jobs/ActiveTab'
import HistoryTab from '../components/jobs/HistoryTab'
import OfflinePrompt from '../components/jobs/OfflinePrompt'
import ResumeBanner from '../components/active/ResumeBanner'
import { AVAILABLE_REQUESTS, HISTORY_ENTRIES } from '../components/jobs/fixtures'
import type { JobsTabKey, JobRequest } from '../components/jobs/types'

const REFRESH_MS = 900

export default function JobsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { reducedMotion } = useA11y()

  const status = useOnlineStatusStore(s => s.status)
  const setOnlineStatus = useOnlineStatusStore(s => s.setOnlineStatus)
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)
  const acceptJob = useActiveDeliveryStore(s => s.acceptJob)
  const resume = useActiveDeliveryStore(s => s.resume)

  // COD float limit — at limit, new COD jobs are blocked (shared store).
  const codLimitStatus = useCodLimitStatus()
  const codAtLimit = codLimitStatus.kind === 'atLimit'

  const [tab, setTab] = useState<JobsTabKey>('available')
  const [refreshing, setRefreshing] = useState(false)

  const isOnline = status === 'online'

  useEffect(() => {
    analytics.screen({ name: 'rider-jobs' })
  }, [])

  // Available count is only meaningful when online.
  const availableCount = isOnline ? AVAILABLE_REQUESTS.length : 0
  const activeCount = activeDelivery ? 1 : 0

  const segments = useMemo(
    () => [
      {
        key: 'available' as const,
        label: t('rider.jobs.tabAvailable'),
        badge: availableCount,
      },
      {
        key: 'active' as const,
        label: t('rider.jobs.tabActive'),
        badge: activeCount,
      },
      {
        key: 'history' as const,
        label: t('rider.jobs.tabHistory'),
      },
    ],
    [t, availableCount, activeCount],
  )

  const statusLabel = isOnline
    ? t('rider.jobs.statusOnline')
    : status === 'paused'
      ? t('rider.jobs.statusPaused')
      : t('rider.jobs.statusOffline')

  const statusDotColor = isOnline ? colors.success : status === 'paused' ? colors.warning : colors.textTertiary
  const StatusIcon = isOnline ? Radio : Circle

  const handleGoOnline = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    setOnlineStatus('online')
  }, [setOnlineStatus, reducedMotion])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    AccessibilityInfo.announceForAccessibility(t('rider.jobs.refreshing'))
    setTimeout(() => {
      setRefreshing(false)
      AccessibilityInfo.announceForAccessibility(t('rider.jobs.refreshed'))
    }, REFRESH_MS)
  }, [t])

  const handleTabChange = useCallback((key: string) => {
    setTab(key as JobsTabKey)
  }, [])

  // Accept a job: convert the Jobs-shell request into an RS3 active-delivery
  // payload, store it as the single source of truth, and launch the Active
  // Delivery route.
  const handleAccept = useCallback((job: JobRequest) => {
    try {
      if (!reducedMotion) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {}
    const payload = jobRequestToActivePayload(job)
    acceptJob(payload)
    analytics.track({ name: 'rider_accept_job', properties: { jobId: job.id, orderRef: job.orderRef } })
    router.push('/active')
  }, [reducedMotion, acceptJob, router])

  const handleResume = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    resume()
    router.push('/active')
  }, [reducedMotion, resume, router])

  const handleOpenHotspots = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    analytics.track({ name: 'rider_open_hotspots' })
    router.push('/hotspots')
  }, [reducedMotion, router])

  // Open the Cash & COD Wallet deposit flow to unlock blocked COD jobs.
  const handleDepositToUnlock = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    analytics.track({ name: 'rider_cod_deposit_to_unlock' })
    router.push('/wallet/deposit' as never)
  }, [reducedMotion, router])

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <View style={styles.headerRow}>
          <View>
            <Text accessibilityRole="header" style={styles.title}>
              {t('rider.jobs.title')}
            </Text>
            <Text style={styles.subtitle}>{t('rider.jobs.availableSubtitle')}</Text>
          </View>
          <View
            style={styles.statusPill}
            accessibilityRole="header"
            accessibilityLabel={t('rider.jobs.statusAria', { status: statusLabel })}
            testID="jobs-status-pill"
          >
            <StatusIcon size={13} color={statusDotColor} />
            <Text style={[styles.statusText, { color: statusDotColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.segmentWrap}>
          <SegmentedControl
            segments={segments}
            activeKey={tab}
            onChange={handleTabChange}
            testID="jobs-segmented-control"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing[6] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel={t('rider.jobs.pullToRefresh')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Demand hotspots entry — reachable from Jobs (not a bottom tab) */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.jobs.entryHotspotsAria')}
          accessibilityHint={t('rider.jobs.entryHotspotsSub')}
          onPress={handleOpenHotspots}
          style={styles.hotspotsEntry}
          testID="jobs-hotspots-entry"
        >
          <View style={styles.hotspotsIcon}>
            <Flame size={18} color={colors.primary} />
          </View>
          <View style={styles.hotspotsBody}>
            <Text style={styles.hotspotsTitle}>{t('rider.jobs.entryHotspots')}</Text>
            <Text style={styles.hotspotsSub} numberOfLines={1}>
              {t('rider.jobs.entryHotspotsSub')}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {!isOnline && tab === 'available' && (
          <OfflinePrompt onGoOnline={handleGoOnline} />
        )}

        {/* Resume banner: minimized active delivery stays reachable from Jobs. */}
        {activeDelivery?.minimized && hasActiveDelivery(activeDelivery) && (
          <ResumeBanner
            delivery={activeDelivery}
            onResume={handleResume}
            onDismiss={handleResume}
            style={styles.resumeBanner}
          />
        )}

        {tab === 'available' && (
          <AvailableTab
            requests={AVAILABLE_REQUESTS}
            isOnline={isOnline}
            onGoOnline={handleGoOnline}
            onAccept={handleAccept}
            codAtLimit={codAtLimit}
            onDepositToUnlock={handleDepositToUnlock}
          />
        )}
        {tab === 'active' && <ActiveTab />}
        {tab === 'history' && <HistoryTab entries={HISTORY_ENTRIES} />}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing[3],
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[3] },
  title: { fontSize: fontSize.xl[0], fontFamily: fontFamily.sansBold[0], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusText: { fontSize: fontSize.sm[0], fontFamily: fontFamily.sansSemiBold[0], fontWeight: '600' },
  segmentWrap: { marginTop: spacing[1] },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing[2], paddingTop: spacing[2] },
  hotspotsEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primary50,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    minHeight: 48,
  },
  hotspotsIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotsBody: { flex: 1, gap: 2 },
  hotspotsTitle: {
    fontSize: fontSize.base[0],
    fontFamily: fontFamily.sansSemiBold[0],
    fontWeight: '600',
    color: colors.text,
  },
  hotspotsSub: { fontSize: fontSize.sm[0], color: colors.textMuted },
  resumeBanner: {
    marginHorizontal: spacing[4],
  },
})
