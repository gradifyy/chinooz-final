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
  Image,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import {
  Check,
  Package,
  Truck,
  Printer,
  MessageCircle,
  XCircle,
  X,
} from 'lucide-react-native'
import { colors, spacing, radii, fontFamily } from '@chinooz/theme'
import { useA11y } from './A11yProvider'
import {
  useUpdateOrderStatus,
  useFulfillOrder,
  useRejectOrder,
  usePartialShipOrder,
  useUpdateStock,
} from '@chinooz/hooks'
import type { SellerSubOrder, SellerOrderStatusKey } from '@chinooz/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any

const CARRIERS = [
  { key: 'pathao', labelKey: 'seller.orders.carrierPathao' },
  { key: 'dhl', labelKey: 'seller.orders.carrierDhl' },
  { key: 'aramex', labelKey: 'seller.orders.carrierAramex' },
  { key: 'fedex', labelKey: 'seller.orders.carrierFedex' },
  { key: 'local', labelKey: 'seller.orders.carrierLocal' },
  { key: 'other', labelKey: 'seller.orders.carrierOther' },
]

const REJECT_REASONS = [
  { key: 'out_of_stock', labelKey: 'seller.orders.reasonOutOfStock' },
  { key: 'shipping_issue', labelKey: 'seller.orders.reasonShippingIssue' },
  { key: 'price_error', labelKey: 'seller.orders.reasonPriceError' },
  { key: 'other', labelKey: 'seller.orders.reasonOther' },
]

const FULFILL_ACTIONS: Record<SellerOrderStatusKey, { labelKey: string; ariaKey: string; Icon: IconType; primary: boolean } | null> = {
  new: { labelKey: 'seller.orders.actionAccept', ariaKey: 'seller.orders.actionAcceptAria', Icon: Check, primary: true },
  to_pack: { labelKey: 'seller.orders.actionPack', ariaKey: 'seller.orders.actionPackAria', Icon: Package, primary: true },
  to_ship: { labelKey: 'seller.orders.actionShip', ariaKey: 'seller.orders.actionShipAria', Icon: Truck, primary: true },
  shipped: { labelKey: 'seller.orders.actionPrintLabel', ariaKey: 'seller.orders.actionPrintLabelAria', Icon: Printer, primary: false },
  completed: null,
  cancelled_returned: null,
  action_needed: null,
}

type SuccessState = 'accept' | 'reject' | 'pack' | 'ship' | 'partial_ship' | null

function SuccessToast({ message, show }: { message: string; show: boolean }) {
  if (!show) return null
  return (
    <View style={styles.toastWrap} pointerEvents="none">
      <View style={styles.toast} accessibilityLiveRegion="assertive">
        <Check size={16} color={colors.white} strokeWidth={3} />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  )
}

