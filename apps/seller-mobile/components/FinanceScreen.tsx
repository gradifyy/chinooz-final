import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  ChevronRight,
  ArrowLeft,
  Wallet,
  Banknote,
  CreditCard,
  Download,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  getFinanceSummary,
  FINANCE_DATE_RANGES,
  formatNPRAmount,
  type FinanceRange,
  type FinanceRangeKey,
  type FinanceSummary,
} from '@chinooz/mock-data'
import EarningsChart from './EarningsChart'

const RANGE_LABEL_KEY: Record<FinanceRangeKey, string> = {
  today: 'rangeToday',
  '7d': 'range7d',
  '30d': 'range30d',
  month: 'rangeMonth',
  custom: 'rangeCustom',
}

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

export default function FinanceScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [rangeKey, setRangeKey] = useState<FinanceRangeKey>('30d')
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const { width } = useWindowDimensions()
  const isMd = width >= 768

  useEffect(() => {
    analytics.screen({ name: 'seller-finance' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    const meta = FINANCE_DATE_RANGES.find(r => r.key === rangeKey)
    const range: FinanceRange = {
      key: rangeKey,
      label: meta?.label ?? '30d',
      days: meta?.days ?? 30,
    }
    let active = true
    getFinanceSummary(range).then(data => {
      if (!active) return
      setSummary(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [rangeKey, isLoggedIn])

  const available = summary?.availableBalance ?? 0
  const animatedAvailable = useCountUp(available, !loading && !reducedMotion)
  const displayAvailable = loading ? available : animatedAvailable

  const cards = useMemo(() => {
    if (!summary) return [] as { label: string; value: string }[]
    return [
      { label: t('seller.finance.cardLifetime'), value: `NPR ${formatNPRAmount(summary.lifetimeEarnings)}` },
      { label: t('seller.finance.cardPeriodNet'), value: `NPR ${formatNPRAmount(summary.thisPeriodNet)}` },
      { label: t('seller.finance.cardPendingPayout'), value: `NPR ${formatNPRAmount(summary.pendingPayout)}` },
      { label: t('seller.finance.cardNextPayout'), value: summary.nextScheduledPayoutDate },
    ]
  }, [summary, t])

  const entries = [
    {
      Icon: Banknote,
      title: t('seller.finance.entryTransactions'),
      sub: t('seller.finance.entryTransactionsSub'),
      aria: t('seller.finance.entryTransactionsAria'),
      href: '/finance/transactions',
    },
    {
      Icon: Wallet,
      title: t('seller.finance.entryPayouts'),
      sub: t('seller.finance.entryPayoutsSub'),
      aria: t('seller.finance.entryPayoutsAria'),
      href: '/finance/payouts',
    },
    {
      Icon: CreditCard,
      title: t('seller.finance.entryPayoutMethods'),
      sub: t('seller.finance.entryPayoutMethodsSub'),
      aria: t('seller.finance.entryPayoutMethodsAria'),
      href: '/finance/payout-methods',
    },
  ]

  const heroAria = summary
    ? t('seller.finance.heroAria', {
        available: formatNPRAmount(summary.availableBalance),
        pending: formatNPRAmount(summary.pendingBalance),
      })
    : t('seller.finance.loading')

  const goBack = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    if (router.canGoBack()) router.back()
    else router.replace('/dashboard')
  }, [router, reducedMotion])

  const withdraw = useCallback(() => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
  }, [reducedMotion])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.moreBack')}
          onPress={goBack}
          hitSlop={8}
          style={[styles.topBarBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.topBarTitle}>
          {t('seller.finance.title')}
        </Text>
        <View style={{ width: minTouchTarget }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('seller.finance.subtitle')}</Text>

        <View style={isMd ? styles.topGridMd : styles.topGridStack}>
          {/* Balance hero (SF1) */}
          <View
            accessibilityLabel={heroAria}
            accessibilityRole="summary"
            style={styles.heroCard}
          >
            <View style={styles.heroAccent} />
            <Text style={styles.heroLabel}>{t('seller.finance.heroAvailable')}</Text>
            <Text style={styles.heroAvailable}>
              NPR {formatNPRAmount(displayAvailable)}
            </Text>
            <View style={styles.heroDivider} />
            <Text style={styles.pendingLabel}>{t('seller.finance.heroPending')}</Text>
            <Text style={styles.pendingValue}>
              NPR {formatNPRAmount(summary?.pendingBalance ?? 0)}
            </Text>
            <Text style={styles.pendingHint}>{t('seller.finance.heroPendingHint')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('seller.finance.withdrawAria', {
                amount: formatNPRAmount(summary?.availableBalance ?? 0),
              })}
              onPress={withdraw}
              style={[styles.withdrawBtn, { minHeight: minTouchTarget }]}
              activeOpacity={0.9}
            >
              <Download size={18} color={colors.white} />
              <Text style={styles.withdrawText}>{t('seller.finance.withdraw')}</Text>
            </TouchableOpacity>
          </View>

          {/* Summary cards (SF2) */}
          <View style={styles.cardsGrid}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={styles.summaryCard}>
                    <View style={styles.skeletonLabel} />
                    <View style={styles.skeletonValue} />
                  </View>
                ))
              : cards.map(card => (
                  <View key={card.label} style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>{card.label}</Text>
                    <Text style={styles.summaryValue}>{card.value}</Text>
                  </View>
                ))}
          </View>
        </View>

        {/* Range selector (SF3) + chart (SF2) */}
        <View style={styles.chartCard}>
          <View
            accessibilityRole="tablist"
            accessibilityLabel={t('seller.finance.rangeAriaLabel')}
            style={styles.rangeRow}
          >
            {FINANCE_DATE_RANGES.map(r => {
              const active = r.key === rangeKey
              const label = t(`seller.finance.${RANGE_LABEL_KEY[r.key]}`)
              return (
                <TouchableOpacity
                  key={r.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('seller.finance.rangeTabAria', { range: label })}
                  onPress={() => setRangeKey(r.key)}
                  style={[styles.rangePill, active && styles.rangePillActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.rangePillText, active && styles.rangePillTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.chartLabel}>{t('seller.finance.chartNetEarnings')}</Text>
          <EarningsChart series={summary?.earnings ?? null} loading={loading} />
        </View>

        {/* Section entry points (SF3/SF4/SF6) */}
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('seller.finance.sectionManage')}
        </Text>
        <View style={styles.entriesCard}>
          {entries.map((e, i) => {
            const Icon = e.Icon
            return (
              <TouchableOpacity
                key={e.title}
                accessibilityRole="button"
                accessibilityLabel={e.aria}
                onPress={() => router.push(e.href as any)}
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
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  scrollContent: { padding: spacing[4], gap: spacing[4] },
  subtitle: { fontSize: fontSize.base[0], color: colors.textMuted, marginBottom: spacing[1] },

  topGridStack: { gap: spacing[4] },
  topGridMd: { flexDirection: 'row', gap: spacing[4] },
  heroCard: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: colors.gold,
  },
  heroLabel: {
    fontSize: fontSize.xs[0],
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAvailable: {
    marginTop: spacing[2],
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  heroDivider: {
    marginTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pendingLabel: {
    marginTop: spacing[3],
    fontSize: fontSize.xs[0],
    fontWeight: '500',
    color: colors.textMuted,
  },
  pendingValue: {
    marginTop: spacing[1],
    fontSize: fontSize.base[0],
    fontWeight: '500',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  pendingHint: {
    marginTop: spacing[1],
    fontSize: fontSize.xs[0],
    color: colors.textTertiary,
  },
  withdrawBtn: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
  },
  withdrawText: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.white },

  cardsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  summaryLabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  summaryValue: {
    marginTop: spacing[2],
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  skeletonLabel: { width: 80, height: 10, backgroundColor: colors.shimmer, borderRadius: radii.sm },
  skeletonValue: { marginTop: 10, width: 100, height: 18, backgroundColor: colors.shimmer, borderRadius: radii.sm },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  rangePill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangePillText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.textMuted },
  rangePillTextActive: { color: colors.white },
  chartLabel: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
    fontSize: fontSize.xs[0],
    fontWeight: '500',
    color: colors.textMuted,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], height: 128 },
  chartCol: { flex: 1, alignItems: 'center', gap: spacing[1] },
  chartBarWrap: { height: '100%', width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: {
    width: 28,
    maxWidth: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
  chartAxis: { fontSize: 10, color: colors.textTertiary, fontVariant: ['tabular-nums'] },

  sectionTitle: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[2],
    marginTop: spacing[2],
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
  entryTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  entrySub: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
})
