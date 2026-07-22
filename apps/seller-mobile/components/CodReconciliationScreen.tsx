import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Banknote, Download, Check } from 'lucide-react-native'
import { useCodReconciliation } from '@chinooz/hooks'
import { exportCodReconciliationCSV, formatNPRAmount, type CodRemittanceStatus } from '@chinooz/mock-data'
import { colors, spacing, radii, fontFamily } from '../lib/theme'
import type { CodReconciliationEntry } from '@chinooz/mock-data'

const RANGES = [
  { days: 7, labelKey: 'seller.cod.range7' },
  { days: 30, labelKey: 'seller.cod.range30' },
]

const STATUS_STYLE: Record<CodRemittanceStatus, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warningText },
  in_transit: { bg: colors.infoLight, text: colors.info },
  remitted: { bg: colors.successLight, text: colors.successText },
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function CodReconciliationScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [rangeDays, setRangeDays] = useState(30)
  const { data, isLoading, refetch, isFetching } = useCodReconciliation(rangeDays)
  const [exported, setExported] = useState(false)

  const statusLabel = (s: CodRemittanceStatus) =>
    s === 'pending' ? t('seller.cod.statusPending') : s === 'in_transit' ? t('seller.cod.statusInTransit') : t('seller.cod.statusRemitted')

  const handleExport = useCallback(async () => {
    if (!data) return
    try {
      await Share.share(
        { message: exportCodReconciliationCSV(data), title: t('seller.cod.title') },
      )
      setExported(true)
      setTimeout(() => setExported(false), 2500)
    } catch {
      // user cancelled or share unavailable
    }
  }, [data, t])

  const summary = [
    { label: t('seller.cod.collected'), value: data?.totalCollected, color: colors.text },
    { label: t('seller.cod.commission'), value: data?.totalCommission, color: colors.error },
    { label: t('seller.cod.pending'), value: data?.pendingRemittance, color: colors.warningText },
    { label: t('seller.cod.remitted'), value: data?.totalRemitted, color: colors.success },
  ]

  const renderItem = ({ item }: { item: CodReconciliationEntry }) => {
    const st = STATUS_STYLE[item.status]
    return (
      <View style={styles.row}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2] }}>
          <Text style={styles.rowOrderId} numberOfLines={1}>{item.orderId}</Text>
          <Text style={styles.rowDate}>{formatDate(item.date, i18n.language)}</Text>
        </View>
        <View style={styles.rowAmounts}>
          <View style={styles.rowAmountCol}>
            <Text style={styles.rowAmountLabel}>{t('seller.cod.colCollected')}</Text>
            <Text style={styles.rowAmountValue}>NPR {formatNPRAmount(item.collected)}</Text>
          </View>
          <View style={styles.rowAmountCol}>
            <Text style={styles.rowAmountLabel}>{t('seller.cod.colCommission')}</Text>
            <Text style={[styles.rowAmountValue, { color: colors.error }]}>−{formatNPRAmount(item.commission)}</Text>
          </View>
          <View style={styles.rowAmountCol}>
            <Text style={styles.rowAmountLabel}>{t('seller.cod.colNet')}</Text>
            <Text style={[styles.rowAmountValue, { fontWeight: '700' }]}>NPR {formatNPRAmount(item.netRemittable)}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.text }]}>{statusLabel(item.status)}</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 }}>
          <Banknote size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>{t('seller.cod.title')}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>{t('seller.cod.subtitle')}</Text>

      <View style={styles.toolbar}>
        <View style={styles.rangeToggle}>
          {RANGES.map(r => {
            const active = rangeDays === r.days
            return (
              <TouchableOpacity
                key={r.days}
                onPress={() => setRangeDays(r.days)}
                style={[styles.rangePill, active && styles.rangePillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(r.labelKey)}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{t(r.labelKey)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <TouchableOpacity
          onPress={handleExport}
          disabled={!data}
          style={styles.exportBtn}
          accessibilityRole="button"
          accessibilityLabel={t('seller.cod.export')}
        >
          {exported ? <Check size={15} color={colors.success} /> : <Download size={15} color={colors.text} />}
          <Text style={styles.exportText}>{exported ? t('seller.cod.exported') : t('seller.cod.export')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryGrid}>
        {summary.map((c, i) => (
          <View key={i} style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{c.label}</Text>
            <Text style={[styles.summaryValue, { color: c.color }]}>
              {isLoading || c.value == null ? '—' : `NPR ${formatNPRAmount(c.value)}`}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        data={data?.entries ?? []}
        keyExtractor={e => e.orderId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingVertical: spacing[10], alignItems: 'center' }}>
              <ActivityIndicator size={24} color={colors.primary} />
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('seller.cod.title')}</Text>
          )
        }
      />
    </SafeAreaView>
  )
}

export default CodReconciliationScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  subtitle: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[3] },
  rangeToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.full, padding: spacing[1], gap: spacing[1], borderWidth: 1, borderColor: colors.borderLight },
  rangePill: { paddingVertical: spacing[1.5], paddingHorizontal: spacing[3], borderRadius: radii.full },
  rangePillActive: { backgroundColor: colors.primary },
  rangeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, fontFamily: fontFamily.sansSemiBold[0] },
  rangeTextActive: { color: colors.white },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  exportText: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing[4], gap: spacing[3] },
  summaryCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, padding: spacing[3], gap: spacing[1] },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, color: colors.textMuted },
  summaryValue: { fontSize: 17, fontWeight: '700', fontFamily: fontFamily.sansBold[0] },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.lg, padding: spacing[3.5], gap: spacing[2] },
  rowOrderId: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0], flex: 1 },
  rowDate: { fontSize: 12, color: colors.textMuted },
  rowAmounts: { flexDirection: 'row', gap: spacing[2] },
  rowAmountCol: { flex: 1, gap: 2 },
  rowAmountLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, color: colors.textMuted },
  rowAmountValue: { fontSize: 13, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radii.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing[8] },
})
