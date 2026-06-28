import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Check,
  Package,
  Truck,
  Printer,
  X,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import { useBulkUpdateStatus, useBulkFulfillOrders } from '@chinooz/hooks'
import type { SellerSubOrder, SellerOrderStatusKey } from '@chinooz/types'

const CARRIERS = [
  { key: 'pathao', labelKey: 'seller.orders.carrierPathao' },
  { key: 'dhl', labelKey: 'seller.orders.carrierDhl' },
  { key: 'aramex', labelKey: 'seller.orders.carrierAramex' },
  { key: 'fedex', labelKey: 'seller.orders.carrierFedex' },
  { key: 'local', labelKey: 'seller.orders.carrierLocal' },
  { key: 'other', labelKey: 'seller.orders.carrierOther' },
]

type BulkResult = { count: number; action: 'accept' | 'pack' | 'ship' | 'print'; failed: number } | null

function ResultToast({ result, t, onDismiss }: { result: BulkResult; t: (k: string, o?: Record<string, unknown>) => string; onDismiss: () => void }) {
  if (!result) return null
  const msg = result.action === 'ship'
    ? t('seller.orders.bulkResultShipped', { count: result.count })
    : result.action === 'accept'
      ? t('seller.orders.bulkResultAccepted', { count: result.count })
      : result.action === 'pack'
        ? t('seller.orders.bulkResultPacked', { count: result.count })
        : t('seller.orders.bulkResultShipped', { count: result.count })
  return (
    <View style={styles.toastWrap} pointerEvents="none">
      <View style={styles.toast} accessibilityLiveRegion="assertive">
        <Check size={16} color={colors.white} strokeWidth={3} />
        <Text style={styles.toastText}>{msg}</Text>
        {result.failed > 0 && (
          <Text style={styles.toastFailed}>· {t('seller.orders.bulkResultFailed', { count: result.failed })}</Text>
        )}
      </View>
    </View>
  )
}

