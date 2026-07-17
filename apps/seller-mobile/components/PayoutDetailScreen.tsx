import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, Download, Info, ChevronRight } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '../lib/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import {
  getFinancePayoutById,
  exportFinancePayoutStatementCSV,
  formatNPRAmount,
  type FinancePayoutDetail,
  type FinancePayoutStatus,
} from '@chinooz/mock-data'

const STATUS_STYLES: Record<FinancePayoutStatus, { bg: string; text: string; labelKey: string }> = {
  scheduled: { bg: colors.infoLight, text: colors.info, labelKey: 'statusScheduled' },
  processing: { bg: colors.warningLight, text: colors.warning, labelKey: 'statusProcessing' },
  paid: { bg: colors.successLight, text: colors.success, labelKey: 'statusPaid' },
  failed: { bg: colors.errorLight, text: colors.error, labelKey: 'statusFailed' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return (
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
    ' · ' +
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

function signedAmount(amount: number, direction: 'credit' | 'debit'): string {
  const sign = direction === 'credit' ? '+' : '−'
  return `${sign}${formatNPRAmount(Math.abs(amount))}`
}

export default function PayoutDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { reducedMotion, minTouchTarget } = useA11y()
  const id = params.id
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [detail, setDetail] = useState<FinancePayoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [explainerOpen, setExplainerOpen] = useState<string | null>(null)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance-payout-detail' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn || !id) return
    setLoading(true)
    let active = true
    getFinancePayoutById(id)
      .then((d: FinancePayoutDetail | null) => {
        if (!active) return
        setDetail(d)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setDetail(null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, isLoggedIn])

  const handleDownload = useCallback(async () => {
    if (!detail) return
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    const csv = exportFinancePayoutStatementCSV(detail)
    try {
      await Share.share({
        message: csv,
        title: t('seller.finance.payouts.shareTitle', { id: detail.id }),
      })
    } catch {}
  }, [detail, reducedMotion, t])

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/finance/payouts')
  }, [router])

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            hitSlop={8}
            style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            accessibilityRole="button"
            accessibilityLabel={t('seller.finance.payouts.detail.back')}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            hitSlop={8}
            style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
            accessibilityRole="button"
            accessibilityLabel={t('seller.finance.payouts.detail.back')}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{t('seller.finance.payouts.error')}</Text>
        </View>
      </View>
    )
  }

  const st = STATUS_STYLES[detail.status]

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBack}
          hitSlop={8}
          style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.payouts.detail.back')}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.topBarTitle}>
          {t('seller.finance.payouts.detail.title')}
        </Text>
        <View style={{ width: minTouchTarget }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDate}>{formatDate(detail.date)}</Text>
              <Text style={styles.headerMethod}>
                {detail.methodLabel} · {detail.accountMasked}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.text }]}>
                {t(`seller.finance.payouts.${st.labelKey}`)}
              </Text>
            </View>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t('seller.finance.payouts.detail.netPayout')}</Text>
            <Text style={styles.amountValue}>NPR {formatNPRAmount(detail.netPayout)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('seller.finance.payouts.detail.breakdown')}</Text>
            <TouchableOpacity
              onPress={handleDownload}
              style={styles.downloadBtn}
              accessibilityRole="button"
              accessibilityLabel={t('seller.finance.payouts.detail.downloadAria')}
            >
              <Download size={16} color={colors.white} />
              <Text style={styles.downloadText}>{t('seller.finance.payouts.detail.download')}</Text>
            </TouchableOpacity>
          </View>

          {detail.breakdown.map((row, i) => {
            const isTotal = row.label === 'Net payout'
            return (
              <View key={i}>
                <View style={[styles.bdRow, isTotal && styles.bdRowTotal]}>
                  <View style={styles.bdLabelWrap}>
                    <Text style={[styles.bdLabel, isTotal && styles.bdLabelTotal]}>
                      {row.label}
                    </Text>
                    {row.explainer && (
                      <TouchableOpacity
                        onPress={() =>
                          setExplainerOpen(explainerOpen === row.label ? null : row.label)
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('seller.finance.payouts.detail.explainer')}
                      >
                        <Info size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.bdAmount,
                      isTotal && styles.bdAmountTotal,
                      { color: row.direction === 'credit' ? colors.success : colors.error },
                    ]}
                  >
                    {signedAmount(row.amount, row.direction)}
                  </Text>
                </View>
                {explainerOpen === row.label && row.explainer && (
                  <Text style={styles.explainerText}>{row.explainer}</Text>
                )}
              </View>
            )
          })}

          {detail.status === 'failed' && detail.failureReason && (
            <View style={styles.failureBox}>
              <Text style={styles.failureLabel}>
                {t('seller.finance.payouts.detail.failureReason')}
              </Text>
              <Text style={styles.failureText}>{detail.failureReason}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.finance.payouts.detail.timeline')}</Text>
          <View
            style={styles.timelineWrap}
            accessibilityRole="list"
            accessibilityLabel={t('seller.finance.payouts.detail.timeline')}
          >
            {detail.timeline.map((step, i) => {
              const isCompleted = step.status === 'completed'
              const isCurrent = step.status === 'current'
              const isLast = i === detail.timeline.length - 1
              const isFailed = step.key === 'failed'
              return (
                <View key={step.key} style={styles.timelineRow} accessibilityRole="summary">
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineNode,
                        isFailed
                          ? { backgroundColor: colors.errorLight, borderColor: colors.error }
                          : isCompleted || isCurrent
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      {(isCompleted || isCurrent) && !isFailed && (
                        <Text style={styles.timelineCheck}>✓</Text>
                      )}
                      {isFailed && <Text style={styles.timelineX}>✕</Text>}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: isFailed
                              ? colors.error
                              : isCompleted || isCurrent
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineRight}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isFailed
                          ? { color: colors.error, fontWeight: '700' }
                          : isCompleted || isCurrent
                            ? { color: colors.text, fontWeight: '600' }
                            : { color: colors.textMuted },
                      ]}
                    >
                      {step.label}
                    </Text>
                    {step.timestamp && (
                      <Text style={styles.timelineTime}>{formatDateTime(step.timestamp)}</Text>
                    )}
                    {step.note && (
                      <Text style={[styles.timelineNote, isFailed && { color: colors.error }]}>
                        {step.note}
                      </Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('seller.finance.payouts.detail.lineItems')}</Text>
          {detail.lineItems.map((li, i) => (
            <TouchableOpacity
              key={li.orderId}
              onPress={() => router.push(`/orders/${li.orderId}` as never)}
              style={[styles.liRow, i > 0 && styles.liRowBorder]}
              accessibilityRole="button"
              accessibilityLabel={`${li.orderId}: ${t('seller.finance.payouts.detail.colGross')} NPR ${formatNPRAmount(li.gross)}, ${t('seller.finance.payouts.detail.colNet')} NPR ${formatNPRAmount(li.net)}`}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.liOrder}>{li.orderId}</Text>
                <Text style={styles.liDate}>{formatDate(li.date)}</Text>
                <View style={styles.liAmounts}>
                  <Text style={styles.liGross}>NPR {formatNPRAmount(li.gross)}</Text>
                  <Text style={styles.liDeductions}>
                    −{formatNPRAmount(li.commission + li.paymentFee + li.refund)}
                  </Text>
                </View>
              </View>
              <View style={styles.liRight}>
                <Text style={styles.liNet}>NPR {formatNPRAmount(li.net)}</Text>
                <ChevronRight size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  scrollContent: { padding: spacing[4], gap: spacing[4] },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] },
  emptyTitle: { fontSize: fontSize.base[0], color: colors.textMuted, textAlign: 'center' },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerDate: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  headerMethod: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amountLabel: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  amountValue: {
    fontSize: fontSize.xl[0],
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  cardTitle: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.text },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  downloadText: { fontSize: fontSize.xs[0], fontWeight: '600', color: colors.white },
  bdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  bdRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing[2],
    paddingTop: spacing[3],
  },
  bdLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], flex: 1 },
  bdLabel: { fontSize: fontSize.sm[0], color: colors.textMuted },
  bdLabelTotal: { fontSize: fontSize.sm[0], fontWeight: '700', color: colors.text },
  bdAmount: { fontSize: fontSize.sm[0], fontWeight: '500', fontVariant: ['tabular-nums'] },
  bdAmountTotal: { fontSize: fontSize.lg[0], fontWeight: '700' },
  explainerText: {
    fontSize: fontSize.xs[0],
    color: colors.textMuted,
    paddingBottom: spacing[2],
    lineHeight: 18,
  },
  failureBox: {
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.errorLight,
  },
  failureLabel: { fontSize: fontSize.xs[0], fontWeight: '700', color: colors.error },
  failureText: { fontSize: fontSize.sm[0], color: colors.error, marginTop: 2 },
  timelineWrap: { marginTop: spacing[3] },
  timelineRow: { flexDirection: 'row', gap: spacing[3] },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCheck: { fontSize: 10, color: colors.white, fontWeight: '700' },
  timelineX: { fontSize: 10, color: colors.error, fontWeight: '700' },
  timelineLine: { width: 2, minHeight: 32, marginTop: 4 },
  timelineRight: { flex: 1, paddingBottom: spacing[3] },
  timelineLabel: { fontSize: fontSize.sm[0] },
  timelineTime: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  timelineNote: { fontSize: fontSize.xs[0], color: colors.textTertiary, marginTop: 2 },
  liRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  liRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  liOrder: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
  },
  liDate: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 1 },
  liAmounts: { flexDirection: 'row', gap: spacing[2], marginTop: 2 },
  liGross: { fontSize: fontSize.xs[0], color: colors.text, fontVariant: ['tabular-nums'] },
  liDeductions: { fontSize: fontSize.xs[0], color: colors.error, fontVariant: ['tabular-nums'] },
  liRight: { alignItems: 'flex-end' },
  liNet: {
    fontSize: fontSize.sm[0],
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
})
