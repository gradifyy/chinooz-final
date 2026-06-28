import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Share,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Landmark,
  Store,
  Building2,
  CheckCircle2,
  XCircle,
  Loader,
  Share2,
  Banknote,
  ArrowRight,
  Receipt,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useA11y } from '../../components/A11yProvider'
import {
  getDepositHistory,
  getDepositReceipt,
  formatRiderNPRAmount,
  type DepositHistory,
  type DepositHistoryEntry,
  type DepositHistoryDay,
  type DepositReceipt,
  type DepositStatus,
  type DepositMethodKind,
} from '@chinooz/mock-data'

type DateRangeKey = 'all' | 'week' | 'month'
type StatusFilter = 'all' | 'settled' | 'pending' | 'failed'

const DATE_RANGES: { key: DateRangeKey; labelKey: string; days: number }[] = [
  { key: 'all', labelKey: 'rider.wallet.history.filterDateAll', days: 0 },
  { key: 'week', labelKey: 'rider.wallet.history.filterDateWeek', days: 7 },
  { key: 'month', labelKey: 'rider.wallet.history.filterDateMonth', days: 30 },
]

const STATUS_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'rider.wallet.history.filterStatusAll' },
  { key: 'settled', labelKey: 'rider.wallet.history.filterStatusSettled' },
  { key: 'pending', labelKey: 'rider.wallet.history.filterStatusPending' },
  { key: 'failed', labelKey: 'rider.wallet.history.filterStatusFailed' },
]

const STATUS_CONFIG: Record<
  DepositStatus,
  { bg: string; text: string; icon: React.ReactNode; labelKey: string; ariaKey: string }
> = {
  settled: {
    bg: colors.successLight,
    text: colors.success,
    icon: <CheckCircle2 size={11} color={colors.success} />,
    labelKey: 'rider.wallet.history.statusSettled',
    ariaKey: 'rider.wallet.history.statusSettledAria',
  },
  pending: {
    bg: colors.warningLight,
    text: colors.warning,
    icon: <Loader size={11} color={colors.warning} />,
    labelKey: 'rider.wallet.history.statusPending',
    ariaKey: 'rider.wallet.history.statusPendingAria',
  },
  failed: {
    bg: colors.errorLight,
    text: colors.error,
    icon: <XCircle size={11} color={colors.error} />,
    labelKey: 'rider.wallet.history.statusFailed',
    ariaKey: 'rider.wallet.history.statusFailedAria',
  },
}

const METHOD_ICON: Record<DepositMethodKind, React.ElementType> = {
  bank: Landmark,
  agent: Store,
  office: Building2,
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(iso: string): string {
  return (
    new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
    }) +
    ' · ' +
    new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  )
}

/**
 * RW5 — Deposit history + receipts.
 *
 * Lists past deposits grouped by date with status pills (not color-only:
 * icon + text). Each row opens a receipt showing which COD collections it
 * settled, the reference code, proof, and a timeline. Filters (date range +
 * status) and a reconciliation summary (collected vs deposited) are shown.
 * Receipts can be exported/shared via Share.share.
 */
