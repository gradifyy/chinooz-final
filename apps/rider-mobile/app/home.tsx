import React, { useCallback, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Target, ChevronRight, Wallet, AlertTriangle, Lock, Bell } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { colors, spacing, radii, fontFamily, fontSize, duration, easing } from '@chinooz/theme'
import { SegmentedControl } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  useOnlineStatusStore,
  useRiderSessionStore,
  useUIStore,
  useRiderIncentivesStore,
  useActiveDeliveryStore,
  useCODWalletStore,
  useCodLimitStatus,
  hasActiveDelivery,
  type OnlineStatus,
  type Locale,
} from '@chinooz/state'
import {
  formatNPRFromPaisa,
  nprToPaisa,
  formatNPR,
} from '@chinooz/utils'
import { useA11y, a11yLabel, a11yHint } from '../components/A11yProvider'
import { useAppActiveCallback, useAppState } from '../components/AppStateProvider'
import OnlineToggle from '../components/OnlineToggle'
import MapSlot from '../components/MapSlot'
import RequestSlot from '../components/RequestSlot'
import SnapshotSlot from '../components/SnapshotSlot'
import ResumeBanner from '../components/active/ResumeBanner'
import QuickControls from '../components/QuickControls'
import StatusIndicators from '../components/StatusIndicators'
import IncentiveNudge from '../components/IncentiveNudge'
import { useSetOnlineStatus } from '@chinooz/hooks'

/**
 * Rider Home — smoke-test screen.
 *
 * Boots with theme + fonts + i18n + query/state providers and renders a
 * themed Rider surface that works in EN + नेपाली. It reuses the shared
 * design-system tokens (@chinooz/theme), the shared SegmentedControl
 * (@chinooz/ui), the shared no-op analytics (@chinooz/analytics), the shared
 * reduced-motion hook (@chinooz/ui/hooks via A11yProvider), and the shared
 * integer-paisa money helpers (@chinooz/utils).
 *
 * A11y + outdoor baseline:
 *  - All tap targets meet the 48dp minimum from useA11y().
 *  - Text scales with Dynamic Type (no hard font-size caps beyond tokens).
 *  - Screen-reader labels via a11yLabel()/a11yHint() for one-handed use.
 *  - High-contrast palette tokens used throughout for sunlight legibility.
 *
 * Battery/data-conscious baseline:
 *  - The online-time tick only runs while the app is foregrounded, via
 *    useAppActiveCallback(). When backgrounded, polling/location/animation
 *    pause automatically.
 */
