import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertCircle, X, RotateCw, CheckCircle } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'

export interface FailedRow {
  sku: string
  productName: string
  error?: string
}

export interface BulkResultSheetProps {
  visible: boolean
  failedRows: FailedRow[]
  total: number
  updated: number
  onRetryFailed: () => void
  onDismiss: () => void
}

export default function BulkResultSheet({
  visible, failedRows, total, updated, onRetryFailed, onDismiss,
}: BulkResultSheetProps) {
  const { t } = useTranslation()
  const failed = failedRows.length

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet} accessibilityRole="alert">
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <AlertCircle size={20} color={colors.warning} />
                  <Text style={styles.title}>{t('seller.inventory.bulkPartialTitle')}</Text>
                </View>
                <TouchableOpacity onPress={onDismiss} accessibilityLabel={t('seller.inventory.bulkPartialDismiss')}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={styles.summaryTextSuccess}>{updated} OK</Text>
                </View>
                <View style={styles.summaryItem}>
                  <AlertCircle size={14} color={colors.error} />
                  <Text style={styles.summaryTextError}>{failed} failed</Text>
                </View>
              </View>

              <Text style={styles.subtitle}>
                {t('seller.inventory.bulkPartialSub', { failed, total })}
              </Text>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <View accessibilityRole="list" style={{ gap: spacing[1.5] }}>
                  {failedRows.map((row) => (
                    <View key={row.sku} style={styles.failedRow}>
                      <AlertCircle size={14} color={colors.error} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.failedName} numberOfLines={1}>{row.productName}</Text>
                        <Text style={styles.failedSku} numberOfLines={1}>{row.sku}</Text>
                      </View>
                      {row.error ? <Text style={styles.failedError}>{row.error}</Text> : null}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity onPress={onDismiss} style={styles.btnSecondary}>
                  <Text style={styles.btnSecondaryText}>{t('seller.inventory.bulkPartialDismiss')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onRetryFailed} style={styles.btnPrimary}>
                  <RotateCw size={15} color={colors.white} />
                  <Text style={styles.btnPrimaryText}>{t('seller.inventory.bulkPartialRetry')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'],
    padding: spacing[5], paddingBottom: spacing[8], maxHeight: '85%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  summaryRow: { flexDirection: 'row', gap: spacing[4], marginBottom: spacing[2] },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  summaryTextSuccess: { fontSize: 14, fontWeight: '600', color: colors.success, fontFamily: fontFamily.sansSemiBold[0] },
  summaryTextError: { fontSize: 14, fontWeight: '600', color: colors.error, fontFamily: fontFamily.sansSemiBold[0] },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing[3], fontFamily: fontFamily.sans[0] },
  failedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2.5],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2.5],
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.error + '20',
    backgroundColor: colors.errorLight + '50',
  },
  failedName: { fontSize: 14, fontWeight: '500', color: colors.text, fontFamily: fontFamily.sans[0] },
  failedSku: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  failedError: { fontSize: 11, color: colors.error, fontFamily: fontFamily.sans[0] },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  btnSecondary: { flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  btnPrimary: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing[1.5] },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
})
