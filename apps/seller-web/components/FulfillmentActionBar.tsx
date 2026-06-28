'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Package,
  Truck,
  Printer,
  MessageCircle,
  XCircle,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import {
  useUpdateOrderStatus,
  useFulfillOrder,
  useRejectOrder,
  usePartialShipOrder,
  useUpdateStock,
} from '@chinooz/hooks'
import { duration, easing } from '@chinooz/theme'
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

function SuccessCheck({ message, show, reduced }: { message: string; show: boolean; reduced: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.9 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-success text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg flex items-center gap-2"
          role="status"
          aria-live="assertive"
        >
          <Check size={16} strokeWidth={3} />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ShipSheet({
  order,
  onClose,
  onConfirm,
  partial,
  t,
}: {
  order: SellerSubOrder
  onClose: () => void
  onConfirm: (data: { carrier: string; trackingNumber: string; shipDate?: string; itemIds?: string[] }) => void
  partial: boolean
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ship-sheet-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 320 }}
        className="relative bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-border-light px-5 py-4 flex items-center justify-between">
          <h3 id="ship-sheet-title" className="text-lg font-semibold text-text">
            {partial ? t('seller.orders.shipPartial') : t('seller.orders.shipTitle')}
          </h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background" aria-label={t('seller.orders.shipCancel')}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">
            {partial ? t('seller.orders.shipPartialSubtitle') : t('seller.orders.shipSubtitle')}
          </p>

          {partial && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text">{t('seller.orders.shipPartialSelectItems')}</p>
              {order.items.map(item => (
                <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20"
                    aria-checked={selectedItems.has(item.id)}
                  />
                  <img src={item.image} alt="" className="w-10 h-10 rounded-md object-cover bg-shimmer" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{item.name}</p>
                    <p className="text-xs text-text-muted">{t('seller.orders.qty')}: {item.quantity}</p>
                  </div>
                </label>
              ))}
              {errors.items && <p className="text-xs text-error font-medium" role="alert">{errors.items}</p>}
            </div>
          )}

          <div>
            <label htmlFor="ship-carrier" className="block text-sm font-semibold text-text mb-1.5">
              {t('seller.orders.shipCourier')}
            </label>
            <select
              id="ship-carrier"
              value={carrier}
              onChange={e => { setCarrier(e.target.value); setErrors(p => ({ ...p, carrier: undefined })) }}
              aria-label={t('seller.orders.shipCourier')}
              aria-invalid={!!errors.carrier}
              className={`w-full h-10 rounded-md border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.carrier ? 'border-error' : 'border-border'}`}
            >
              <option value="">{t('seller.orders.shipCourierPlaceholder')}</option>
              {CARRIERS.map(c => (
                <option key={c.key} value={c.key}>{t(c.labelKey)}</option>
              ))}
            </select>
            {errors.carrier && <p className="text-xs text-error font-medium mt-1" role="alert">{errors.carrier}</p>}
          </div>

          <div>
            <label htmlFor="ship-tracking" className="block text-sm font-semibold text-text mb-1.5">
              {t('seller.orders.shipTracking')}
            </label>
            <input
              id="ship-tracking"
              type="text"
              value={tracking}
              onChange={e => { setTracking(e.target.value); setErrors(p => ({ ...p, tracking: undefined })) }}
              placeholder={t('seller.orders.shipTrackingPlaceholder')}
              aria-label={t('seller.orders.shipTracking')}
              aria-invalid={!!errors.tracking}
              className={`w-full h-10 rounded-md border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.tracking ? 'border-error' : 'border-border'}`}
            />
            {errors.tracking && <p className="text-xs text-error font-medium mt-1" role="alert">{errors.tracking}</p>}
          </div>

          <div>
            <label htmlFor="ship-date" className="block text-sm font-semibold text-text mb-1.5">
              {t('seller.orders.shipDate')}
            </label>
            <input
              id="ship-date"
              type="date"
              value={shipDate}
              onChange={e => setShipDate(e.target.value)}
              aria-label={t('seller.orders.shipDate')}
              className="w-full h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border-light px-5 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-md border border-border text-text font-semibold text-sm hover:bg-background"
            aria-label={t('seller.orders.shipCancel')}
          >
            {t('seller.orders.shipCancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 h-10 rounded-md bg-primary text-white font-semibold text-sm hover:bg-primary-dark inline-flex items-center justify-center gap-1.5"
            aria-label={t('seller.orders.shipConfirm')}
          >
            {partial
              ? t('seller.orders.shipPartialSelected', { count: selectedItems.size })
              : t('seller.orders.shipConfirm')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function RejectSheet({
  order,
  onClose,
  onConfirm,
  t,
}: {
  order: SellerSubOrder
  onClose: () => void
  onConfirm: (reason: string, reasonDetail?: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reject-sheet-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 320 }}
        className="relative bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-border-light px-5 py-4 flex items-center justify-between">
          <h3 id="reject-sheet-title" className="text-lg font-semibold text-text">
            {t('seller.orders.rejectTitle')}
          </h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background" aria-label={t('seller.orders.rejectCancel')}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">{t('seller.orders.rejectSubtitle')}</p>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-text">{t('seller.orders.rejectReason')}</p>
            {REJECT_REASONS.map(r => (
              <label key={r.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background cursor-pointer">
                <input
                  type="radio"
                  name="reject-reason"
                  value={r.key}
                  checked={reason === r.key}
                  onChange={() => { setReason(r.key); setError('') }}
                  className="w-5 h-5 text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-text">{t(r.labelKey)}</span>
              </label>
            ))}
            {error && <p className="text-xs text-error font-medium" role="alert">{error}</p>}
          </div>

          <div>
            <label htmlFor="reject-detail" className="block text-sm font-semibold text-text mb-1.5">
              {t('seller.orders.rejectReasonDetail')}
            </label>
            <textarea
              id="reject-detail"
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder={t('seller.orders.rejectReasonDetailPlaceholder')}
              rows={3}
              aria-label={t('seller.orders.rejectReasonDetail')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border-light px-5 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-md border border-border text-text font-semibold text-sm hover:bg-background"
            aria-label={t('seller.orders.rejectCancel')}
          >
            {t('seller.orders.rejectCancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 h-10 rounded-md bg-error text-white font-semibold text-sm hover:bg-error/90 inline-flex items-center justify-center gap-1.5"
            aria-label={t('seller.orders.rejectConfirm')}
          >
            <XCircle size={16} />
            {t('seller.orders.rejectConfirm')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function FulfillmentActionBar({
  order,
  t,
  onContact,
  onNavigateBack,
}: {
  order: SellerSubOrder
  t: (k: string, opts?: Record<string, unknown>) => string
  onContact: () => void
  onNavigateBack: () => void
}) {
  const reduced = useReducedMotion()
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

  const showSuccess = useCallback((state: SuccessState) => {
    setSuccess(state)
    setTimeout(() => setSuccess(null), 2500)
  }, [])

  const handleAccept = useCallback(async () => {
    setBusy(true)
    try {
      await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'to_pack' })
      for (const item of order.items) {
        updateStock.mutate({ productId: item.productId, variantId: item.sku, newCount: 0, mode: 'adjust', reason: 'other' })
      }
      showSuccess('accept')
      setTimeout(() => onNavigateBack(), 1200)
    } catch {
      // error handled by mutation
    } finally {
      setBusy(false)
    }
  }, [order, updateStatus, updateStock, showSuccess, onNavigateBack])

  const handlePack = useCallback(async () => {
    setBusy(true)
    try {
      await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'to_ship' })
      showSuccess('pack')
    } catch {
      // noop
    } finally {
      setBusy(false)
    }
  }, [order, updateStatus, showSuccess])

  const handleShip = useCallback(async (data: { carrier: string; trackingNumber: string; shipDate?: string; itemIds?: string[] }) => {
    setBusy(true)
    setShowShipSheet(false)
    try {
      if (data.itemIds && data.itemIds.length < order.items.length) {
        await partialShip.mutateAsync({
          subOrderId: order.subOrderId,
          itemIds: data.itemIds,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          shipDate: data.shipDate,
        })
        showSuccess('partial_ship')
      } else {
        await fulfillOrder.mutateAsync({
          subOrderId: order.subOrderId,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
        })
        await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'shipped' })
        showSuccess('ship')
      }
      setTimeout(() => onNavigateBack(), 1200)
    } catch {
      // noop
    } finally {
      setBusy(false)
    }
  }, [order, fulfillOrder, partialShip, updateStatus, showSuccess, onNavigateBack])

  const handleReject = useCallback(async (reason: string, reasonDetail?: string) => {
    setBusy(true)
    setShowRejectSheet(false)
    try {
      await rejectOrder.mutateAsync({ subOrderId: order.subOrderId, reason, reasonDetail })
      await updateStatus.mutateAsync({ subOrderId: order.subOrderId, newStatusKey: 'cancelled_returned' })
      showSuccess('reject')
      setTimeout(() => onNavigateBack(), 1200)
    } catch {
      // noop
    } finally {
      setBusy(false)
    }
  }, [order, rejectOrder, updateStatus, showSuccess, onNavigateBack])

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
      <span className="sr-only" role="status" aria-live="polite">
        {success ? successMessages[success] : ''}
      </span>

      <SuccessCheck message={success ? successMessages[success] : ''} show={!!success} reduced={reduced} />

      <div className="sticky bottom-0 z-sticky bg-surface border-t border-border-light shadow-lg px-4 py-3">
        <div className="max-w-[800px] mx-auto flex items-center gap-2 justify-end flex-wrap">
          {fulfill && order.statusKey === 'new' && (
            <>
              <motion.button
                whileHover={reduced ? undefined : { scale: 1.02 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                onClick={handleAccept}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary-dark min-h-[40px] disabled:opacity-50"
                aria-label={t('seller.orders.acceptConfirmAria')}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {t('seller.orders.acceptConfirm')}
              </motion.button>
              <motion.button
                whileHover={reduced ? undefined : { scale: 1.02 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                onClick={() => setShowRejectSheet(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-error/30 bg-error/5 text-error px-4 py-2.5 text-sm font-semibold hover:bg-error/10 min-h-[40px] disabled:opacity-50"
                aria-label={t('seller.orders.rejectAria')}
              >
                <XCircle size={16} />
                {t('seller.orders.reject')}
              </motion.button>
            </>
          )}

          {fulfill && order.statusKey === 'to_pack' && (
            <motion.button
              whileHover={reduced ? undefined : { scale: 1.02 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              onClick={handlePack}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary-dark min-h-[40px] disabled:opacity-50"
              aria-label={t('seller.orders.packConfirmAria')}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
              {t('seller.orders.packConfirm')}
            </motion.button>
          )}

          {fulfill && order.statusKey === 'to_ship' && (
            <>
              <motion.button
                whileHover={reduced ? undefined : { scale: 1.02 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                onClick={() => setShowShipSheet(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary-dark min-h-[40px] disabled:opacity-50"
                aria-label={t('seller.orders.actionShipAria')}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                {t('seller.orders.shipConfirm')}
              </motion.button>
              {canPartialShip && (
                <motion.button
                  whileHover={reduced ? undefined : { scale: 1.02 }}
                  whileTap={reduced ? undefined : { scale: 0.98 }}
                  onClick={() => setShowPartialShipSheet(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface text-text px-4 py-2.5 text-sm font-semibold hover:bg-background min-h-[40px] disabled:opacity-50"
                  aria-label={t('seller.orders.shipPartial')}
                >
                  {t('seller.orders.shipPartial')}
                </motion.button>
              )}
            </>
          )}

          {order.statusKey === 'shipped' && (
            <motion.button
              whileHover={reduced ? undefined : { scale: 1.02 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface text-text px-4 py-2.5 text-sm font-semibold hover:bg-background min-h-[40px]"
              aria-label={t('seller.orders.actionPrintLabelAria')}
            >
              <Printer size={16} />
              {t('seller.orders.actionPrintLabel')}
            </motion.button>
          )}

          <motion.button
            whileHover={reduced ? undefined : { scale: 1.02 }}
            whileTap={reduced ? undefined : { scale: 0.98 }}
            onClick={onContact}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface text-text px-4 py-2.5 text-sm font-semibold hover:bg-background min-h-[40px]"
            aria-label={t('seller.orders.actionContactBuyerAria')}
          >
            <MessageCircle size={16} />
            {t('seller.orders.actionContactBuyer')}
          </motion.button>

          {canCancel && order.statusKey !== 'new' && (
            <motion.button
              whileHover={reduced ? undefined : { scale: 1.02 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              onClick={() => setShowRejectSheet(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-error/30 bg-error/5 text-error px-4 py-2.5 text-sm font-semibold hover:bg-error/10 min-h-[40px] disabled:opacity-50"
              aria-label={t('seller.orders.actionCancelAria')}
            >
              <XCircle size={16} />
              {t('seller.orders.actionCancel')}
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showShipSheet && (
          <ShipSheet order={order} onClose={() => setShowShipSheet(false)} onConfirm={handleShip} partial={false} t={t} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPartialShipSheet && (
          <ShipSheet order={order} onClose={() => setShowPartialShipSheet(false)} onConfirm={handleShip} partial={true} t={t} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRejectSheet && (
          <RejectSheet order={order} onClose={() => setShowRejectSheet(false)} onConfirm={handleReject} t={t} />
        )}
      </AnimatePresence>
    </>
  )
}

export default FulfillmentActionBar
