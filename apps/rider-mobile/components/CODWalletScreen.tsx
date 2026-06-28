import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  ChevronRight,
  ArrowLeft,
  Banknote,
  Landmark,
  Receipt,
  History,
  AlertTriangle,
  Inbox,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useAppState } from './AppStateProvider'
import { useCODWalletStore, useCodLimitStatus } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  getCODWallet,
  formatRiderNPRAmount,
  type CODWalletSnapshot,
} from '@chinooz/mock-data'
import CODLimitMeter from './CODLimitMeter'
import {
  WalletSkeleton,
  WalletErrorState,
  OfflineBanner,
  AtLimitBanner,
  DisputeBanner,
} from './WalletStates'

/**
 * RW2 — Cash & COD Wallet overview.
 *
 * Reachable from Earnings / Profile (a pushed route, NOT a bottom tab).
 * Hero = cash-in-hand (COD collected − deposited), the physical cash the
 * rider holds and must deposit. Clearly distinct from earnings: a one-line
 * explainer spells out the difference. Gold accent is reserved for the
 * Deposit action; the surface stays calm/trustworthy (handling money).
 */

function useCountUp(target: number, enabled: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const raf = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = Date.now()
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, enabled, durationMs])
  return value
}

export default function CODWalletScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()

  // Shared codWalletStatus store — hero reads from here for instant paint.
  const cashInHand = useCODWalletStore(s => s.cashInHand)
  const collectedToday = useCODWalletStore(s => s.collectedToday)
  const depositedToday = useCODWalletStore(s => s.depositedToday)
  const pendingToDeposit = useCODWalletStore(s => s.pendingToDeposit)
  const collectedTodayCount = useCODWalletStore(s => s.collectedTodayCount)
  const nextDepositBy = useCODWalletStore(s => s.nextDepositBy)
  const hydrated = useCODWalletStore(s => s.hydrated)
  const hydrateFromSnapshot = useCODWalletStore(s => s.hydrateFromSnapshot)

  const [loading, setLoading] = useState(!hydrated)
  const [error, setError] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    analytics.screen({ name: 'rider-cod-wallet' })
  }, [])

  // Hydrate the store from the mock getCODWallet async fetcher.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getCODWallet()
      .then((snap: CODWalletSnapshot) => {
        if (!active) return
        hydrateFromSnapshot(snap)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [hydrateFromSnapshot, reloadTick])

  const heroTarget = cashInHand
  const animatedHero = useCountUp(heroTarget, !loading && !reducedMotion && hydrated)
  const displayHero = loading ? heroTarget : animatedHero

  const goBack = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }, [router, reducedMotion])

  const retry = useCallback(() => setReloadTick(tick => tick + 1), [])

  const deposit = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    // RW4 settle flow — pushed route (not yet implemented).
    router.push('/wallet/deposit' as never)
  }, [router, reducedMotion])

  const heroAria = t('rider.wallet.heroAria', { amount: formatRiderNPRAmount(cashInHand) })

  const stats = [
    {
      label: t('rider.wallet.statCollectedToday'),
      value: `NPR ${formatRiderNPRAmount(collectedToday)}`,
      sub: t('rider.wallet.collectedCount', { count: collectedTodayCount }),
      aria: t('rider.wallet.statCollectedTodayAria', {
        amount: formatRiderNPRAmount(collectedToday),
        count: collectedTodayCount,
      }),
    },
    {
      label: t('rider.wallet.statDepositedToday'),
      value: `NPR ${formatRiderNPRAmount(depositedToday)}`,
      sub: '',
      aria: t('rider.wallet.statDepositedTodayAria', {
        amount: formatRiderNPRAmount(depositedToday),
      }),
    },
    {
      label: t('rider.wallet.statPending'),
      value: `NPR ${formatRiderNPRAmount(pendingToDeposit)}`,
      sub: '',
      aria: t('rider.wallet.statPendingAria', {
        amount: formatRiderNPRAmount(pendingToDeposit),
      }),
    },
  ]

  const entries = [
    {
      Icon: Receipt,
      title: t('rider.wallet.entryLedger'),
      sub: t('rider.wallet.entryLedgerSub'),
      aria: t('rider.wallet.entryLedgerAria'),
      href: '/wallet/ledger' as never,
    },
    {
      Icon: History,
      title: t('rider.wallet.entryHistory'),
      sub: t('rider.wallet.entryHistorySub'),
      aria: t('rider.wallet.entryHistoryAria'),
      href: '/wallet/history' as never,
    },
  ]

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.wallet.back')}
          onPress={goBack}
          hitSlop={8}
          style={[styles.topBarBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.topBarTitle}>
          {t('rider.wallet.title')}
        </Text>
        <View style={{ width: minTouchTarget }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('rider.wallet.subtitle')}</Text>

        {/* Error / retry banner */}
        {error && (
          <View
            accessibilityRole="alert"
            accessibilityLabel={t('rider.wallet.errorTitle')}
            style={styles.errorCard}
          >
            <Text style={styles.errorTitle}>{t('rider.wallet.errorTitle')}</Text>
            <Text style={styles.errorSubtitle}>{t('rider.wallet.errorSubtitle')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('rider.wallet.retry')}
              onPress={retry}
              style={[styles.retryBtn, { minHeight: minTouchTarget }]}
              activeOpacity={0.85}
            >
              <Text style={styles.retryText}>{t('rider.wallet.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero cash-in-hand */}
        <View
          accessibilityLabel={heroAria}
          accessibilityRole="summary"
          aria-busy={loading}
          style={styles.heroCard}
        >
          <View style={styles.heroAccent} />
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Banknote size={20} color={colors.primary} />
            </View>
            <Text style={styles.heroLabel}>{t('rider.wallet.heroLabel')}</Text>
          </View>
          <Text style={styles.heroAmount}>
            NPR {formatRiderNPRAmount(displayHero)}
          </Text>
          <Text style={styles.heroFormula}>{t('rider.wallet.heroFormula')}</Text>
          <Text style={styles.heroCaption}>{t('rider.wallet.heroCaption')}</Text>

          {nextDepositBy ? (
            <View
              accessibilityLabel={t('rider.wallet.nextDepositByAria', { date: nextDepositBy })}
              style={styles.deadlineRow}
            >
              <AlertTriangle size={13} color={colors.warning} />
              <Text style={styles.deadlineText}>
                {t('rider.wallet.nextDepositBy', { date: nextDepositBy })}
              </Text>
            </View>
          ) : null}

          {/* Primary CTA — plum primary, gold is reserved for the icon accent only */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.wallet.depositCtaAria', {
              amount: formatRiderNPRAmount(cashInHand),
            })}
            onPress={deposit}
            disabled={loading || cashInHand <= 0}
            style={[styles.depositBtn, { minHeight: minTouchTarget }]}
            activeOpacity={0.9}
          >
            <Landmark size={18} color={colors.white} />
            <Text style={styles.depositText}>{t('rider.wallet.depositCta')}</Text>
          </TouchableOpacity>
        </View>

        {/* COD limit meter + collection status (RW6) */}
        <CODLimitMeter />

        {/* Quick stats — small tiles */}
        <View style={styles.statsRow}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  style={styles.statTile}
                  aria-busy
                  accessibilityLabel={t('rider.wallet.skeletonAria')}
                >
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              ))
            : stats.map(s => (
                <View
                  key={s.label}
                  style={styles.statTile}
                  accessibilityRole="summary"
                  accessibilityLabel={s.aria}
                >
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  {s.sub ? <Text style={styles.statSub}>{s.sub}</Text> : null}
                </View>
              ))}
        </View>

        {/* Earnings-vs-cash explainer — one line, unmistakable distinction */}
        <View
          accessibilityRole="text"
          accessibilityLabel={t('rider.wallet.explainerAria')}
          style={styles.explainerCard}
        >
          <View style={styles.explainerDot} />
          <Text style={styles.explainerText}>{t('rider.wallet.explainer')}</Text>
        </View>

        {/* Secondary CTAs — collection ledger (RW3) + deposit history (RW5) */}
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('rider.wallet.sectionManage')}
        </Text>
        <View style={styles.entriesCard}>
          {entries.map((e, i) => {
            const Icon = e.Icon
            return (
              <TouchableOpacity
                key={e.title}
                accessibilityRole="button"
                accessibilityLabel={e.aria}
                onPress={() => router.push(e.href)}
                style={[styles.entryRow, { minHeight: 56 }, i > 0 && styles.entryRowBorder]}
                activeOpacity={0.85}
              >
                <View style={styles.entryIcon}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <View style={styles.entryBody}>
                  <Text style={styles.entryTitle}>{e.title}</Text>
                  <Text style={styles.entrySub} numberOfLines={1}>
                    {e.sub}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarBtn: { alignItems: 'center', justifyContent: 'center' },
  topBarTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansBold[0],
  },
  scrollContent: { padding: spacing[4], gap: spacing[4] },
  subtitle: {
    fontSize: fontSize.base[0],
    color: colors.textMuted,
    marginBottom: spacing[1],
    fontFamily: fontFamily.sans[0],
  },

  // Hero — calm, trustworthy surface; gold accent bar reserved for action emphasis.
  heroCard: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: colors.gold,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  heroIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  heroAmount: {
    marginTop: spacing[3],
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  heroFormula: {
    marginTop: spacing[1],
    fontSize: fontSize.xs[0],
    fontWeight: '500',
    color: colors.textTertiary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  heroCaption: {
    marginTop: spacing[2],
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  deadlineRow: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  deadlineText: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Primary CTA — plum primary, full-width, one-hand reach.
  depositBtn: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3.5],
  },
  depositText: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },

  // Quick stats — small tiles in a row.
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2.5],
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statValue: {
    marginTop: spacing[1.5],
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  statSub: {
    marginTop: 2,
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
  },
  skeletonLabel: {
    width: 70,
    height: 10,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },
  skeletonValue: {
    marginTop: 10,
    width: 80,
    height: 16,
    backgroundColor: colors.shimmer,
    borderRadius: radii.sm,
  },

  // Explainer — one line, soft surface so it reads as context not a button.
  explainerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    padding: spacing[3.5],
  },
  explainerDot: {
    marginTop: 6,
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  explainerText: {
    flex: 1,
    fontSize: fontSize.sm[0],
    lineHeight: 19,
    color: colors.text,
    fontFamily: fontFamily.sans[0],
  },

  // Secondary entries.
  sectionTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[2],
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold[0],
  },
  entriesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  entryRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryBody: { flex: 1 },
  entryTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  entrySub: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  errorCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing[4],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.base[0],
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.sansBold[0],
  },
  errorSubtitle: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  retryText: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
})
