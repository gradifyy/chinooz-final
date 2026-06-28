import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, History, TrendingUp, TrendingDown, Bell, BellOff } from 'lucide-react-native'
import { colors, radii, spacing, fontFamily } from '@chinooz/theme'
import SafeImage from './SafeImage'
import type { StockHistoryEntry, StockEditReason, SellerInventoryVariant } from '@chinooz/types'

const REASON_LABELS: Record<StockEditReason, string> = {
  restock: 'seller.inventory.reasonRestock',
  correction: 'seller.inventory.reasonCorrection',
  damage: 'seller.inventory.reasonDamage',
  loss: 'seller.inventory.reasonLoss',
  return: 'seller.inventory.reasonReturn',
  other: 'seller.inventory.reasonOther',
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export interface StockHistorySheetProps {
  visible: boolean
  variant: SellerInventoryVariant | null
  history: StockHistoryEntry[]
  restockReminder?: boolean
  onToggleReminder?: (enabled: boolean) => void
  onClose: () => void
  isPending?: boolean
}

export default function StockHistorySheet({
  visible, variant, history, restockReminder, onToggleReminder, onClose, isPending,
}: StockHistorySheetProps) {
  const { t } = useTranslation()

  return (
    <Modal visible={visible && !!variant} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet} accessibilityRole="alert">
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <History size={20} color={colors.textMuted} />
                  <Text style={styles.title}>{t('seller.inventory.historyTitle')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} accessibilityLabel={t('seller.inventory.cancel')}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {variant && (
                <View style={styles.variantInfo}>
                  <SafeImage source={variant.image} style={styles.variantThumb} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.variantName} numberOfLines={1}>{variant.productName ?? variant.name}</Text>
                    <Text style={styles.variantSku} numberOfLines={1}>{variant.sku}</Text>
                  </View>
                  <Text style={styles.variantStock}>{variant.stockCount}</Text>
                </View>
              )}

              {onToggleReminder && (
                <TouchableOpacity
                  onPress={() => onToggleReminder(!restockReminder)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: restockReminder ?? false }}
                  accessibilityLabel={t('seller.inventory.restockReminder')}
                  disabled={isPending}
                  style={styles.reminderRow}
                >
                  {restockReminder ? <Bell size={16} color={colors.primary} /> : <BellOff size={16} color={colors.textMuted} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderTitle}>{t('seller.inventory.restockReminder')}</Text>
                    <Text style={styles.reminderDesc}>{t('seller.inventory.restockReminderDesc')}</Text>
                  </View>
                  <View style={[styles.toggle, restockReminder && styles.toggleActive]}>
                    <View style={[styles.toggleKnob, restockReminder && styles.toggleKnobActive]} />
                  </View>
                </TouchableOpacity>
              )}

              {history.length === 0 ? (
                <Text style={styles.emptyText}>{t('seller.inventory.historyEmpty')}</Text>
              ) : (
                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.timeline}>
                    <View style={styles.timelineLine} />
                    {history.map((entry) => {
                      const isPositive = entry.delta > 0
                      const isNegative = entry.delta < 0
                      return (
                        <View
                          key={entry.id}
                          style={styles.timelineItem}
                          accessibilityLabel={(entry.delta > 0 ? '+' : '') + entry.delta + ' units, ' + t(REASON_LABELS[entry.reason]) + ', ' + formatTimestamp(entry.createdAt)}
                        >
                          <View style={[styles.node, isPositive && styles.nodePositive, isNegative && styles.nodeNegative]}>
                            {isPositive ? <TrendingUp size={12} color={colors.success} /> : <TrendingDown size={12} color={colors.error} />}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={styles.timelineMeta}>
                              <View style={[styles.deltaChip, isPositive && styles.deltaChipPositive, isNegative && styles.deltaChipNegative]}>
                                <Text style={[styles.deltaText, isPositive && styles.deltaTextPositive, isNegative && styles.deltaTextNegative]}>
                                  {entry.delta > 0 ? '+' : ''}{entry.delta}
                                </Text>
                              </View>
                              <Text style={styles.reasonText}>{t(REASON_LABELS[entry.reason])}</Text>
                            </View>
                            <Text style={styles.timestampText}>
                              {formatTimestamp(entry.createdAt)} · {t('seller.inventory.historyBy', { who: t('seller.inventory.who') })}
                            </Text>
                            {entry.note ? <Text style={styles.noteText}>"{entry.note}"</Text> : null}
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </ScrollView>
              )}
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: fontFamily.sansBold[0] },
  variantInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingBottom: spacing[3], marginBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  variantThumb: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.borderLight },
  variantName: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  variantSku: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  variantStock: { fontSize: 16, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansBold[0] },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], marginBottom: spacing[4] },
  reminderTitle: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  reminderDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  toggle: { width: 44, height: 24, borderRadius: radii.full, backgroundColor: colors.border, justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: radii.full, backgroundColor: colors.white, marginHorizontal: 2 },
  toggleKnobActive: { alignSelf: 'flex-end', marginRight: 2 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[8], fontFamily: fontFamily.sans[0] },
  timeline: { position: 'relative', paddingTop: spacing[2] },
  timelineLine: { position: 'absolute', left: 11, top: spacing[3], bottom: spacing[3], width: 1, backgroundColor: colors.borderLight },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] },
  node: { width: 24, height: 24, borderRadius: radii.full, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  nodePositive: { backgroundColor: colors.successLight },
  nodeNegative: { backgroundColor: colors.errorLight },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  deltaChip: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.background },
  deltaChipPositive: { backgroundColor: colors.successLight },
  deltaChipNegative: { backgroundColor: colors.errorLight },
  deltaText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  deltaTextPositive: { color: colors.success },
  deltaTextNegative: { color: colors.error },
  reasonText: { fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.sans[0] },
  timestampText: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontFamily: fontFamily.sans[0] },
  noteText: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic', fontFamily: fontFamily.sans[0] },
})