export default function DepositHistoryScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { minTouchTarget } = useA11y()

  const [history, setHistory] = useState<DepositHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Receipt detail state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<DepositReceipt | null>(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'rider-deposit-history' })
  }, [])

  const load = useCallback(async () => {
    setError(false)
    try {
      const h = await getDepositHistory()
      setHistory(h)
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

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  const openReceipt = useCallback(
    async (id: string) => {
      try {
        if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      setSelectedId(id)
      setReceiptLoading(true)
      setReceipt(null)
      try {
        const r = await getDepositReceipt(id)
        setReceipt(r)
      } catch {
        setReceipt(null)
      } finally {
        setReceiptLoading(false)
      }
    },
    [reduced],
  )

  const closeReceipt = useCallback(() => {
    setSelectedId(null)
    setReceipt(null)
  }, [])

  const onExportReceipt = useCallback(() => {
    if (!receipt) return
    const st = STATUS_CONFIG[receipt.status]
    const collectionsText = receipt.settledCollections
      .map(
        c =>
          `  · ${c.orderId}: NPR ${formatRiderNPRAmount(c.amount)} (${c.buyerArea}, ${formatTime(c.collectedAt)})`,
      )
      .join('\n')
    const summary = [
      'Chinooz Deposit Receipt',
      `Reference: ${receipt.reference}`,
      `Amount: NPR ${formatRiderNPRAmount(receipt.amount)}`,
      `Method: ${receipt.methodLabel}`,
      `Status: ${t(st.labelKey)}`,
      `Deposited: ${formatDateTime(receipt.depositedAt)}`,
      receipt.verifiedAt
        ? `Verified: ${formatDateTime(receipt.verifiedAt)}`
        : '',
      receipt.locationName ? `Location: ${receipt.locationName}` : '',
      receipt.bankName ? `Bank: ${receipt.bankName}` : '',
      '',
      'Settled collections:',
      collectionsText,
      '',
      receipt.proofNote,
    ]
      .filter(Boolean)
      .join('\n')
    Share.share(
      { message: summary },
      { dialogTitle: t('rider.wallet.history.receiptExport') },
    )
    analytics.track('rider_deposit_receipt_shared', {
      reference: receipt.reference,
    })
  }, [receipt, t])

  // Filter days by date range + status
  const filteredDays = useMemo(() => {
    if (!history) return []
    const rangeConfig = DATE_RANGES.find(r => r.key === dateRange)
    const cutoffDays = rangeConfig?.days ?? 0
    const now = Date.now()

    return history.days
      .map(day => {
        const filteredDeposits = day.deposits.filter(dep => {
          if (statusFilter !== 'all' && dep.status !== statusFilter) return false
          if (cutoffDays > 0) {
            const ageMs = now - new Date(dep.depositedAt).getTime()
            if (ageMs > cutoffDays * 24 * 60 * 60 * 1000) return false
          }
          return true
        })
        if (filteredDeposits.length === 0) return null
        return {
          ...day,
          deposits: filteredDeposits,
          dayTotal: filteredDeposits.reduce((s, d) => s + d.amount, 0),
          dayCount: filteredDeposits.length,
        }
      })
      .filter((d): d is DepositHistoryDay => d !== null)
  }, [history, dateRange, statusFilter])

  const filteredCount = useMemo(
    () => filteredDays.reduce((s, d) => s + d.dayCount, 0),
    [filteredDays],
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <Header t={t} router={router} insets={insets} />
        <Skeleton ariaLabel={t('rider.wallet.history.skeletonAria')} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header t={t} router={router} insets={insets} />
        <View style={styles.errorWrap}>
          <AlertTriangle size={32} color={colors.textTertiary} />
          <Text style={styles.errorTitle}>
            {t('rider.wallet.history.errorTitle')}
          </Text>
          <Text style={styles.errorSubtitle}>
            {t('rider.wallet.history.errorSubtitle')}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('rider.wallet.history.retry')}
            onPress={onRefresh}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>
              {t('rider.wallet.history.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header t={t} router={router} insets={insets} />

      {selectedId ? (
        <ReceiptDetail
          t={t}
          insets={insets}
          loading={receiptLoading}
          receipt={receipt}
          onBack={closeReceipt}
          onExport={onExportReceipt}
          minTouchTarget={minTouchTarget}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing[8],
            paddingHorizontal: spacing[4],
            paddingTop: spacing[4],
            gap: spacing[3],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {history && history.totalCount === 0 ? (
            <EmptyState t={t} router={router} minTouchTarget={minTouchTarget} />
          ) : (
            <>
              {/* Reconciliation summary */}
              {history && (
                <ReconciliationCard t={t} history={history} />
              )}

              {/* Filters */}
              <FilterBar
                t={t}
                dateRange={dateRange}
                statusFilter={statusFilter}
                onDateRangeChange={setDateRange}
                onStatusFilterChange={setStatusFilter}
                minTouchTarget={minTouchTarget}
              />

              {/* Count */}
              <Text style={styles.countText} accessibilityRole="summary">
                {t('rider.wallet.history.count_other', { count: filteredCount })}
              </Text>

              {/* Deposit rows grouped by day */}
              {filteredDays.length === 0 ? (
                <View style={styles.noResultsWrap}>
                  <Text style={styles.noResultsText}>
                    {t('rider.wallet.history.empty')}
                  </Text>
                </View>
              ) : (
                filteredDays.map(day => (
                  <DayGroup
                    key={day.date}
                    day={day}
                    t={t}
                    minTouchTarget={minTouchTarget}
                    onPressDeposit={openReceipt}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({
  t,
  router,
  insets,
}: {
  t: ReturnType<typeof useTranslation>['t']
  router: ReturnType<typeof useRouter>
  insets: ReturnType<typeof useSafeAreaInsets>
}) {
  return (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.wallet.history.back')}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {t('rider.wallet.history.title')}
          </Text>
          <Text style={styles.headerSub}>
            {t('rider.wallet.history.subtitle')}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Reconciliation card
// ---------------------------------------------------------------------------

function ReconciliationCard({
  t,
  history,
}: {
  t: ReturnType<typeof useTranslation>['t']
  history: DepositHistory
}) {
  const aria = t('rider.wallet.history.reconciliationAria', {
    collected: formatRiderNPRAmount(history.collectedInPeriod),
    deposited: formatRiderNPRAmount(history.depositedInPeriod),
    outstanding: formatRiderNPRAmount(history.outstanding),
  })

  return (
    <View
      style={styles.reconCard}
      accessibilityRole="summary"
      accessibilityLabel={aria}
    >
      <View style={styles.reconHeader}>
        <FileCheck2 size={16} color={colors.primary} />
        <Text style={styles.reconTitle}>
          {t('rider.wallet.history.reconciliationTitle')}
        </Text>
      </View>

      <View style={styles.reconRows}>
        <View style={styles.reconRow}>
          <Text style={styles.reconLabel}>
            {t('rider.wallet.history.reconciliationCollected')}
          </Text>
          <Text style={styles.reconValue} accessibilityRole="text">
            NPR {formatRiderNPRAmount(history.collectedInPeriod)}
          </Text>
        </View>
        <View style={styles.reconRow}>
          <Text style={styles.reconLabel}>
            {t('rider.wallet.history.reconciliationDeposited')}
          </Text>
          <Text style={styles.reconValue} accessibilityRole="text">
            NPR {formatRiderNPRAmount(history.depositedInPeriod)}
          </Text>
        </View>
        <View style={[styles.reconRow, styles.reconOutstandingRow]}>
          <Text style={styles.reconOutstandingLabel}>
            {t('rider.wallet.history.reconciliationOutstanding')}
          </Text>
          <Text
            style={[
              styles.reconValue,
              { color: history.outstanding > 0 ? colors.warning : colors.success },
            ]}
            accessibilityRole="text"
          >
            NPR {formatRiderNPRAmount(history.outstanding)}
          </Text>
        </View>
      </View>

      <Text style={styles.reconHint}>
        {t('rider.wallet.history.reconciliationHint')}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function FilterBar({
  t,
  dateRange,
  statusFilter,
  onDateRangeChange,
  onStatusFilterChange,
  minTouchTarget,
}: {
  t: ReturnType<typeof useTranslation>['t']
  dateRange: DateRangeKey
  statusFilter: StatusFilter
  onDateRangeChange: (key: DateRangeKey) => void
  onStatusFilterChange: (key: StatusFilter) => void
  minTouchTarget: number
}) {
  return (
    <View style={styles.filterBar}>
      {/* Date range chips */}
      <View style={styles.filterRow}>
        <Text
          style={styles.filterLabel}
          accessibilityRole="header"
        >
          {t('rider.wallet.history.filterDateAria')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsScroll}
        >
          {DATE_RANGES.map(r => {
            const isActive = dateRange === r.key
            return (
              <Pressable
                key={r.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t(r.labelKey)}
                onPress={() => onDateRangeChange(r.key)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  { minHeight: minTouchTarget * 0.6 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {t(r.labelKey)}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Status chips */}
      <View style={styles.filterRow}>
        <Text
          style={styles.filterLabel}
          accessibilityRole="header"
        >
          {t('rider.wallet.history.filterStatusAria')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsScroll}
        >
          {STATUS_FILTERS.map(s => {
            const isActive = statusFilter === s.key
            return (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t(s.labelKey)}
                onPress={() => onStatusFilterChange(s.key)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  { minHeight: minTouchTarget * 0.6 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {t(s.labelKey)}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Day group
// ---------------------------------------------------------------------------

function DayGroup({
  day,
  t,
  minTouchTarget,
  onPressDeposit,
}: {
  day: DepositHistoryDay
  t: ReturnType<typeof useTranslation>['t']
  minTouchTarget: number
  onPressDeposit: (id: string) => void
}) {
  return (
    <View style={styles.dayGroup}>
      <View
        style={styles.dayHeader}
        accessibilityRole="header"
        accessibilityLabel={day.label}
      >
        <Text style={styles.dayLabel}>{day.label}</Text>
        <Text style={styles.daySubtotal}>
          {t('rider.wallet.history.dayTotal', {
            count: day.dayCount,
            total: formatRiderNPRAmount(day.dayTotal),
          })}
        </Text>
      </View>

      {day.deposits.map(dep => (
        <DepositRow
          key={dep.id}
          deposit={dep}
          t={t}
          minTouchTarget={minTouchTarget}
          onPress={() => onPressDeposit(dep.id)}
        />
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Deposit row
// ---------------------------------------------------------------------------

function DepositRow({
  deposit,
  t,
  minTouchTarget: _minTouchTarget,
  onPress,
}: {
  deposit: DepositHistoryEntry
  t: ReturnType<typeof useTranslation>['t']
  minTouchTarget: number
  onPress: () => void
}) {
  const st = STATUS_CONFIG[deposit.status]
  const Icon = METHOD_ICON[deposit.method]

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t('rider.wallet.history.rowAria', {
        date: formatDateTime(deposit.depositedAt),
        amount: formatRiderNPRAmount(deposit.amount),
        method: deposit.methodLabel,
        reference: deposit.reference,
        status: t(st.labelKey),
      })}
      onPress={onPress}
      style={styles.depCard}
      activeOpacity={0.85}
    >
      <View style={styles.depIcon}>
        <Icon size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.depTime}>{formatTime(deposit.depositedAt)}</Text>
        <Text style={styles.depMethod} numberOfLines={1}>
          {deposit.methodLabel}
        </Text>
        <Text style={styles.depRef} numberOfLines={1}>
          {deposit.reference}
        </Text>
      </View>
      <View style={styles.depRight}>
        <Text style={styles.depAmount} accessibilityRole="text">
          NPR {formatRiderNPRAmount(deposit.amount)}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          {st.icon}
          <Text style={[styles.statusPillText, { color: st.text }]}>
            {t(st.labelKey)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Receipt detail
// ---------------------------------------------------------------------------

function ReceiptDetail({
  t,
  insets,
  loading,
  receipt,
  onBack,
  onExport,
  minTouchTarget,
}: {
  t: ReturnType<typeof useTranslation>['t']
  insets: ReturnType<typeof useSafeAreaInsets>
  loading: boolean
  receipt: DepositReceipt | null
  onBack: () => void
  onExport: () => void
  minTouchTarget: number
}) {
  if (loading) {
    return (
      <View style={styles.detailWrap}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[12] }} />
      </View>
    )
  }

  if (!receipt) {
    return (
      <View style={styles.detailWrap}>
        <Text style={styles.detailNotFound}>
          {t('rider.wallet.history.receiptNotFound')}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('rider.wallet.history.receiptBack')}
          onPress={onBack}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>
            {t('rider.wallet.history.receiptBack')}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st = STATUS_CONFIG[receipt.status]
  const settledTotal = receipt.settledCollections.reduce(
    (s, c) => s + c.amount,
    0,
  )

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing[8],
        paddingHorizontal: spacing[4],
        paddingTop: spacing[4],
        gap: spacing[3],
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Official receipt header */}
      <View
        style={styles.receiptHeroCard}
        accessibilityRole="summary"
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={t('rider.wallet.history.rowAria', {
          date: formatDateTime(receipt.depositedAt),
          amount: formatRiderNPRAmount(receipt.amount),
          method: receipt.methodLabel,
          reference: receipt.reference,
          status: t(st.labelKey),
        })}
      >
        <View style={styles.receiptBadge}>
          <Receipt size={18} color={colors.primary} />
          <Text style={styles.receiptBadgeText}>
            {t('rider.wallet.history.receiptTitle')}
          </Text>
        </View>
        <View style={[styles.statusPillLg, { backgroundColor: st.bg }]}>
          {st.icon}
          <Text style={[styles.statusPillLgText, { color: st.text }]}>
            {t(st.labelKey)}
          </Text>
        </View>
        <Text style={styles.receiptAmount} accessibilityRole="text">
          NPR {formatRiderNPRAmount(receipt.amount)}
        </Text>
        <Text style={styles.receiptMethod}>{receipt.methodLabel}</Text>
        <Text style={styles.receiptRefText}>
          {t('rider.wallet.history.receiptReference')}: {receipt.reference}
        </Text>
      </View>

      {/* Deposit details */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {t('rider.wallet.history.receiptTitle')}
        </Text>
      </View>
      <View style={styles.detailCard}>
        <DetailRow
          label={t('rider.wallet.history.receiptDepositedAt')}
          value={formatDateTime(receipt.depositedAt)}
        />
        {receipt.verifiedAt && (
          <DetailRow
            label={t('rider.wallet.history.receiptVerifiedAt')}
            value={formatDateTime(receipt.verifiedAt)}
          />
        )}
        <DetailRow
          label={t('rider.wallet.history.receiptMethod')}
          value={receipt.methodLabel}
        />
        {receipt.locationName && (
          <DetailRow
            label={t('rider.wallet.history.receiptLocation')}
            value={receipt.locationName}
          />
        )}
        {receipt.bankName && (
          <DetailRow
            label={t('rider.wallet.history.receiptBank')}
            value={receipt.bankName}
          />
        )}
      </View>

      {/* Settled collections breakdown */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {t('rider.wallet.history.receiptBreakdown')}
        </Text>
      </View>
      <Text style={styles.breakdownHint}>
        {t('rider.wallet.history.receiptBreakdownHint')}
      </Text>
      <View style={styles.detailCard}>
        {receipt.settledCollections.map(c => (
          <View key={c.id} style={styles.collectionRow}>
            <View style={styles.collectionLeft}>
              <Text style={styles.collectionOrderId}>{c.orderId}</Text>
              <Text style={styles.collectionMeta}>
                {c.buyerArea} · {formatTime(c.collectedAt)}
              </Text>
              {c.status !== 'collected' && (
                <View
                  style={[
                    styles.collectionStatusPill,
                    {
                      backgroundColor:
                        c.status === 'partial'
                          ? colors.warningLight
                          : colors.errorLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.collectionStatusText,
                      {
                        color:
                          c.status === 'partial'
                            ? colors.warning
                            : colors.error,
                      },
                    ]}
                  >
                    {c.status}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.collectionAmount} accessibilityRole="text">
              NPR {formatRiderNPRAmount(c.amount)}
            </Text>
          </View>
        ))}
        <View style={styles.settledTotalRow}>
          <Text style={styles.settledTotalLabel}>
            {t('rider.wallet.history.receiptSummaryLine', {
              count: receipt.settledCollections.length,
              total: formatRiderNPRAmount(settledTotal),
            })}
          </Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {t('rider.wallet.history.receiptTimeline')}
        </Text>
      </View>
      <View style={styles.detailCard}>
        {receipt.timeline.map((step, i) => {
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'
          const isLast = i === receipt.timeline.length - 1
          const isFailed = step.key === 'failed'
          return (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    isFailed
                      ? styles.timelineDotFailed
                      : isCompleted || isCurrent
                        ? styles.timelineDotActive
                        : styles.timelineDotInactive,
                  ]}
                >
                  {(isCompleted || isCurrent) && !isFailed && (
                    <CheckCircle2 size={10} color={colors.white} />
                  )}
                  {isFailed && <XCircle size={10} color={colors.error} />}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      isFailed
                        ? styles.timelineLineFailed
                        : isCompleted || isCurrent
                          ? styles.timelineLineActive
                          : styles.timelineLineInactive,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineRight}>
                <Text
                  style={[
                    styles.timelineLabel,
                    isFailed
                      ? styles.timelineLabelFailed
                      : isCompleted || isCurrent
                        ? styles.timelineLabelActive
                        : styles.timelineLabelInactive,
                  ]}
                >
                  {step.label}
                </Text>
                {step.timestamp && (
                  <Text style={styles.timelineTime}>
                    {formatDateTime(step.timestamp)}
                  </Text>
                )}
                {step.note && (
                  <Text
                    style={[
                      styles.timelineNote,
                      isFailed && styles.timelineNoteFailed,
                    ]}
                  >
                    {step.note}
                  </Text>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {/* Proof */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {t('rider.wallet.history.receiptProof')}
        </Text>
      </View>
      <View style={styles.proofCard}>
        <FileCheck2 size={16} color={colors.primary} />
        <View style={styles.proofTextWrap}>
          <Text style={styles.proofLabel}>
            {t('rider.wallet.history.receiptProofLabel')}
          </Text>
          <Text style={styles.proofText}>{receipt.proofNote}</Text>
        </View>
      </View>

      {/* Export */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.history.receiptExportAria')}
        onPress={onExport}
        style={[styles.exportBtn, { minHeight: minTouchTarget }]}
      >
        <Share2 size={16} color={colors.primary} />
        <Text style={styles.exportText}>
          {t('rider.wallet.history.receiptExport')}
        </Text>
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.history.receiptBack')}
        onPress={onBack}
        style={[styles.detailBackBtn, { minHeight: minTouchTarget * 0.9 }]}
      >
        <ChevronLeft size={16} color={colors.textMuted} />
        <Text style={styles.detailBackText}>
          {t('rider.wallet.history.receiptBack')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text
        style={styles.detailRowValue}
        accessibilityRole="text"
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  t,
  router,
  minTouchTarget,
}: {
  t: ReturnType<typeof useTranslation>['t']
  router: ReturnType<typeof useRouter>
  minTouchTarget: number
}) {
  return (
    <View style={styles.emptyWrap}>
      <Banknote size={32} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{t('rider.wallet.history.empty')}</Text>
      <Text style={styles.emptySub}>
        {t('rider.wallet.history.emptySubtitle')}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.wallet.history.emptyCtaAria')}
        onPress={() => router.push('/wallet/deposit' as never)}
        style={[styles.emptyCta, { minHeight: minTouchTarget }]}
      >
        <Text style={styles.emptyCtaText}>
          {t('rider.wallet.history.emptyCta')}
        </Text>
        <ArrowRight size={16} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={ariaLabel}
      accessibilityLiveRegion="polite"
      accessible
    >
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[styles.skeletonBlock, { height: 80 }]} />
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingHorizontal: spacing[4] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },
  headerSub: {
    fontSize: 13,
    color: colors.primary50,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },

  // Reconciliation card
  reconCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow('sm'),
  },
  reconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  reconTitle: {
    fontSize: fontSize.md[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  reconRows: { gap: spacing[2] },
  reconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reconLabel: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  reconValue: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  reconOutstandingRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[2],
    marginTop: spacing[1],
  },
  reconOutstandingLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  reconHint: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    marginTop: spacing[3],
    lineHeight: 16,
  },

  // Filters
  filterBar: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing[2.5],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  filterLabel: {
    fontSize: fontSize.xs[0],
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
    minWidth: 50,
  },
  filterChipsScroll: { flex: 1 },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    marginRight: spacing[2],
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  filterChipText: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  // Count
  countText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    fontFamily: fontFamily.sans[0],
  },

  // Day group
  dayGroup: { gap: spacing[2] },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[1],
  },
  dayLabel: {
    fontSize: fontSize.sm[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  daySubtotal: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sans[0],
  },

  // Deposit row
  depCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
    minHeight: 76,
    ...shadow('sm'),
  },
  depIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  depMethod: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  depRef: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
    letterSpacing: 0.3,
  },
  depRight: { alignItems: 'flex-end' },
  depAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginTop: spacing[1],
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // No results
  noResultsWrap: {
    alignItems: 'center',
    paddingVertical: spacing[10],
  },
  noResultsText: {
    fontSize: fontSize.sm[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  emptyTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    marginTop: spacing[3],
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },

  // Receipt detail
  detailWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  detailNotFound: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  receiptHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[5],
    alignItems: 'center',
    gap: spacing[2],
    ...shadow('sm'),
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginBottom: spacing[1],
  },
  receiptBadgeText: {
    fontSize: fontSize.xs[0],
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  statusPillLg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
  },
  statusPillLgText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  receiptAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  receiptMethod: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  receiptRefText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: fontFamily.sans[0],
    letterSpacing: 0.3,
  },

  // Section headers
  sectionHead: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[1],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Detail card
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
    ...shadow('sm'),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRowLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
  },
  detailRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: spacing[3],
  },

  // Settled collections breakdown
  breakdownHint: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    fontFamily: fontFamily.sans[0],
    paddingHorizontal: spacing[1],
    marginBottom: spacing[1],
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  collectionLeft: { flex: 1, minWidth: 0 },
  collectionOrderId: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  collectionMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  collectionStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginTop: spacing[1],
  },
  collectionStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  collectionAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.sansBold[0],
  },
  settledTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[2.5],
  },
  settledTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.sansSemiBold[0],
    textAlign: 'center',
  },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: spacing[3] },
  timelineLeft: { alignItems: 'center' },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineDotInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
  },
  timelineDotFailed: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  timelineLine: { width: 2, flex: 1, minHeight: 32, marginTop: 2 },
  timelineLineActive: { backgroundColor: colors.primary },
  timelineLineInactive: { backgroundColor: colors.borderLight },
  timelineLineFailed: { backgroundColor: colors.error },
  timelineRight: { flex: 1, paddingBottom: spacing[3] },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fontFamily.sansSemiBold[0],
  },
  timelineLabelActive: { color: colors.text },
  timelineLabelInactive: { color: colors.textMuted },
  timelineLabelFailed: { color: colors.error, fontWeight: '700' },
  timelineTime: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  timelineNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fontFamily.sans[0],
  },
  timelineNoteFailed: { color: colors.error },

  // Proof
  proofCard: {
    flexDirection: 'row',
    gap: spacing[2.5],
    backgroundColor: colors.primary50,
    borderRadius: radii.lg,
    padding: spacing[3.5],
    borderWidth: 1,
    borderColor: 'rgba(138, 27, 87, 0.12)',
  },
  proofTextWrap: { flex: 1 },
  proofLabel: {
    fontSize: fontSize.xs[0],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
    marginBottom: spacing[1],
  },
  proofText: {
    fontSize: fontSize.sm[0],
    color: colors.textSecondary,
    fontFamily: fontFamily.sans[0],
    lineHeight: 20,
  },

  // Export + back
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  detailBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.sansSemiBold[0],
  },

  // Error
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: fontSize.lg[0],
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.sansSemiBold[0],
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.sans[0],
  },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    fontFamily: fontFamily.sansBold[0],
  },

  // Skeleton
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: {
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
  },
})
