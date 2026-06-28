import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  Banknote,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader,
  Share2,
  Building2,
  Smartphone,
  Check,
} from 'lucide-react-native'
import { colors, radii, spacing, fontFamily, fontSize, shadow } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui'
import { analytics } from '@chinooz/analytics'
import { useRiderWithdrawals, useRiderWithdrawalDetail } from '@chinooz/hooks'
import {
  formatRiderNPRAmount,
  type RiderWithdrawal,
  type WithdrawalStatus,
  type RiderWithdrawalDetail,
} from '@chinooz/mock-data'

const STATUS_CONFIG: Record<WithdrawalStatus, { bg: string; text: string; icon: React.ReactNode; labelKey: string; ariaKey: string }> = {
  requested: { bg: colors.infoLight, text: colors.info, icon: <Clock size={11} color={colors.info} />, labelKey: 'statusRequested', ariaKey: 'statusRequestedAria' },
  processing: { bg: colors.warningLight, text: colors.warning, icon: <Loader size={11} color={colors.warning} />, labelKey: 'statusProcessing', ariaKey: 'statusProcessingAria' },
  paid: { bg: colors.successLight, text: colors.success, icon: <CheckCircle2 size={11} color={colors.success} />, labelKey: 'statusPaid', ariaKey: 'statusPaidAria' },
  failed: { bg: colors.errorLight, text: colors.error, icon: <XCircle size={11} color={colors.error} />, labelKey: 'statusFailed', ariaKey: 'statusFailedAria' },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' · ' + new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function WithdrawalHistoryScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  const { data: withdrawals, isLoading: loading, isError: error, refetch, isRefetching } = useRiderWithdrawals()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: detail, isLoading: detailLoading } = useRiderWithdrawalDetail(selectedId)

  useEffect(() => {
    analytics.screen({ name: 'rider-withdrawal-history' })
  }, [])

  const onRefresh = () => {
    refetch()
  }

  const openDetail = (id: string) => {
    try { if (!reduced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
    analytics.track('rider_withdrawal_detail_viewed', { withdrawalId: id })
    setSelectedId(id)
  }

  const closeDetail = () => {
    setSelectedId(null)
  }

  const onExportReceipt = () => {
    if (!detail) return
    const summary = [
      `Chinooz Withdrawal Receipt`,
      `Amount: NPR ${formatRiderNPRAmount(detail.amount)}`,
      `Fee: NPR ${formatRiderNPRAmount(detail.fee)}`,
      `Net: NPR ${formatRiderNPRAmount(detail.net)}`,
      `Method: ${detail.methodLabel} · ${detail.maskedAccount}`,
      `Status: ${t(`rider.earnings.payout.history.${STATUS_CONFIG[detail.status].labelKey}`)}`,
      detail.reference ? `Reference: ${detail.reference}` : '',
      `Requested: ${formatDateTime(detail.requestedAt)}`,
      detail.completedAt ? `Completed: ${formatDateTime(detail.completedAt)}` : '',
    ].filter(Boolean).join('\n')
    analytics.track('rider_withdrawal_receipt_exported', { withdrawalId: detail.id })
    Share.share({ message: summary }, { dialogTitle: t('rider.earnings.payout.receipt.exportReceipt') })
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Header t={t} router={router} insets={insets} />
        <Skeleton ariaLabel={t('rider.earnings.payout.history.skeletonAria')} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header t={t} router={router} insets={insets} />
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>{t('rider.earnings.payout.history.errorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('rider.earnings.payout.history.errorSubtitle')}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.history.retry')} onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('rider.earnings.payout.history.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header t={t} router={router} insets={insets} />

      {selectedId ? (
        <WithdrawalDetail
          t={t}
          insets={insets}
          loading={detailLoading}
          detail={detail ?? null}
          onBack={closeDetail}
          onExport={onExportReceipt}
          reduced={reduced}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8], paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {(withdrawals ?? []).length === 0 ? (
            <View style={styles.emptyWrap}>
              <Banknote size={32} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t('rider.earnings.payout.history.empty')}</Text>
              <Text style={styles.emptySub}>{t('rider.earnings.payout.history.emptySubtitle')}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.history.emptyCtaAria')} onPress={() => router.push('/cashout')} style={styles.emptyCta}>
                <Text style={styles.emptyCtaText}>{t('rider.earnings.payout.history.emptyCta')}</Text>
                <ArrowRight size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.countText} accessibilityRole="summary">
                {t('rider.earnings.payout.history.countOther', { count: (withdrawals ?? []).length })}
              </Text>
              {(withdrawals ?? []).map(w => {
                const st = STATUS_CONFIG[w.status]
                const icon = w.method === 'bank' ? <Building2 size={16} color={colors.primary} /> : <Smartphone size={16} color={colors.primary} />
                return (
                  <TouchableOpacity
                    key={w.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('rider.earnings.payout.history.rowAria', {
                      date: formatDateTime(w.requestedAt),
                      amount: formatRiderNPRAmount(w.amount),
                      method: w.methodLabel,
                      status: t(`rider.earnings.payout.history.${st.labelKey}`),
                      fee: formatRiderNPRAmount(w.fee),
                      net: formatRiderNPRAmount(w.net),
                    })}
                    onPress={() => openDetail(w.id)}
                    style={styles.wdCard}
                    activeOpacity={0.85}
                  >
                    <View style={styles.wdIcon}>
                      {icon}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.wdDate}>{formatDateTime(w.requestedAt)}</Text>
                      <Text style={styles.wdMethod}>{w.methodLabel} · {w.maskedAccount}</Text>
                      <Text style={styles.wdNet}>{t('rider.earnings.payout.history.net', { net: formatRiderNPRAmount(w.net) })}</Text>
                    </View>
                    <View style={styles.wdRight}>
                      <Text style={styles.wdAmount}>NPR {formatRiderNPRAmount(w.amount)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                        {st.icon}
                        <Text style={[styles.statusPillText, { color: st.text }]}>
                          {t(`rider.earnings.payout.history.${st.labelKey}`)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

function WithdrawalDetail({ t, insets, loading, detail, onBack, onExport, reduced }: {
  t: ReturnType<typeof useTranslation>['t']
  insets: ReturnType<typeof useSafeAreaInsets>
  loading: boolean
  detail: RiderWithdrawalDetail | null
  onBack: () => void
  onExport: () => void
  reduced: boolean
}) {
  if (loading) {
    return (
      <View style={styles.detailWrap}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[12] }} />
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={styles.detailWrap}>
        <Text style={styles.detailNotFound}>{t('rider.earnings.payout.receipt.notFound')}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>{t('rider.earnings.payout.receipt.back')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st = STATUS_CONFIG[detail.status]

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8], paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Status hero */}
      <View style={styles.detailHeroCard} accessibilityRole="text" accessibilityLiveRegion="polite" accessible accessibilityLabel={t(`rider.earnings.payout.history.${st.ariaKey}`, { reason: detail.failureReason ?? '' })}>
        <View style={[styles.statusPillLg, { backgroundColor: st.bg }]}>
          {st.icon}
          <Text style={[styles.statusPillLgText, { color: st.text }]}>
            {t(`rider.earnings.payout.receipt.status${detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}`)}
          </Text>
        </View>
        <Text style={styles.detailAmount}>NPR {formatRiderNPRAmount(detail.net)}</Text>
        <Text style={styles.detailMethod}>{detail.methodLabel} · {detail.maskedAccount}</Text>
        {detail.reference && (
          <Text style={styles.detailRef}>{t('rider.earnings.payout.receipt.reference')}: {detail.reference}</Text>
        )}
      </View>

      {/* Breakdown */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('rider.earnings.payout.receipt.breakdown')}</Text>
      </View>
      <View style={styles.detailCard}>
        <DetailRow label={t('rider.earnings.payout.receipt.amount')} value={`NPR ${formatRiderNPRAmount(detail.amount)}`} />
        <DetailRow label={t('rider.earnings.payout.receipt.fee')} value={`−NPR ${formatRiderNPRAmount(detail.fee)}`} valueColor={colors.error} />
        <View style={styles.detailNetRow}>
          <Text style={styles.detailNetLabel}>{t('rider.earnings.payout.receipt.net')}</Text>
          <Text style={styles.detailNetValue}>NPR {formatRiderNPRAmount(detail.net)}</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('rider.earnings.payout.receipt.timeline')}</Text>
      </View>
      <View style={styles.detailCard}>
        {detail.timeline.map((step, i) => {
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'
          const isLast = i === detail.timeline.length - 1
          const isFailed = step.key === 'failed'
          return (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, isFailed ? styles.timelineDotFailed : (isCompleted || isCurrent) ? styles.timelineDotActive : styles.timelineDotInactive]}>
                  {(isCompleted || isCurrent) && !isFailed && <Check size={10} color={colors.white} />}
                  {isFailed && <XCircle size={10} color={colors.error} />}
                </View>
                {!isLast && <View style={[styles.timelineLine, isFailed ? styles.timelineLineFailed : (isCompleted || isCurrent) ? styles.timelineLineActive : styles.timelineLineInactive]} />}
              </View>
              <View style={styles.timelineRight}>
                <Text style={[styles.timelineLabel, isFailed ? styles.timelineLabelFailed : (isCompleted || isCurrent) ? styles.timelineLabelActive : styles.timelineLabelInactive]}>
                  {step.label}
                </Text>
                {step.timestamp && <Text style={styles.timelineTime}>{formatDateTime(step.timestamp)}</Text>}
                {step.note && <Text style={[styles.timelineNote, isFailed && styles.timelineNoteFailed]}>{step.note}</Text>}
              </View>
            </View>
          )
        })}
      </View>

      {/* Meta */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('rider.earnings.payout.receipt.status')}</Text>
      </View>
      <View style={styles.detailCard}>
        <DetailRow label={t('rider.earnings.payout.receipt.requestedAt')} value={formatDateTime(detail.requestedAt)} />
        {detail.completedAt && <DetailRow label={t('rider.earnings.payout.receipt.completedAt')} value={formatDateTime(detail.completedAt)} />}
        <DetailRow label={t('rider.earnings.payout.receipt.method')} value={detail.methodLabel} />
        <DetailRow label={t('rider.earnings.payout.receipt.account')} value={detail.maskedAccount} />
        {detail.failureReason && (
          <View style={styles.detailFailRow}>
            <Text style={styles.detailFailLabel}>{t('rider.earnings.payout.receipt.failureReason')}</Text>
            <Text style={styles.detailFailText}>{detail.failureReason}</Text>
          </View>
        )}
      </View>

      {/* Export */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.earnings.payout.receipt.exportReceiptAria')}
        onPress={onExport}
        style={styles.exportBtn}
      >
        <Share2 size={16} color={colors.primary} />
        <Text style={styles.exportText}>{t('rider.earnings.payout.receipt.exportReceipt')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('rider.earnings.payout.receipt.back')}
        onPress={onBack}
        style={styles.detailBackBtn}
      >
        <ChevronLeft size={16} color={colors.textMuted} />
        <Text style={styles.detailBackText}>{t('rider.earnings.payout.receipt.back')}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={[styles.detailRowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  )
}

function Header({ t, router, insets }: { t: ReturnType<typeof useTranslation>['t']; router: ReturnType<typeof useRouter>; insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[styles.headerBar, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('rider.earnings.payout.history.back')} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.headerTitle}>{t('rider.earnings.payout.history.title')}</Text>
          <Text style={styles.headerSub}>{t('rider.earnings.payout.history.subtitle')}</Text>
        </View>
      </View>
    </View>
  )
}

function Skeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <View style={styles.skeletonWrap} accessibilityRole="progressbar" accessibilityLabel={ariaLabel} accessibilityLiveRegion="polite" accessible>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[styles.skeletonBlock, { height: 80 }]} />
      ))}
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

  countText: { fontSize: 12, color: colors.textMuted, fontWeight: '500', fontFamily: fontFamily.sans[0] },

  wdCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[3.5], minHeight: 72, ...shadow('sm') },
  wdIcon: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  wdDate: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  wdMethod: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  wdNet: { fontSize: 11, color: colors.textTertiary, marginTop: 2, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sans[0] },
  wdRight: { alignItems: 'flex-end' },
  wdAmount: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.sm, marginTop: spacing[1] },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', fontFamily: fontFamily.sansSemiBold[0] },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[6], gap: spacing[2] },
  emptyTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fontFamily.sansSemiBold[0] },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  emptyCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary, marginTop: spacing[3] },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },

  // Detail view
  detailWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[3] },
  detailNotFound: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  detailHeroCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[5], alignItems: 'center', gap: spacing[2], ...shadow('sm') },
  statusPillLg: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full },
  statusPillLgText: { fontSize: 13, fontWeight: '700', fontFamily: fontFamily.sansSemiBold[0] },
  detailAmount: { fontSize: 28, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  detailMethod: { fontSize: 14, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  detailRef: { fontSize: 12, color: colors.textTertiary, fontFamily: fontFamily.sans[0] },

  sectionHead: { marginTop: spacing[1], paddingHorizontal: spacing[1] },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: fontFamily.sansSemiBold[0] },
  detailCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[2.5], ...shadow('sm') },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailRowLabel: { fontSize: 13, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  detailRowValue: { fontSize: 13, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  detailNetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing[2.5], marginTop: spacing[1] },
  detailNetLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansBold[0] },
  detailNetValue: { fontSize: 16, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: spacing[3] },
  timelineLeft: { alignItems: 'center' },
  timelineDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  timelineDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timelineDotInactive: { backgroundColor: colors.surface, borderColor: colors.borderLight },
  timelineDotFailed: { backgroundColor: colors.errorLight, borderColor: colors.error },
  timelineLine: { width: 2, flex: 1, minHeight: 32, marginTop: 2 },
  timelineLineActive: { backgroundColor: colors.primary },
  timelineLineInactive: { backgroundColor: colors.borderLight },
  timelineLineFailed: { backgroundColor: colors.error },
  timelineRight: { flex: 1, paddingBottom: spacing[3] },
  timelineLabel: { fontSize: 13, fontWeight: '600', fontFamily: fontFamily.sansSemiBold[0] },
  timelineLabelActive: { color: colors.text },
  timelineLabelInactive: { color: colors.textMuted },
  timelineLabelFailed: { color: colors.error, fontWeight: '700' },
  timelineTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2, fontFamily: fontFamily.sans[0] },
  timelineNote: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  timelineNoteFailed: { color: colors.error },

  // Failure
  detailFailRow: { backgroundColor: colors.errorLight, borderRadius: radii.md, padding: spacing[3], marginTop: spacing[1] },
  detailFailLabel: { fontSize: 12, fontWeight: '700', color: colors.error, fontFamily: fontFamily.sansSemiBold[0] },
  detailFailText: { fontSize: 13, color: colors.error, marginTop: spacing[1], fontFamily: fontFamily.sans[0] },

  // Export + back
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], minHeight: 48, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary },
  exportText: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: fontFamily.sansSemiBold[0] },
  detailBackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], minHeight: 44, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight },
  detailBackText: { fontSize: 14, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },

  // Skeleton
  skeletonWrap: { padding: spacing[4], gap: spacing[3] },
  skeletonBlock: { borderRadius: radii.lg, backgroundColor: colors.shimmer },

  // Error
  errorWrap: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: spacing[6], gap: spacing[2] },
  errorTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  errorSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', fontFamily: fontFamily.sans[0] },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.lg, backgroundColor: colors.primary },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
