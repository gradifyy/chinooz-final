import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, PackageX, ChevronRight } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import SafeImage from './SafeImage'
import type { StockAlert, StockAlertSummary } from '@chinooz/types'

export interface LowStockAlertsProps {
  summary: StockAlertSummary | undefined
  onJumpToVariant?: (variantId: string, productId: string) => void
}

export default function LowStockAlerts({ summary, onJumpToVariant }: LowStockAlertsProps) {
  const { t } = useTranslation()

  if (!summary || summary.total === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('seller.inventory.alertsTitle')}</Text>
        <Text style={styles.emptyText}>{t('seller.inventory.alertsEmpty')}</Text>
      </View>
    )
  }

  const renderSection = (title: string, alerts: StockAlert[], isOut: boolean) => {
    if (alerts.length === 0) return null
    const Icon = isOut ? PackageX : AlertTriangle
    const color = isOut ? colors.error : colors.warning
    const bg = isOut ? colors.errorLight : colors.warningLight
    return (
      <View style={styles.section} key={isOut ? 'out' : 'low'}>
        <View style={styles.sectionHeader}>
          <Icon size={16} color={color} />
          <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: bg }]}>
            <Text style={[styles.countText, { color }]}>{alerts.length}</Text>
          </View>
        </View>
        {alerts.map(alert => (
          <TouchableOpacity
            key={alert.variantId}
            onPress={() => onJumpToVariant?.(alert.variantId, alert.productId)}
            accessibilityRole="button"
            accessibilityLabel={alert.productName + ', ' + alert.variantName + ', ' + alert.stockCount + ' units'}
            style={styles.alertRow}
          >
            <SafeImage source={alert.image} style={styles.alertThumb} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.alertName} numberOfLines={1}>{alert.productName}</Text>
              <Text style={styles.alertSku} numberOfLines={1}>{alert.sku}</Text>
            </View>
            <View style={styles.alertRight}>
              <Text style={[styles.alertStock, { color }]}>{alert.stockCount}</Text>
              <Text style={styles.alertThreshold}>min {alert.lowStockThreshold}</Text>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('seller.inventory.alertsTitle')}</Text>
      <Text style={styles.subtitle}>{t('seller.inventory.alertsSubtitle')}</Text>
      {renderSection(t('seller.inventory.alertsOut'), summary.out, true)}
      {renderSection(t('seller.inventory.alertsLow'), summary.low, false)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing[4], gap: spacing[2] },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  subtitle: { fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.sans[0], marginBottom: spacing[1] },
  emptyText: { fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  section: { marginBottom: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1, fontFamily: fontFamily.sansBold[0] },
  countBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.full, minWidth: 20, alignItems: 'center' },
  countText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingVertical: spacing[2.5], paddingHorizontal: spacing[3], borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing[1.5] },
  alertThumb: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.borderLight },
  alertName: { fontSize: 14, fontWeight: '500', color: colors.text, fontFamily: fontFamily.sans[0] },
  alertSku: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  alertRight: { alignItems: 'flex-end', gap: 1 },
  alertStock: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  alertThreshold: { fontSize: 11, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
})