export default function RiderHomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { minTouchTarget, reducedMotion, isBoldTextEnabled } = useA11y()
  const { isForeground } = useAppState()

  const status = useOnlineStatusStore(s => s.status)
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)
  const resumeActive = useActiveDeliveryStore(s => s.resume)
  const tickOnline = useOnlineStatusStore(s => s.tickOnline)
  const isLoggedIn = useRiderSessionStore(s => s.isLoggedIn)
  const toggleLogin = useRiderSessionStore(s => s.toggleLogin)
  const rider = useRiderSessionStore(s => s.rider)

  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  // Incentives earnings this week — read from the shared store so the entry
  // row shows a live figure seeded by the Incentives hub (RI2). Reachable
  // from Home, not a bottom tab.
  const incentiveThisWeek = useRiderIncentivesStore(s => s.thisWeekNpr)

  // Cash & COD Wallet — cash-in-hand read from the shared codWalletStatus
  // store so the entry row shows the live figure (RW2 reachability). Pushed
  // route, not a bottom tab. The limit status surfaces an at-limit /
  // approaching chip on the entry (RW6).
  const cashInHand = useCODWalletStore(s => s.cashInHand)
  const codLimitStatus = useCodLimitStatus()

  // Mock notification unread count + GPS state. In production these would
  // read from a notifications store and expo-location respectively.
  const unreadNotifications = 2
  const gpsState: 'good' | 'weak' | 'off' = 'good'
  const { connectivity } = useAppState()

  // Toggle via the API mutation (optimistic store update + rollback + analytics).
  const toggleMutation = useSetOnlineStatus()

  const handleToggle = useCallback((next: OnlineStatus) => {
    if (toggleMutation.isPending) return
    toggleMutation.mutate(next, {
      onError: () => {
        // Error state is surfaced via toggleMutation.isError in the UI.
      },
    })
  }, [toggleMutation])

  const handleRetryToggle = useCallback(() => {
    toggleMutation.reset()
    toggleMutation.mutate('online')
  }, [toggleMutation])

  // Reuse the shared no-op analytics wrapper (not a fork).
  useEffect(() => {
    analytics.screen({ name: 'rider-home' })
  }, [])

  // Subtle listening pulse — battery-aware: only animates when online +
  // foregrounded + not reduced-motion. Calm opacity cycle, not a spinner.
  const listeningOpacity = useSharedValue(1)
  useEffect(() => {
    const shouldPulse = status === 'online' && isForeground && !reducedMotion
    if (shouldPulse) {
      listeningOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: duration.slower, easing: Easing.bezier(...easing.easeInOut) }),
          withTiming(1, { duration: duration.slower, easing: Easing.bezier(...easing.easeInOut) }),
        ),
        -1,
        false,
      )
    } else {
      listeningOpacity.value = 1
    }
  }, [status, isForeground, reducedMotion])

  const listeningStyle = useAnimatedStyle(() => ({
    opacity: listeningOpacity.value,
  }))

  // Dev smoke-test: if not logged in, flip the mock login so the smoke-test
  // surface renders without forcing a real onboarding flow.
  useEffect(() => {
    if (!isLoggedIn) toggleLogin()
  }, [isLoggedIn, toggleLogin])

  // Battery/data-conscious online-time tick.
  // Pauses automatically when the app is backgrounded (isForeground=false).
  useAppActiveCallback(
    () => {
      const id = setInterval(() => tickOnline(1), 1000)
      return () => clearInterval(id)
    },
    () => {},
    [tickOnline],
  )

  const greetingKey = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'rider.home.greetingMorning'
    if (h < 17) return 'rider.home.greetingAfternoon'
    if (h < 21) return 'rider.home.greetingEvening'
    return 'rider.home.greetingNight'
  }, [])

  // Reuse the shared integer-paisa money helpers for the smoke-test payout.
  const samplePayoutPaisa = nprToPaisa(125.5)
  const samplePayoutLabel = formatNPRFromPaisa(samplePayoutPaisa)
  const sampleRevenueLabel = formatNPR(0)

  const handleResumeActive = () => {
    analytics.track('rider_resume_active_tapped')
    resumeActive()
    router.push('/active')
  }

  const languageSegments = [
    { key: 'en', label: t('rider.welcome.languageEnglish') },
    { key: 'ne', label: t('rider.welcome.languageNepali') },
  ]

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={t('rider.home.statusHeader')}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            accessibilityRole="header"
            style={[styles.title, isBoldTextEnabled && styles.titleBold]}
          >
            {t(greetingKey)}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {rider.name || t('rider.title')}
          </Text>
        </View>
        <View
          style={styles.statusPill}
          accessibilityRole="header"
          accessibilityLabel={a11yLabel(
            t('rider.home.statusHeader'),
            status === 'online'
              ? t('rider.home.statusOnline')
              : t('rider.home.statusOffline'),
          )}
        >
          <View
            style={[
              styles.statusDot,
              status === 'online' ? styles.statusDotOnline : styles.statusDotOffline,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              status === 'online' ? styles.statusTextOnline : styles.statusTextOffline,
            ]}
          >
            {status === 'online'
              ? t('rider.home.statusOnline')
              : t('rider.home.statusOffline')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            unreadNotifications > 0
              ? t('rider.home.notifEntryAria', { count: unreadNotifications })
              : t('rider.home.notifEntryAriaZero')
          }
          style={[styles.bellBtn, { minHeight: minTouchTarget, minWidth: minTouchTarget }]}
          onPress={() => { analytics.track('rider_notifications_tapped'); router.push('/notifications') }}
          hitSlop={8}
        >
          <Bell size={20} color={colors.textSecondary} />
          {unreadNotifications > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Language toggle (reuse shared SegmentedControl) */}
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('rider.welcome.languageAria')}
        style={styles.langRow}
      >
        <SegmentedControl
          segments={languageSegments}
          activeKey={locale}
          onChange={key => { analytics.track('rider_language_changed', { locale: key }); setLocale(key as Locale) }}
          testID="rider-language-toggle"
        />
      </View>

      {/* GPS / connection status indicator (mock) */}
      <StatusIndicators gpsState={gpsState} />

      {/* Resume banner: minimized active delivery stays reachable from Home. */}
      {activeDelivery?.minimized && hasActiveDelivery(activeDelivery) && (
        <ResumeBanner
          delivery={activeDelivery}
          onResume={handleResumeActive}
          onDismiss={handleResumeActive}
        />
      )}

      {/* Online toggle — 48dp tap target, screen-reader switch */}
      <View style={styles.toggleRow}>
        <OnlineToggle
          status={status}
          onToggle={handleToggle}
          labelOnline={t('rider.home.toggleOn')}
          labelOffline={t('rider.home.toggleOff')}
          ariaLabel={t('rider.home.toggleAria')}
          hintOnline={t('rider.home.toggleHintOnline')}
          hintOffline={t('rider.home.toggleHintOffline')}
        />
      </View>

      {/* Toggle pending indicator */}
      {toggleMutation.isPending && (
        <View style={styles.togglePending} accessibilityRole="text" accessibilityLabel={t('rider.home.togglePendingAria')}>
          <View style={styles.pendingDot} />
          <Text style={styles.togglePendingText}>{t('rider.home.togglePending')}</Text>
        </View>
      )}

      {/* Toggle error — calm retry */}
      {toggleMutation.isError && !toggleMutation.isPending && (
        <View style={styles.toggleErrorCard} accessibilityRole="alert">
          <View style={styles.toggleErrorBody}>
            <Text style={styles.toggleErrorTitle}>{t('rider.home.toggleErrorTitle')}</Text>
            <Text style={styles.toggleErrorSub}>{t('rider.home.toggleErrorBody')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.home.toggleErrorRetryAria')}
            style={[styles.toggleRetryBtn, { minHeight: minTouchTarget }]}
            onPress={handleRetryToggle}
          >
            <Text style={styles.toggleRetryText}>{t('rider.home.toggleErrorRetry')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.home.toggleErrorDismissAria')}
            style={styles.toggleDismissBtn}
            onPress={() => toggleMutation.reset()}
            hitSlop={8}
          >
            <Text style={styles.toggleDismissText}>×</Text>
          </Pressable>
        </View>
      )}

      {/* Listening line — calms when offline, subtle pulse when online */}
      <Animated.Text
        style={[
          styles.listening,
          status !== 'online' && styles.listeningOff,
          status === 'online' && !toggleMutation.isPending ? listeningStyle : undefined,
        ]}
        accessibilityLiveRegion="polite"
      >
        {toggleMutation.isPending
          ? t('rider.home.togglePending')
          : status === 'online' ? t('rider.home.listening') : t('rider.home.offlineSubtitle')}
      </Animated.Text>

      {/* Quick controls: break/pause, go-offline, job filter */}
      <QuickControls status={status} />

      {/* Incoming request slot (only when online) */}
      <View style={styles.section}>
        <RequestSlot
          status={status}
          title={t('rider.home.requestTitle')}
          placeholder={t('rider.home.requestPlaceholder')}
        />
      </View>

      {/* Map slot */}
      <View style={styles.section}>
        <MapSlot
          status={status}
          title={t('rider.home.mapTitle')}
          offlineHint={t('rider.home.mapOfflineHint')}
          onlineHint={t('rider.home.mapOnlineHint')}
        />
      </View>

      {/* Offline cached snapshot banner */}
      {status !== 'online' && connectivity === 'offline' && (
        <View style={styles.cachedBanner} accessibilityRole="text" accessibilityLabel={t('rider.home.offlineCachedAria')}>
          <View style={styles.cachedDot} />
          <View style={styles.cachedBody}>
            <Text style={styles.cachedTitle}>{t('rider.home.offlineCachedTitle')}</Text>
            <Text style={styles.cachedSub}>{t('rider.home.offlineCachedBody')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rider.home.toggleOn')}
            accessibilityHint={a11yHint(t('rider.home.toggleHintOnline'))}
            style={[styles.cachedAction, { minHeight: minTouchTarget }]}
            onPress={() => handleToggle('online')}
          >
            <Text style={styles.cachedActionText}>{t('rider.home.toggleOn')}</Text>
          </Pressable>
        </View>
      )}

      {/* Snapshot slot */}
      <View style={styles.section}>
        <SnapshotSlot title={t('rider.home.snapshotTitle')} />
      </View>

      {/* Incentive nudge: today's mission progress (dismissible) */}
      <IncentiveNudge />

      {/* Incentives & Quests entry — reachable from Home, not a bottom tab */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.incentives.entryStreaksAria', {
          count: 0,
          tier: '',
        })}
        accessibilityHint={a11yHint(t('rider.incentives.subtitle'))}
        style={[styles.incentiveEntry, { minHeight: minTouchTarget }]}
        onPress={() => { analytics.track('rider_incentives_entry_tapped'); router.push('/incentives') }}
      >
        <View style={styles.incentiveEntryIcon}>
          <Target size={20} color={colors.gold} />
        </View>
        <View style={styles.incentiveEntryBody}>
          <Text style={styles.incentiveEntryTitle}>{t('rider.incentives.title')}</Text>
          <Text style={styles.incentiveEntrySub} numberOfLines={1}>
            {t('rider.incentives.subtitle')}
          </Text>
        </View>
        {incentiveThisWeek !== null ? (
          <Text style={styles.incentiveEntryAmount}>
            {formatNPR(incentiveThisWeek ?? 0)}
          </Text>
        ) : null}
        <ChevronRight size={20} color={colors.textTertiary} />
      </Pressable>

      {/* Cash & COD Wallet entry — reachable from Home (Earnings/Profile host
          later). Pushed route, not a bottom tab. Reads the shared
          codWalletStatus store so the cash-in-hand figure is live (RW2). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.homeEntryAria')}
        accessibilityHint={a11yHint(
          codLimitStatus.kind === 'atLimit'
            ? t('rider.wallet.homeLimitAtLimit')
            : codLimitStatus.kind === 'approaching'
              ? t('rider.wallet.homeLimitApproaching')
              : t('rider.wallet.homeEntrySub'),
        )}
        style={[styles.walletEntry, { minHeight: minTouchTarget }]}
        onPress={() => { analytics.track('rider_wallet_entry_tapped'); router.push('/wallet') }}
      >
        <View style={styles.walletEntryIcon}>
          <Wallet size={20} color={colors.primary} />
        </View>
        <View style={styles.walletEntryBody}>
          <Text style={styles.walletEntryTitle}>{t('rider.wallet.title')}</Text>
          <Text style={styles.walletEntrySub} numberOfLines={1}>
            {codLimitStatus.kind === 'atLimit'
              ? t('rider.wallet.homeLimitAtLimit')
              : codLimitStatus.kind === 'approaching'
                ? t('rider.wallet.homeLimitApproaching')
                : t('rider.wallet.homeEntrySub')}
          </Text>
        </View>
        {codLimitStatus.kind !== 'healthy' && (
          <View
            style={[
              styles.walletLimitChip,
              { backgroundColor: codLimitStatus.kind === 'atLimit' ? colors.errorLight : colors.warningLight },
            ]}
          >
            {codLimitStatus.kind === 'atLimit' ? (
              <Lock size={11} color={colors.error} />
            ) : (
              <AlertTriangle size={11} color={colors.warning} />
            )}
          </View>
        )}
        <Text style={styles.walletEntryAmount}>
          {formatNPR(cashInHand)}
        </Text>
        <ChevronRight size={20} color={colors.textTertiary} />
      </Pressable>

      {/* Smoke-test: reuse shared integer-paisa money helpers */}
      <View
        style={styles.smokeCard}
        accessibilityRole="summary"
        accessibilityLabel={a11yLabel(
          t('rider.home.snapshotTitle'),
          samplePayoutLabel,
        )}
      >
        <Text style={styles.smokeLabel}>{t('rider.home.smokePayoutLabel', { paisa: samplePayoutPaisa })}</Text>
        <Text style={styles.smokeValue}>{samplePayoutLabel}</Text>
        <Text style={styles.smokeSub}>{t('rider.home.smokeRevenueLabel', { amount: sampleRevenueLabel })}</Text>
      </View>

      {/* Offline hint — 48dp tap target to go online */}
      {status !== 'online' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.toggleOn')}
          accessibilityHint={a11yHint(t('rider.home.toggleHintOnline'))}
          style={[styles.onlineCta, { minHeight: minTouchTarget }]}
          onPress={() => handleToggle('online')}
        >
          <Text style={styles.onlineCtaText}>{t('rider.home.toggleOn')}</Text>
        </Pressable>
      )}

      {/* Battery-conscious footer */}
      <Text style={styles.footerNote}>
        {isForeground ? t('rider.home.listening') : t('rider.home.toggleOff')}
        {reducedMotion ? ` · ${t('rider.home.reducedMotionNote')}` : ''}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  titleBold: {
    fontWeight: '800',
  },
  subtitle: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bellBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  statusDotOnline: { backgroundColor: colors.success },
  statusDotOffline: { backgroundColor: colors.textTertiary },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusTextOnline: { color: colors.success },
  statusTextOffline: { color: colors.textMuted },
  langRow: {
    marginTop: spacing[1],
  },
  toggleRow: {
    alignItems: 'center',
    marginTop: spacing[2],
  },
  listening: {
    textAlign: 'center',
    fontSize: fontSize.base[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  listeningOff: {
    color: colors.textTertiary,
  },
  section: {
    marginTop: spacing[2],
  },
  // Toggle pending
  togglePending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1.5],
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  togglePendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  // Toggle error
  toggleErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  toggleErrorBody: {
    flex: 1,
  },
  toggleErrorTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  toggleErrorSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
    fontFamily: fontFamily.sans[0],
  },
  toggleRetryBtn: {
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  toggleRetryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  toggleDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDismissText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  // Offline cached banner
  cachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  cachedDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.warning,
  },
  cachedBody: {
    flex: 1,
  },
  cachedTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.warning,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  cachedSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
    fontFamily: fontFamily.sans[0],
  },
  cachedAction: {
    backgroundColor: colors.success,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  cachedActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  smokeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[1],
  },
  incentiveEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  incentiveEntryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(224, 169, 59, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incentiveEntryBody: {
    flex: 1,
  },
  incentiveEntryTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  incentiveEntrySub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  incentiveEntryAmount: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.gold,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  walletEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  walletEntryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletEntryBody: {
    flex: 1,
  },
  walletEntryTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  walletEntrySub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  walletEntryAmount: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  walletLimitChip: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smokeLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  smokeValue: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  smokeSub: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  onlineCta: {
    backgroundColor: colors.success,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
  },
  onlineCtaText: {
    color: colors.white,
    fontSize: fontSize.md[0],
    fontWeight: '700',
    fontFamily: fontFamily.sansBold[0],
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
    marginTop: spacing[2],
  },
})
