import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, X, ListChecks } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import {
  getRiderEarningsLedger,
  formatRiderNPRAmount,
  type RiderLedgerRow,
  type RiderLedgerKind,
} from '@chinooz/mock-data'

const KIND_META: Record<RiderLedgerKind, { bg: string; text: string; labelKey: string }> = {
  trip_earning: { bg: colors.primary50, text: colors.primary, labelKey: 'rider.earnings.ledger.kindTrip' },
  incentive: { bg: colors.warningLight, text: colors.warning, labelKey: 'rider.earnings.ledger.kindIncentive' },
  cashout: { bg: colors.infoLight, text: colors.info, labelKey: 'rider.earnings.ledger.kindCashout' },
  adjustment: { bg: colors.borderLight, text: colors.textMuted, labelKey: 'rider.earnings.ledger.kindAdjustment' },
  cod_remit: { bg: colors.warningLight, text: colors.warning, labelKey: 'rider.earnings.ledger.kindCodRemit' },
}

export default function RiderLedgerScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const params = useLocalSearchParams<{ date?: string }>()

  const [rows, setRows] = useState<RiderLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [dateFilter, setDateFilter] = useState<string | null>(params.date ?? null)

  useEffect(() => {
    analytics.screen({ name: 'rider-earnings-ledger' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    try {
      const r = await getRiderEarningsLedger()
      setRows(r)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const filtered = useMemo(
    () => (dateFilter ? rows.filter(r => r.date === dateFilter) : rows),
    [rows, dateFilter],
  )

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.ledger.back')}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {t('rider.earnings.ledger.title')}
            </Text>
            <Text style={styles.headerSub}>{t('rider.earnings.ledger.subtitle')}</Text>
          </View>
        </View>
      </View>

      {dateFilter && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterBannerText}>
            {t('rider.earnings.ledger.dayFiltered', { date: dateFilter })}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.earnings.ledger.clearDateAria')}
            onPress={() => setDateFilter(null)}
            style={styles.filterClearBtn}
          >
            <X size={14} color={colors.primary} />
            <Text style={styles.filterClearText}>{t('rider.earnings.ledger.clearDate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <LedgerSkeleton ariaLabel={t('rider.earnings.ledger.skeletonAria')} />
        ) : error ? (
          <ErrorState
            title={t('rider.earnings.ledger.errorTitle')}
            subtitle={t('rider.earnings.ledger.errorSubtitle')}
            retry={t('rider.earnings.ledger.retry')}
            onRetry={onRefresh}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={dateFilter
              ? t('rider.earnings.ledger.emptyFiltered', { date: dateFilter })
              : t('rider.earnings.ledger.empty')}
            subtitle={t('rider.earnings.ledger.emptySubtitle')}
          />
        ) : (
          <View style={styles.body}>
            <Text style={styles.countText}>
              {filtered.length === 1
                ? t('rider.earnings.ledger.countOne', { count: filtered.length })
                : t('rider.earnings.ledger.countOther', { count: filtered.length })}
            </Text>
            <View style={styles.ledgerCard}>
              {filtered.map((row, i) => (
                <LedgerRowItem
                  key={row.id}
                  row={row}
                  isLast={i === filtered.length - 1}
                  ariaLabel={t('rider.earnings.ledger.rowAria', {
                    date: row.date,
                    label: row.label,
                    amount: formatRiderNPRAmount(Math.abs(row.amount)),
                    balance: formatRiderNPRAmount(row.balanceAfter),
                  })}
                  kindLabel={t(KIND_META[row.kind].labelKey)}
                />
              ))}
            </View>
            <View style={{ height: spacing[4] }} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function LedgerRowItem({
  row,
  isLast,
  ariaLabel,
  kindLabel,
}: {
  row: RiderLedgerRow
  isLast: boolean
  ariaLabel: string
  kindLabel: string
}) {
  const meta = KIND_META[row.kind]
  const isCredit = row.amount >= 0
  return (
    <View
      style={[styles.ledgerRow, !isLast && styles.ledgerRowBorder]}
      accessibilityRole="text"
      accessible
      accessibilityLabel={ariaLabel}
    >
      <View style={[styles.kindPill, { backgroundColor: meta.bg }]}>
        <Text style={[styles.kindPillText, { color: meta.text }]} numberOfLines={1}>
          {kindLabel}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.ledgerLabel} numberOfLines={2}>
          {row.label}
        </Text>
        <Text style={styles.ledgerDate}>{row.date}</Text>
      </View>
      <View style={styles.ledgerRight}>
        <Text
          style={[styles.ledgerAmount, !isCredit && styles.ledgerAmountNeg]}
          numberOfLines={1}
        >
          {isCredit ? '+' : '−'}NPR {formatRiderNPRAmount(Math.abs(row.amount))}
        </Text>
        <Text style={styles.ledgerBalance} numberOfLines={1}>
          {formatRiderNPRAmount(row.balanceAfter)}
        </Text>
      </View>
    </View>
  )
}

function LedgerSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyWrap}>
      <ListChecks size={32} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  )
}

function ErrorState({
  title,
  subtitle,
  retry,
  onRetry,
}: {
  title: string
  subtitle: string
  retry: string
  onRetry: () => void
}) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorSubtitle}>{subtitle}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={retry}
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <Text style={styles.retryText}>{retry}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  headerSub: { fontSize: 13, color: colors.primary50, marginTop: 2, fontFamily: fontFamily.sans[0] },

  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  filterBannerText: { fontSize: 13, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  filterClearBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  filterClearText: { fontSize: 12, fontWeight: '600', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },

  body: { padding: spacing[4], gap: spacing[2] },
  countText: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing[1], fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

  ledgerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[2],
    ...shadow('sm'),
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  ledgerRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  kindPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    minWidth: 64,
    alignItems: 'center',
  },
  kindPillText: { fontSize: 10, fontWeight: '700', fontFamily: fontFamily.sansSemiBold[0] },
  ledgerLabel: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  ledgerDate: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  ledgerRight: { alignItems: 'flex-end', gap: 2, minWidth: 96 },
  ledgerAmount: { fontSize: 14, fontWeight: '700', color: colors.success, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  ledgerAmountNeg: { color: colors.error },
  ledgerBalance: { fontSize: 11, color: colors.textTertiary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },

  skeletonWrap: { padding: spacing[4], gap: spacing[2] },
  skeletonRow: { height: 64, borderRadius: radii.lg, backgroundColor: colors.shimmer },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },

  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
