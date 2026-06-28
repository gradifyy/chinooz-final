import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import type { BulkStockAction, StockEditReason } from '@chinooz/types'

const REASONS: StockEditReason[] = ['restock', 'correction', 'damage', 'loss', 'return', 'other']
const REASON_LABELS: Record<StockEditReason, string> = {
  restock: 'seller.inventory.reasonRestock',
  correction: 'seller.inventory.reasonCorrection',
  damage: 'seller.inventory.reasonDamage',
  loss: 'seller.inventory.reasonLoss',
  return: 'seller.inventory.reasonReturn',
  other: 'seller.inventory.reasonOther',
}

export interface BulkConfirmSheetProps {
  visible: boolean
  action: BulkStockAction
  count: number
  onConfirm: (value: number | undefined, reason: StockEditReason) => void
  onCancel: () => void
}

export default function BulkConfirmSheet({ visible, action, count, onConfirm, onCancel }: BulkConfirmSheetProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [reason, setReason] = useState<StockEditReason>('restock')

  useEffect(() => {
    if (visible) { setValue(''); setReason('restock') }
  }, [visible])

  const isDestructive = action === 'mark_out'
  const needsValue = action === 'set' || action === 'adjust' || action === 'threshold'
  const numValue = Number(value.replace(/[^0-9-]/g, '')) || 0
  const canConfirm = !needsValue || value !== ''

  const titleKey = isDestructive ? 'seller.inventory.bulkConfirmDestructive' : 'seller.inventory.bulkConfirm'
  const actionLabelKey: Record<BulkStockAction, string> = {
    set: 'seller.inventory.bulkSet',
    adjust: 'seller.inventory.bulkAdjust',
    threshold: 'seller.inventory.bulkThreshold',
    mark_out: 'seller.inventory.bulkMarkOut',
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet} accessibilityRole="alert">
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {isDestructive && <AlertTriangle size={20} color={colors.error} />}
                  <Text style={styles.title}>{t(titleKey, { count })}</Text>
                </View>
                <TouchableOpacity onPress={onCancel} accessibilityLabel={t('seller.inventory.cancel')}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                {t(actionLabelKey[action])}
                {isDestructive && (
                  <Text style={styles.destructiveBody}>{'\n' + t('seller.inventory.bulkConfirmDestructiveBody')}</Text>
                )}
              </Text>

              {needsValue && (
                <TextInput
                  value={value}
                  onChangeText={v => setValue(v.replace(/[^0-9-]/g, ''))}
                  onSubmitEditing={() => canConfirm && onConfirm(numValue, reason)}
                  placeholder={t('seller.inventory.bulkValue')}
                  inputMode="numeric"
                  accessibilityLabel={t('seller.inventory.bulkValue')}
                  style={styles.input}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
              )}

              <Text style={styles.label}>{t('seller.inventory.reason')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
                {REASONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setReason(r)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reason === r }}
                    accessibilityLabel={t(REASON_LABELS[r])}
                    style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                  >
                    <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>
                      {t(REASON_LABELS[r])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity onPress={onCancel} style={styles.btnSecondary}>
                  <Text style={styles.btnSecondaryText}>{t('seller.inventory.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => canConfirm && onConfirm(numValue, reason)}
                  disabled={!canConfirm}
                  style={[styles.btnPrimary, !canConfirm && styles.btnDisabled, isDestructive && styles.btnDestructive]}
                >
                  <Text style={styles.btnPrimaryText}>
                    {t('seller.inventory.bulkConfirm', { count })}
                  </Text>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[5],
    paddingBottom: spacing[8],
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0], flexShrink: 1 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing[4], fontFamily: fontFamily.sans[0] },
  destructiveBody: { color: colors.error, fontWeight: '500', marginTop: spacing[2] },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontSize: 15, color: colors.text,
    fontFamily: fontFamily.sans[0], marginBottom: spacing[3], fontVariant: ['tabular-nums'],
  },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: spacing[2], fontFamily: fontFamily.sansSemiBold[0] },
  reasonChip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.full,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  reasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonChipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, fontFamily: fontFamily.sans[0] },
  reasonChipTextActive: { color: colors.white },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
  btnSecondary: {
    flex: 1, height: 44, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  btnPrimary: { flex: 1, height: 44, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnDestructive: { backgroundColor: colors.error },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: fontFamily.sansBold[0] },
  btnDisabled: { opacity: 0.4 },
})
