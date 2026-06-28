import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft } from 'lucide-react-native'
import { colors, spacing, radii, fontSize } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPRAmount, getFinancePayouts, type FinancePayout, type FinancePayoutStatus } from '@chinooz/mock-data'

const STATUS_STYLES: Record<FinancePayoutStatus, { bg: string; text: string; labelKey: string }> = {
  scheduled: { bg: colors.infoLight, text: colors.info, labelKey: 'statusScheduled' },
  processing: { bg: colors.warningLight, text: colors.warning, labelKey: 'statusProcessing' },
  paid: { bg: colors.successLight, text: colors.success, labelKey: 'statusPaid' },
  failed: { bg: colors.errorLight, text: colors.error, labelKey: 'statusFailed' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PayoutsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reducedMotion, minTouchTarget } = useA11y()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const [payouts, setPayouts] = useState<FinancePayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    analytics.screen({ name: 'seller-finance-payouts' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    setError(false)
    let active = true
    getFinancePayouts()
      .then(data => {
        if (!active) return
        setPayouts(data)
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
  }, [isLoggedIn])

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/finance')
  }, [router])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('seller.finance.payouts.back')}
          onPress={goBack}
          hitSlop={8}
          style={[styles.iconBtn, { minWidth: minTouchTarget, minHeight: minTouchTarget }]}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={styles.topBarTitle}>{t('seller.finance.payouts.title')}</Text>
        <View style={{ width: minTouchTarget }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('seller.finance.payouts.subtitle')}</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{t('seller.finance.payouts.loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('seller.finance.payouts.error')}</Text>
            <TouchableOpacity onPress={() => setPayouts([])} style={styles.retryBtn} accessibilityRole="button" accessibilityLabel={t('seller.finance.payouts.retry')}>
              <Text style={styles.retryText}>{t('seller.finance.payouts.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : payouts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('seller.finance.payouts.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('seller.finance.payouts.emptySubtitle')}</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.countText} accessibilityRole="summary">{t('seller.finance.payouts.count', { count: payouts.length })}</Text>
            <View style={styles.list}>
              {payouts.map((p, i) => {
                const st = STATUS_STYLES[p.status]
                return (
                  <TouchableOpacity
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('seller.finance.payouts.rowAria', { amount: formatNPRAmount(p.amount), date: formatDate(p.date), method: p.methodLabel, status: t(`seller.finance.payouts.${st.labelKey}`) })}
                    onPress={() => {
                      try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                      router.push(`/finance/payouts/${p.id}` as never)
                    }}
                    style={[styles.payoutCard, i > 0 && styles.payoutCardBorder]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.payoutBody}>
                      <Text style={styles.payoutDate}>{formatDate(p.date)}</Text>
                      <Text style={styles.payoutMethod}>{p.methodLabel} · {p.accountMasked}</Text>
                      <Text style={styles.payoutOrders}>{t('seller.finance.payouts.orders', { count: p.orderCount })}</Text>
                    </View>
                    <View style={styles.payoutRight}>
                      <Text style={styles.payoutAmount}>NPR {formatNPRAmount(p.amount)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.text }]}>{t(`seller.finance.payouts.${st.labelKey}`)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}
        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: fontSize.lg[0], fontWeight: '700', color: colors.text },
  scrollContent: { padding: spacing[4], gap: spacing[3] },
  subtitle: { fontSize: fontSize.sm[0], color: colors.textMuted },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing[10], gap: spacing[2] },
  loadingText: { fontSize: fontSize.sm[0], color: colors.textMuted },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing[10], paddingHorizontal: spacing[4] },
  emptyTitle: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: fontSize.sm[0], color: colors.textMuted, marginTop: spacing[1], textAlign: 'center' },
  retryBtn: { marginTop: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary },
  retryText: { fontSize: fontSize.sm[0], fontWeight: '600', color: colors.primary },
  countText: { fontSize: fontSize.xs[0], color: colors.textMuted, fontWeight: '500' },
  list: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', marginTop: spacing[2] },
  payoutCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[3], minHeight: 56 },
  payoutCardBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  payoutBody: { flex: 1 },
  payoutDate: { fontSize: fontSize.base[0], fontWeight: '600', color: colors.text },
  payoutMethod: { fontSize: fontSize.xs[0], color: colors.textMuted, marginTop: 2 },
  payoutOrders: { fontSize: fontSize.xs[0], color: colors.textTertiary, marginTop: 2 },
  payoutRight: { alignItems: 'flex-end' },
  payoutAmount: { fontSize: fontSize.base[0], fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  statusBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm, marginTop: spacing[1] },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
})