function ShipSheet({
  order,
  visible,
  onClose,
  onConfirm,
  partial,
  t,
}: {
  order: SellerSubOrder
  visible: boolean
  onClose: () => void
  onConfirm: (data: { carrier: string; trackingNumber: string; shipDate?: string; itemIds?: string[] }) => void
  partial: boolean
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [shipDate, setShipDate] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(order.items.map(i => i.id)))
  const [errors, setErrors] = useState<{ carrier?: string; tracking?: string; items?: string }>({})

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const validate = () => {
    const e: typeof errors = {}
    if (!carrier) e.carrier = t('seller.orders.shipCourierRequired')
    if (!tracking.trim()) e.tracking = t('seller.orders.shipTrackingRequired')
    if (partial && selectedItems.size === 0) e.items = t('seller.orders.shipPartialNoneSelected')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleConfirm = () => {
    if (!validate()) return
    onConfirm({
      carrier,
      trackingNumber: tracking.trim(),
      shipDate: shipDate || undefined,
      itemIds: partial ? [...selectedItems] : undefined,
    })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            {partial ? t('seller.orders.shipPartial') : t('seller.orders.shipTitle')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.orders.shipCancel')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3] }}>
          <Text style={styles.sheetSubtitle}>
            {partial ? t('seller.orders.shipPartialSubtitle') : t('seller.orders.shipSubtitle')}
          </Text>

          {partial && (
            <View style={{ gap: spacing[2] }}>
              <Text style={styles.sheetSectionLabel}>{t('seller.orders.shipPartialSelectItems')}</Text>
              {order.items.map(item => {
                const checked = selectedItems.has(item.id)
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    style={styles.itemSelectRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={item.name}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Check size={14} color={colors.white} strokeWidth={3} />}
                    </View>
                    <Image source={{ uri: item.image }} style={styles.itemSelectThumb} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.itemSelectName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemSelectMeta}>{t('seller.orders.qty')}: {item.quantity}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
              {errors.items && <Text style={styles.errorText} accessibilityRole="alert">{errors.items}</Text>}
            </View>
          )}

          <View>
            <Text style={styles.fieldLabel}>{t('seller.orders.shipCourier')}</Text>
            <View style={styles.carrierRow}>
              {CARRIERS.map(c => {
                const active = carrier === c.key
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => { setCarrier(c.key); setErrors(p => ({ ...p, carrier: undefined })) }}
                    style={[styles.carrierPill, active && styles.carrierPillActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(c.labelKey)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.carrierPillText, active && styles.carrierPillTextActive]}>
                      {t(c.labelKey)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {errors.carrier && <Text style={styles.errorText} accessibilityRole="alert">{errors.carrier}</Text>}
          </View>

          <View>
            <Text style={styles.fieldLabel}>{t('seller.orders.shipTracking')}</Text>
            <TextInput
              value={tracking}
              onChangeText={v => { setTracking(v); setErrors(p => ({ ...p, tracking: undefined })) }}
              placeholder={t('seller.orders.shipTrackingPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              style={[styles.textInput, errors.tracking && styles.textInputError]}
              accessibilityLabel={t('seller.orders.shipTracking')}
              accessibilityHint={errors.tracking}
            />
            {errors.tracking && <Text style={styles.errorText} accessibilityRole="alert">{errors.tracking}</Text>}
          </View>

          <View>
            <Text style={styles.fieldLabel}>{t('seller.orders.shipDate')}</Text>
            <TextInput
              value={shipDate}
              onChangeText={setShipDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={styles.textInput}
              accessibilityLabel={t('seller.orders.shipDate')}
            />
          </View>
        </ScrollView>

        <View style={styles.sheetActions}>
          <TouchableOpacity onPress={onClose} style={styles.sheetCancelBtn} accessibilityRole="button" accessibilityLabel={t('seller.orders.shipCancel')}>
            <Text style={styles.sheetCancelText}>{t('seller.orders.shipCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} style={styles.sheetConfirmBtn} accessibilityRole="button" accessibilityLabel={t('seller.orders.shipConfirm')}>
            <Text style={styles.sheetConfirmText}>
              {partial ? t('seller.orders.shipPartialSelected', { count: selectedItems.size }) : t('seller.orders.shipConfirm')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function RejectSheet({
  visible,
  onClose,
  onConfirm,
  t,
}: {
  visible: boolean
  onClose: () => void
  onConfirm: (reason: string, reasonDetail?: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!reason) {
      setError(t('seller.orders.rejectReasonRequired'))
      return
    }
    onConfirm(reason, detail.trim() || undefined)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>{t('seller.orders.rejectTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('seller.orders.rejectCancel')}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3] }}>
          <Text style={styles.sheetSubtitle}>{t('seller.orders.rejectSubtitle')}</Text>

          <View style={{ gap: spacing[2] }}>
            {REJECT_REASONS.map(r => {
              const active = reason === r.key
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => { setReason(r.key); setError('') }}
                  style={[styles.reasonRow, active && styles.reasonRowActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(r.labelKey)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.reasonText}>{t(r.labelKey)}</Text>
                </TouchableOpacity>
              )
            })}
            {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}
          </View>

          <View>
            <Text style={styles.fieldLabel}>{t('seller.orders.rejectReasonDetail')}</Text>
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder={t('seller.orders.rejectReasonDetailPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              style={styles.textArea}
              multiline
              accessibilityLabel={t('seller.orders.rejectReasonDetail')}
            />
          </View>
        </ScrollView>

        <View style={styles.sheetActions}>
          <TouchableOpacity onPress={onClose} style={styles.sheetCancelBtn} accessibilityRole="button" accessibilityLabel={t('seller.orders.rejectCancel')}>
            <Text style={styles.sheetCancelText}>{t('seller.orders.rejectCancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} style={styles.sheetDestructiveBtn} accessibilityRole="button" accessibilityLabel={t('seller.orders.rejectConfirm')}>
            <Text style={styles.sheetDestructiveText}>{t('seller.orders.rejectConfirm')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export function MobileFulfillmentBar({
  order,
  t,
  onContact,
  onNavigateBack,
  insets,
}: {
  order: SellerSubOrder
  t: (k: string, opts?: Record<string, unknown>) => string
  onContact: () => void
  onNavigateBack: () => void
  insets: { bottom: number }
}) {
  const { reducedMotion } = useA11y()
  const [showShipSheet, setShowShipSheet] = useState(false)
  const [showPartialShipSheet, setShowPartialShipSheet] = useState(false)
  const [showRejectSheet, setShowRejectSheet] = useState(false)
  const [success, setSuccess] = useState<SuccessState>(null)
  const [busy, setBusy] = useState(false)

  const updateStatus = useUpdateOrderStatus()
  const fulfillOrder = useFulfillOrder()
  const rejectOrder = useRejectOrder()
  const partialShip = usePartialShipOrder()
  const updateStock = useUpdateStock()

  const haptic = useCallback((style: 'Light' | 'Medium' | 'Heavy' = 'Medium') => {
    try {
      if (!reducedMotion) Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style])
    } catch {}
  }, [reducedMotion])

  const showSuccessMsg = useCallback((state: SuccessState) => {
    setSuccess(state)
    haptic('Medium')
    setTimeout(() => setSuccess(null), 2500)
  }, [haptic])

  const handleAccept = useCallback(async () => {
    setBusy(true)
    try {
      await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'to_pack' })
      for (const item of order.items) {
        updateStock.mutate({ productId: item.productId, variantId: item.sku, newCount: 0, mode: 'adjust', reason: 'other' })
      }
      showSuccessMsg('accept')
      setTimeout(() => onNavigateBack(), 1200)
    } catch {} finally { setBusy(false) }
  }, [order, updateStatus, updateStock, showSuccessMsg, onNavigateBack])

  const handlePack = useCallback(async () => {
    setBusy(true)
    try {
      await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'to_ship' })
      showSuccessMsg('pack')
    } catch {} finally { setBusy(false) }
  }, [order, updateStatus, showSuccessMsg])

  const handleShip = useCallback(async (data: { carrier: string; trackingNumber: string; shipDate?: string; itemIds?: string[] }) => {
    setBusy(true)
    setShowShipSheet(false)
    setShowPartialShipSheet(false)
    try {
      if (data.itemIds && data.itemIds.length < order.items.length) {
        await partialShip.mutateAsync({
          subOrderId: order.subOrderId,
          itemIds: data.itemIds,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          shipDate: data.shipDate,
        })
        showSuccessMsg('partial_ship')
      } else {
        await fulfillOrder.mutateAsync({
          subOrderId: order.subOrderId,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
        })
        await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'shipped' })
        showSuccessMsg('ship')
      }
      setTimeout(() => onNavigateBack(), 1200)
    } catch {} finally { setBusy(false) }
  }, [order, fulfillOrder, partialShip, updateStatus, showSuccessMsg, onNavigateBack])

  const handleReject = useCallback(async (reason: string, reasonDetail?: string) => {
    setBusy(true)
    setShowRejectSheet(false)
    try {
      await rejectOrder.mutateAsync({ subOrderId: order.subOrderId, reason, reasonDetail })
      await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'cancelled_returned' })
      showSuccessMsg('reject')
      setTimeout(() => onNavigateBack(), 1200)
    } catch {} finally { setBusy(false) }
  }, [order, rejectOrder, updateStatus, showSuccessMsg, onNavigateBack])

  const fulfill = FULFILL_ACTIONS[order.statusKey]
  const canCancel = order.statusKey === 'new' || order.statusKey === 'to_pack'
  const canPartialShip = order.statusKey === 'to_ship' && order.items.length > 1

  const successMessages: Record<NonNullable<SuccessState>, string> = {
    accept: t('seller.orders.successAccept'),
    reject: t('seller.orders.successReject'),
    pack: t('seller.orders.successPack'),
    ship: t('seller.orders.successShip'),
    partial_ship: t('seller.orders.successPartialShip'),
  }

  return (
    <>
      <Text style={styles.srOnly} accessibilityLiveRegion="polite">
        {success ? successMessages[success] : ''}
      </Text>

      <SuccessToast message={success ? successMessages[success] : ''} show={!!success} />

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing[2] }]}>
        {fulfill && order.statusKey === 'new' && (
          <>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={handleAccept}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('seller.orders.acceptConfirmAria')}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator size={16} color={colors.white} /> : <Check size={16} color={colors.white} />}
              <Text style={styles.actionBtnPrimaryText}>{t('seller.orders.acceptConfirm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnDestructive}
              onPress={() => setShowRejectSheet(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('seller.orders.rejectAria')}
              activeOpacity={0.85}
            >
              <XCircle size={16} color={colors.error} />
              <Text style={styles.actionBtnDestructiveText}>{t('seller.orders.reject')}</Text>
            </TouchableOpacity>
          </>
        )}

        {fulfill && order.statusKey === 'to_pack' && (
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={handlePack}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.packConfirmAria')}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator size={16} color={colors.white} /> : <Package size={16} color={colors.white} />}
            <Text style={styles.actionBtnPrimaryText}>{t('seller.orders.packConfirm')}</Text>
          </TouchableOpacity>
        )}

        {fulfill && order.statusKey === 'to_ship' && (
          <>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => setShowShipSheet(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('seller.orders.actionShipAria')}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator size={16} color={colors.white} /> : <Truck size={16} color={colors.white} />}
              <Text style={styles.actionBtnPrimaryText}>{t('seller.orders.shipConfirm')}</Text>
            </TouchableOpacity>
            {canPartialShip && (
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => setShowPartialShipSheet(true)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('seller.orders.shipPartial')}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnSecondaryText}>{t('seller.orders.shipPartial')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {order.statusKey === 'shipped' && (
          <TouchableOpacity style={styles.actionBtnSecondary} accessibilityRole="button" accessibilityLabel={t('seller.orders.actionPrintLabelAria')} activeOpacity={0.85}>
            <Printer size={16} color={colors.text} />
            <Text style={styles.actionBtnSecondaryText}>{t('seller.orders.actionPrintLabel')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={onContact}
          accessibilityRole="button"
          accessibilityLabel={t('seller.orders.actionContactBuyerAria')}
          activeOpacity={0.85}
        >
          <MessageCircle size={16} color={colors.text} />
          <Text style={styles.actionBtnSecondaryText}>{t('seller.orders.actionContactBuyer')}</Text>
        </TouchableOpacity>

        {canCancel && order.statusKey !== 'new' && (
          <TouchableOpacity
            style={styles.actionBtnDestructive}
            onPress={() => setShowRejectSheet(true)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('seller.orders.actionCancelAria')}
            activeOpacity={0.85}
          >
            <XCircle size={16} color={colors.error} />
            <Text style={styles.actionBtnDestructiveText}>{t('seller.orders.actionCancel')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ShipSheet order={order} visible={showShipSheet} onClose={() => setShowShipSheet(false)} onConfirm={handleShip} partial={false} t={t} />
      <ShipSheet order={order} visible={showPartialShipSheet} onClose={() => setShowPartialShipSheet(false)} onConfirm={handleShip} partial={true} t={t} />
      <RejectSheet visible={showRejectSheet} onClose={() => setShowRejectSheet(false)} onConfirm={handleReject} t={t} />
    </>
  )
}

export default MobileFulfillmentBar

const styles = StyleSheet.create({
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  toastWrap: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 44,
    backgroundColor: colors.primary,
    flex: 1,
    justifyContent: 'center',
  },
  actionBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnSecondaryText: { color: colors.text, fontWeight: '600', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
  actionBtnDestructive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderRadius: radii.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '0D',
  },
  actionBtnDestructiveText: { color: colors.error, fontWeight: '600', fontSize: 14, fontFamily: fontFamily.sansSemiBold[0] },
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
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[2],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: fontFamily.sansSemiBold[0] },
  sheetSubtitle: { fontSize: 14, color: colors.textMuted },
  sheetBody: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
  sheetSectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing[1.5] },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 16,
    color: colors.text,
  },
  textInputError: { borderColor: colors.error },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: spacing[1] },
  carrierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  carrierPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  carrierPillActive: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  carrierPillText: { fontSize: 14, color: colors.textSecondary },
  carrierPillTextActive: { color: colors.primary, fontWeight: '600' },
  itemSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemSelectThumb: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.shimmer },
  itemSelectName: { fontSize: 14, color: colors.text },
  itemSelectMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  reasonRowActive: { backgroundColor: colors.primary50 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.primary },
  reasonText: { fontSize: 15, color: colors.text },
  sheetActions: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], paddingTop: spacing[3] },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sheetCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  sheetConfirmBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  sheetConfirmText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  sheetDestructiveBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: colors.error, alignItems: 'center' },
  sheetDestructiveText: { color: colors.white, fontWeight: '700', fontSize: 14 },
})
