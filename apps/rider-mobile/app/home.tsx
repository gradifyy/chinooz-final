import React, { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Target, ChevronRight, Wallet } from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { SegmentedControl } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  useOnlineStatusStore,
  useRiderSessionStore,
  useUIStore,
  useRiderIncentivesStore,
  useActiveDeliveryStore,
  useCODWalletStore,
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
  const setOnlineStatus = useOnlineStatusStore(s => s.setOnlineStatus)
  const activeDelivery = useActiveDeliveryStore(s => s.activeDelivery)
  const resumeActive = useActiveDeliveryStore(s => s.resume)
  const tickOnline = useOnlineStatusStore(s => s.tickOnline)
  const onlineSecondsToday = useOnlineStatusStore(s => s.onlineSecondsToday)

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
  // route, not a bottom tab.
  const cashInHand = useCODWalletStore(s => s.cashInHand)

  // Reuse the shared no-op analytics wrapper (not a fork).
  useEffect(() => {
    analytics.screen({ name: 'rider-home' })
  }, [])

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

  const onlineTimeDisplay = useMemo(() => {
    const total = Math.floor(onlineSecondsToday / 60)
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    return t('rider.home.hoursShort', { hours, minutes })
  }, [onlineSecondsToday, t])

  // Reuse the shared integer-paisa money helpers for the smoke-test payout.
  const samplePayoutPaisa = nprToPaisa(125.5)
  const samplePayoutLabel = formatNPRFromPaisa(samplePayoutPaisa)
  const sampleRevenueLabel = formatNPR(0)

  const handleToggle = (next: OnlineStatus) => setOnlineStatus(next)

  const handleResumeActive = () => {
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
          onChange={key => setLocale(key as Locale)}
          testID="rider-language-toggle"
        />
      </View>

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

      {/* Listening line — calms when offline */}
      <Text
        style={[styles.listening, status !== 'online' && styles.listeningOff]}
        accessibilityLiveRegion="polite"
      >
        {status === 'online' ? t('rider.home.listening') : t('rider.home.offlineSubtitle')}
      </Text>

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

      {/* Snapshot slot */}
      <View style={styles.section}>
        <SnapshotSlot
          status={status}
          title={t('rider.home.snapshotTitle')}
          emptyText={t('rider.home.snapshotEmpty')}
          onlineTimeLabel={t('rider.home.onlineTimeToday')}
          onlineTimeValue={onlineTimeDisplay}
        />
      </View>

      {/* Incentives & Quests entry — reachable from Home, not a bottom tab */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rider.incentives.entryStreaksAria', {
          count: 0,
          tier: '',
        })}
        accessibilityHint={a11yHint(t('rider.incentives.subtitle'))}
        style={[styles.incentiveEntry, { minHeight: minTouchTarget }]}
        onPress={() => router.push('/incentives')}
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
            NPR {incentiveThisWeek.toLocaleString('en-IN')}
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
        accessibilityHint={a11yHint(t('rider.wallet.homeEntrySub'))}
        style={[styles.walletEntry, { minHeight: minTouchTarget }]}
        onPress={() => router.push('/wallet')}
      >
        <View style={styles.walletEntryIcon}>
          <Wallet size={20} color={colors.primary} />
        </View>
        <View style={styles.walletEntryBody}>
          <Text style={styles.walletEntryTitle}>{t('rider.wallet.title')}</Text>
          <Text style={styles.walletEntrySub} numberOfLines={1}>
            {t('rider.wallet.homeEntrySub')}
          </Text>
        </View>
        <Text style={styles.walletEntryAmount}>
          NPR {cashInHand.toLocaleString('en-IN')}
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
        <Text style={styles.smokeLabel}>Smoke-test payout (paisa {samplePayoutPaisa})</Text>
        <Text style={styles.smokeValue}>{samplePayoutLabel}</Text>
        <Text style={styles.smokeSub}>Today revenue: {sampleRevenueLabel}</Text>
      </View>

      {/* Offline hint — 48dp tap target to go online */}
      {status !== 'online' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rider.home.toggleOn')}
          accessibilityHint={a11yHint(t('rider.home.toggleHintOnline'))}
          style={[styles.onlineCta, { minHeight: minTouchTarget }]}
          onPress={() => setOnlineStatus('online')}
        >
          <Text style={styles.onlineCtaText}>{t('rider.home.toggleOn')}</Text>
        </Pressable>
      )}

      {/* Battery-conscious footer */}
      <Text style={styles.footerNote}>
        {isForeground ? t('rider.home.listening') : t('rider.home.toggleOff')}
        {reducedMotion ? ' · reduced motion' : ''}
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
