import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  Share,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  ChevronRight,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Download,
} from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  getTransactions,
  getTransactionById,
  exportTransactionsCSV,
  formatNPRAmount,
  type Transaction,
  type TransactionFilters,
  type TransactionType,
  type TransactionDetail,
} from '@chinooz/mock-data'

const TYPE_LABEL_KEY: Record<TransactionType | 'all', string> = {
  all: 'typeAll',
  sale: 'typeSale',
  refund: 'typeRefund',
  fee: 'typeFee',
  payout: 'typePayout',
  adjustment: 'typeAdjustment',
}

const SORT_OPTIONS: { key: TransactionFilters['sort']; labelKey: string }[] = [
  { key: 'date_desc', labelKey: 'sortDateDesc' },
  { key: 'date_asc', labelKey: 'sortDateAsc' },
  { key: 'net_desc', labelKey: 'sortNetDesc' },
  { key: 'net_asc', labelKey: 'sortNetAsc' },
]

function signedNet(net: number): string {
  const sign = net > 0 ? '+' : net < 0 ? '−' : ''
  return `${sign}${formatNPRAmount(Math.abs(net))}`
}

function txColor(type: TransactionType): string {
  if (type === 'sale' || type === 'adjustment') return colors.success
  return colors.error
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function TransactionsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    dateRange: 'all',
    sort: 'date_desc',
  })
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [items, setItems] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TransactionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance-transactions' })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const effectiveFilters = useMemo(
    () => ({ ...filters, orderId: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    setError(false)
    let active = true
    getTransactions(effectiveFilters)
      .then(data => {
        if (!active) return
        setItems(data.items)
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
  }, [effectiveFilters, isLoggedIn])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    let active = true
    getTransactionById(selectedId).then(d => {
      if (!active) return
      setDetail(d)
      setDetailLoading(false)
    })
    return () => {
      active = false
    }
  }, [selectedId])

  const handleExport = useCallback(async () => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    const csv = exportTransactionsCSV(items)
    try {
      await Share.share({
        message: csv,
        title: `Transactions ${new Date().toISOString().slice(0, 10)}`,
      })
    } catch {}
  }, [items, reducedMotion])

  const updateFilter = useCallback((patch: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ type: 'all', dateRange: 'all', sort: 'date_desc' })
    setSearchInput('')
  }, [])

  const hasActiveFilters =
    filters.type !== 'all' || filters.dateRange !== 'all' || debouncedSearch !== ''

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of items) {
      const key = tx.date.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(tx)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [items])

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/finance')
  }, [router])

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.tx.back')}
          onPress={goBack}
          hitSlop={8}
          style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.searchWrap}>
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t('seller.finance.tx.search')}
            accessibilityLabel={t('seller.finance.tx.searchAria')}
            style={styles.searchInput}
            placeholderTextColor={colors.textTertiary}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchInput('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
              style={styles.clearBtn}
            >
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.tx.filterAria')}
          onPress={() => setShowFilters(s => !s)}
          hitSlop={8}
          style={[
            styles.iconBtn,
            { minWidth: minTouchTarget, minHeight: minTouchTarget },
            (showFilters || hasActiveFilters) && styles.iconBtnActive,
          ]}
        >
          <SlidersHorizontal size={20} color={showFilters || hasActiveFilters ? colors.primary : colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.tx.sortAria')}
          onPress={() => setShowSort(s => !s)}
          hitSlop={8}
          style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ArrowUpDown size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.tx.exportAria')}
          onPress={handleExport}
          hitSlop={8}
          style={[styles.exportBtn, { minHeight: minTouchTarget }]}
        >
          <Download size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterRow}>
          <View style={styles.pillRow}>
            {(['all', 'sale', 'refund', 'fee', 'payout', 'adjustment'] as const).map(typ => (
              <TouchableOpacity
                key={typ}
                accessibilityRole="button"
                accessibilityState={{ selected: filters.type === typ }}
                onPress={() => updateFilter({ type: typ })}
                style={[styles.pill, filters.type === typ && styles.pillActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.pillText, filters.type === typ && styles.pillTextActive]}>
                  {t(`seller.finance.tx.${TYPE_LABEL_KEY[typ]}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.pillRow, { marginTop: spacing[2] }]}>
            {(['all', '7d', '30d', 'custom'] as const).map(dr => (
              <TouchableOpacity
                key={dr}
                accessibilityRole="button"
                accessibilityState={{ selected: filters.dateRange === dr }}
                onPress={() => updateFilter({ dateRange: dr })}
                style={[styles.pill, filters.dateRange === dr && styles.pillActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.pillText, filters.dateRange === dr && styles.pillTextActive]}>
                  {dr === 'all'
                    ? t('seller.finance.tx.dateAll')
                    : dr === '7d'
                      ? t('seller.finance.tx.date7d')
                      : dr === '30d'
                        ? t('seller.finance.tx.date30d')
                        : t('seller.finance.tx.dateCustom')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {hasActiveFilters && (
            <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
              <Text style={styles.resetText}>{t('seller.finance.tx.reset')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <RNModal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowSort(false)}>
          <Pressable style={styles.sortSheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('seller.finance.tx.sort')}</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected: filters.sort === opt.key }}
                onPress={() => {
                  updateFilter({ sort: opt.key })
                  setShowSort(false)
                }}
                style={styles.sortRow}
              >
                <Text
                  style={[
                    styles.sortText,
                    filters.sort === opt.key && styles.sortTextActive,
                  ]}
                >
                  {t(`seller.finance.tx.${opt.labelKey}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </RNModal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('seller.finance.tx.title')}</Text>
        <Text style={styles.subtitle}>{t('seller.finance.tx.subtitle')}</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{t('seller.finance.tx.loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('seller.finance.tx.error')}</Text>
            <TouchableOpacity
              onPress={() => setFilters(f => ({ ...f }))}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel={t('seller.finance.tx.retry')}
            >
              <Text style={styles.retryText}>{t('seller.finance.tx.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('seller.finance.tx.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('seller.finance.tx.emptySubtitle')}</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.countText} accessibilityRole="summary">
              {t('seller.finance.tx.count', { count: items.length })}
            </Text>
            {grouped.map(([date, txs]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{formatDate(date)}</Text>
                <View style={styles.card}>
                  {txs.map((tx, i) => (
                    <TouchableOpacity
                      key={tx.id}
                      accessibilityRole="button"
                      accessibilityLabel={
                        tx.orderId
                          ? t('seller.finance.tx.rowAria', {
                              type: t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`),
                              order: tx.orderId,
                              net: `NPR ${formatNPRAmount(Math.abs(tx.net))}`,
                              date: formatDate(tx.date),
                            })
                          : t('seller.finance.tx.rowAriaNoOrder', {
                              type: t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`),
                              net: `NPR ${formatNPRAmount(Math.abs(tx.net))}`,
                              date: formatDate(tx.date),
                            })
                      }
                      onPress={() => {
                        try {
                          if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        } catch {}
                        setSelectedId(tx.id)
                      }}
                      style={[styles.txRow, i > 0 && styles.txRowBorder]}
                      activeOpacity={0.85}
                    >
                      <View style={styles.txBody}>
                        <View style={styles.txTypeRow}>
                          <Text style={styles.txType}>
                            {t(`seller.finance.tx.${TYPE_LABEL_KEY[tx.type]}`)}
                          </Text>
                          <View
                            style={[
                              styles.dirBadge,
                              { backgroundColor: tx.direction === 'credit' ? colors.successLight : colors.errorLight },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dirText,
                                { color: tx.direction === 'credit' ? colors.success : colors.error },
                              ]}
                            >
                              {tx.direction === 'credit'
                                ? t('seller.finance.tx.credit')
                                : t('seller.finance.tx.debit')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.txMetaRow}>
                          {tx.orderId && (
                            <Text style={styles.txOrder}>{tx.orderId}</Text>
                          )}
                          <Text style={styles.txDate}>{formatDateShort(tx.date)}</Text>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txNet, { color: txColor(tx.type) }]}>
                          {signedNet(tx.net)}
                        </Text>
                        <Text style={styles.txBalance}>
                          NPR {formatNPRAmount(tx.runningBalance)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: spacing[8] }} />
      </ScrollView>

      <RNModal
        visible={selectedId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedId(null)}>
          <Pressable
            style={styles.detailSheet}
            accessibilityRole="alert"
            accessibilityLabel={t('seller.finance.tx.detailTitle')}
            onPress={e => e.stopPropagation()}
          >
            {detailLoading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : detail ? (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{t('seller.finance.tx.detailTitle')}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedId(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.finance.tx.detailClose')}
                  >
                    <X size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('seller.finance.tx.detailType')}</Text>
                    <View style={styles.detailTypeWrap}>
                      <Text style={styles.detailValue}>
                        {t(`seller.finance.tx.${TYPE_LABEL_KEY[detail.type]}`)}
                      </Text>
                      <View
                        style={[
                          styles.dirBadge,
                          { backgroundColor: detail.direction === 'credit' ? colors.successLight : colors.errorLight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dirText,
                            { color: detail.direction === 'credit' ? colors.success : colors.error },
                          ]}
                        >
                          {detail.direction === 'credit'
                            ? t('seller.finance.tx.credit')
                            : t('seller.finance.tx.debit')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {detail.orderId && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('seller.finance.tx.detailOrder')}</Text>
                      <Text style={styles.detailOrder}>{detail.orderId}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('seller.finance.tx.detailDate')}</Text>
                    <Text style={styles.detailValue}>{formatDate(detail.date)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('seller.finance.tx.detailGross')}</Text>
                    <Text style={styles.detailAmount}>NPR {formatNPRAmount(detail.gross)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('seller.finance.tx.detailFees')}</Text>
                    <Text style={styles.detailAmountMuted}>
                      {detail.fees > 0 ? `NPR ${formatNPRAmount(detail.fees)}` : '—'}
                    </Text>
                  </View>

                  <View style={[styles.detailRow, styles.detailRowBorder]}>
                    <Text style={styles.detailLabelBold}>{t('seller.finance.tx.detailNet')}</Text>
                    <Text style={[styles.detailAmount, { color: txColor(detail.type), fontWeight: '700' }]}>
                      {signedNet(detail.net)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('seller.finance.tx.detailBalance')}</Text>
                    <Text style={styles.detailAmount}>NPR {formatNPRAmount(detail.runningBalance)}</Text>
                  </View>
                </View>

                <View style={styles.breakdownSection}>
                  <Text style={styles.breakdownTitle}>{t('seller.finance.tx.detailBreakdown')}</Text>
                  {detail.breakdown.map((b, i) => (
                    <View key={i} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{b.label}</Text>
                      <Text
                        style={[
                          styles.breakdownAmount,
                          { color: b.direction === 'credit' ? colors.success : colors.error },
                        ]}
                      >
                        {b.direction === 'credit' ? '+' : '−'}
                        {formatNPRAmount(Math.abs(b.amount))}
                      </Text>
                    </View>
                  ))}
                </View>

                {detail.orderId && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedId(null)
                      router.push(`/orders/${detail.orderId}` as never)
                    }}
                    style={styles.viewOrderBtn}
                    accessibilityRole="link"
                    accessibilityLabel={t('seller.finance.tx.detailViewOrder')}
                  >
                    <Text style={styles.viewOrderText}>
                      {t('seller.finance.tx.detailViewOrder')}
                    </Text>
                    <ChevronRight size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.detailLoading}>
                <Text style={styles.emptyTitle}>{t('seller.finance.tx.error')}</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </RNModal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
  iconBtnActive: { backgroundColor: colors.primary50, borderRadius: radii.md },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm[0], color: colors.text },
  clearBtn: { padding: spacing[1] },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted },
  pillTextActive: { color: colors.white },
  resetBtn: { marginTop: spacing[2], alignSelf: 'flex-start' },
  resetText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.primary },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sortSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing[5],
  },
  sheetTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, marginBottom: spacing[3] },
  sortRow: { paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sortText: { fontSize: fontSize.base[0], color: colors.textMuted },
  sortTextActive: { color: colors.primary, fontWeight: '600' },
  scrollContent: { padding: spacing[4], gap: spacing[3] },
  title: { fontSize: fontSize.xl[0], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: -spacing[1] },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing[10], gap: spacing[2] },
  loadingText: { fontSize: fontSize.sm[0], color: colors.textMuted },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[10], paddingHorizontal: spacing[4] },
  emptyTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: spacing[1], textAlign: 'center' },
  retryBtn: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  countText: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '500' },
  dateGroup: { marginTop: spacing[4] },
  dateHeader: {
    fontSize: fontSize.xs[0],
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  txRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  txBody: { flex: 1 },
  txTypeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  txType: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  dirBadge: { paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radii.sm },
  dirText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2 },
  txOrder: { fontSize: fontSize.xs[0], color: colors.textMuted, fontFamily: 'monospace' },
  txDate: { fontSize: fontSize.xs[0], color: colors.textTertiary },
  txRight: { alignItems: 'flex-end' },
  txNet: { fontSize: fontSize.base[0], fontWeight: '700', fontVariant: ['tabular-nums'] },
  txBalance: { fontSize: fontSize.xs[0], color: colors.textMuted, fontVariant: ['tabular-nums'], marginTop: 2 },
  detailSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing[5],
    maxHeight: '85%',
  },
  detailLoading: { paddingVertical: spacing[10], alignItems: 'center' },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  detailTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  detailBody: { gap: spacing[2] },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  detailRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing[2], paddingTop: spacing[3] },
  detailLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  detailLabelBold: { fontSize: fontSize.sm[0], color: colors.text, fontWeight: '600' },
  detailValue: { fontSize: fontSize.sm[0], color: colors.text, fontWeight: '500' },
  detailTypeWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  detailOrder: { fontSize: fontSize.sm[0], color: colors.text, fontFamily: 'monospace', fontWeight: '600' },
  detailAmount: { fontSize: fontSize.sm[0], color: colors.text, fontVariant: ['tabular-nums'] },
  detailAmountMuted: { fontSize: fontSize.sm[0], color: colors.textMuted, fontVariant: ['tabular-nums'] },
  breakdownSection: { marginTop: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.borderLight },
  breakdownTitle: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2] },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[1.5] },
  breakdownLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  breakdownAmount: { fontSize: fontSize.sm[0], fontWeight: '500', fontVariant: ['tabular-nums'] },
  viewOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.primary50,
  },
  viewOrderText: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.primary },
})