function BulkTrackingSheet({
  orders,
  visible,
  onClose,
  onConfirm,
  t,
}: {
  orders: SellerSubOrder[]
  visible: boolean
  onClose: () => void
  onConfirm: (shipments: { subOrderId: string; trackingNumber: string; carrier: string }[]) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const [carrier, setCarrier] = useState('')
  const [trackings, setTrackings] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const allValid = carrier && orders.every(o => (trackings[o.subOrderId] || '').trim().length > 0)

  const handleConfirm = () => {
    if (!carrier) { setError(t('seller.orders.shipCourierRequired')); return }
    const missing = orders.some(o => !(trackings[o.subOrderId] || '').trim())
    if (missing) { setError(t('seller.orders.shipTrackingRequired')); return }
    onConfirm(orders.map(o => ({
      subOrderId: o.subOrderId,
      trackingNumber: (trackings[o.subOrderId] || '').trim(),
      carrier,
    })))
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>{t('seller.orders.bulkTrackingTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkTrackingCancel')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3] }}>
          <Text style={styles.sheetSubtitle}>{t('seller.orders.bulkTrackingSubtitle')}</Text>

          <View>
            <Text style={styles.fieldLabel}>{t('seller.orders.bulkTrackingCourier')}</Text>
            <View style={styles.carrierRow}>
              {CARRIERS.map(c => {
                const active = carrier === c.key
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => { setCarrier(c.key); setError('') }}
                    style={[styles.carrierPill, active && styles.carrierPillActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(c.labelKey)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.carrierPillText, active && styles.carrierPillTextActive]}>{t(c.labelKey)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={{ gap: spacing[2] }}>
            {orders.map(o => (
              <View key={o.subOrderId} style={styles.trackingRow}>
                <Text style={styles.trackingOrderId} numberOfLines={1}>{o.orderId}</Text>
                <TextInput
                  value={trackings[o.subOrderId] || ''}
                  onChangeText={v => { setTrackings(p => ({ ...p, [o.subOrderId]: v })); setError('') }}
                  placeholder={t('seller.orders.bulkTrackingEnter')}
                  placeholderTextColor={colors.textTertiary}
                  style={styles.trackingInput}
                  accessibilityLabel={`${t('seller.orders.bulkTrackingOrder')} ${o.orderId} ${t('seller.orders.shipTracking')}`}
                />
              </View>
            ))}
          </View>

          {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}
        </ScrollView>

        <View style={styles.sheetActions}>
          <TouchableOpacity onPress={onClose} style={styles.sheetCancelBtn} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkTrackingCancel')}>
            <Text style={styles.sheetCancelText}>{t('seller.orders.bulkTrackingCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!allValid}
            style={[styles.sheetConfirmBtn, !allValid && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.bulkTrackingConfirm', { count: orders.length })}
          >
            <Text style={styles.sheetConfirmText}>{t('seller.orders.bulkTrackingConfirm', { count: orders.length })}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export function MobileBulkActionBar({
  selectedOrders,
  onClear,
  onRefetch,
  t,
}: {
  selectedOrders: SellerSubOrder[]
  onClear: () => void
  onRefetch?: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const { reducedMotion } = useA11y()
  const [showTracking, setShowTracking] = useState(false)
  const [result, setResult] = useState<BulkResult>(null)
  const [busy, setBusy] = useState(false)

  const bulkUpdate = useBulkUpdateStatus()
  const bulkFulfill = useBulkFulfillOrders()

  const haptic = useCallback((style: 'Light' | 'Medium' = 'Medium') => {
    try { if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]) } catch {}
  }, [reducedMotion])

  const showResultMsg = useCallback((r: BulkResult) => {
    setResult(r)
    haptic('Medium')
    setTimeout(() => setResult(null), 3000)
  }, [haptic])

  const handleAccept = useCallback(async () => {
    setBusy(true)
    try {
      const res = await bulkUpdate.mutateAsync({ subOrderIds: selectedOrders.map(o => o.subOrderId), newStatusKey: 'to_pack' })
      showResultMsg({ count: res.succeeded, action: 'accept', failed: res.failed })
      onClear()
      onRefetch?.()
    } catch {} finally { setBusy(false) }
  }, [selectedOrders, bulkUpdate, showResultMsg, onClear, onRefetch])

  const handlePack = useCallback(async () => {
    setBusy(true)
    try {
      const res = await bulkUpdate.mutateAsync({ subOrderIds: selectedOrders.map(o => o.subOrderId), newStatusKey: 'to_ship' })
      showResultMsg({ count: res.succeeded, action: 'pack', failed: res.failed })
      onClear()
      onRefetch?.()
    } catch {} finally { setBusy(false) }
  }, [selectedOrders, bulkUpdate, showResultMsg, onClear, onRefetch])

  const handleShip = useCallback(async (shipments: { subOrderId: string; trackingNumber: string; carrier: string }[]) => {
    setBusy(true)
    setShowTracking(false)
    try {
      const res = await bulkFulfill.mutateAsync({ shipments })
      showResultMsg({ count: res.succeeded, action: 'ship', failed: res.failed })
      onClear()
      onRefetch?.()
    } catch {} finally { setBusy(false) }
  }, [bulkFulfill, showResultMsg, onClear, onRefetch])

  const handlePrint = useCallback(() => {
    showResultMsg({ count: selectedOrders.length, action: 'print', failed: 0 })
    onClear()
  }, [selectedOrders, showResultMsg, onClear])

  if (selectedOrders.length === 0) return null

  const canAccept = selectedOrders.every(o => o.statusKey === 'new')
  const canPack = selectedOrders.every(o => o.statusKey === 'to_pack')
  const canShip = selectedOrders.every(o => o.statusKey === 'to_ship')
  const canPrint = selectedOrders.every(o => o.statusKey === 'shipped' || o.statusKey === 'completed')

  return (
    <>
      <ResultToast result={result} t={t} onDismiss={() => setResult(null)} />

      <View style={styles.bulkBar} accessibilityRole="toolbar" accessibilityLabel={t('seller.orders.bulkSelected', { count: selectedOrders.length })}>
        <Text style={styles.bulkCount}>
          {t('seller.orders.bulkSelected', { count: selectedOrders.length })}
        </Text>

        <View style={styles.bulkActions}>
          {canAccept && (
            <TouchableOpacity style={styles.bulkBtnPrimary} onPress={handleAccept} disabled={busy} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkAcceptAria')} activeOpacity={0.85}>
              {busy ? <ActivityIndicator size={14} color={colors.white} /> : <Check size={14} color={colors.white} />}
              <Text style={styles.bulkBtnPrimaryText}>{t('seller.orders.bulkAccept')}</Text>
            </TouchableOpacity>
          )}
          {canPack && (
            <TouchableOpacity style={styles.bulkBtnPrimary} onPress={handlePack} disabled={busy} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkPackAria')} activeOpacity={0.85}>
              {busy ? <ActivityIndicator size={14} color={colors.white} /> : <Package size={14} color={colors.white} />}
              <Text style={styles.bulkBtnPrimaryText}>{t('seller.orders.bulkPack')}</Text>
            </TouchableOpacity>
          )}
          {canShip && (
            <TouchableOpacity style={styles.bulkBtnPrimary} onPress={() => setShowTracking(true)} disabled={busy} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkShipAria')} activeOpacity={0.85}>
              <Truck size={14} color={colors.white} />
              <Text style={styles.bulkBtnPrimaryText}>{t('seller.orders.bulkShip')}</Text>
            </TouchableOpacity>
          )}
          {canPrint && (
            <TouchableOpacity style={styles.bulkBtnSecondary} onPress={handlePrint} disabled={busy} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkPrintAria')} activeOpacity={0.85}>
              <Printer size={14} color={colors.text} />
              <Text style={styles.bulkBtnSecondaryText}>{t('seller.orders.bulkPrint')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.orders.bulkClearAria')}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <BulkTrackingSheet
        orders={selectedOrders}
        visible={showTracking}
        onClose={() => setShowTracking(false)}
        onConfirm={handleShip}
        t={t}
      />
    </>
  )
}

export default MobileBulkActionBar

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center', zIndex: 60 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.success,
    borderRadius: radii.full,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: { color: colors.white, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  toastFailed: { color: colors.white, fontSize: 12, opacity: 0.8 },
  bulkBar: {
    position: 'absolute',
    bottom: spacing[4],
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 40,
  },
  bulkCount: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], fontFamily: fontFamily.sansSemiBold[0] },
  bulkActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], flex: 1, flexWrap: 'wrap' },
  bulkBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
    minHeight: 36,
  },
  bulkBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 13, fontFamily: fontFamily.sansSemiBold[0] },
  bulkBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
    minHeight: 36,
  },
  bulkBtnSecondaryText: { color: colors.text, fontWeight: '600', fontSize: 13, fontFamily: fontFamily.sansSemiBold[0] },
  sheetOverlay: { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  sheetCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    maxHeight: '85%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: radii.full, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing[2] },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[2] },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sheetSubtitle: { fontSize: 14, color: colors.textMuted },
  sheetBody: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[1.5] },
  carrierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  carrierPill: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  carrierPillActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  carrierPillText: { fontSize: 14, color: colors.textSecondary },
  carrierPillTextActive: { color: colors.primary, fontWeight: '600' },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  trackingOrderId: { fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, width: 80 },
  trackingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
    color: colors.text,
  },
  errorText: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: spacing[1] },
  sheetActions: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], paddingTop: spacing[3] },
  sheetCancelBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  sheetCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  sheetConfirmBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  sheetConfirmText: { color: colors.white, fontWeight: '700', fontSize: 14 },
})
