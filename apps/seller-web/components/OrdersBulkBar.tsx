'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Package,
  Truck,
  Printer,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { useBulkUpdateStatus, useBulkFulfillOrders } from '@chinooz/hooks'
import { duration, easing } from '@chinooz/theme'
import PrintDocsSheet from '@/components/PrintDocsSheet'
import type { SellerSubOrder, SellerOrderStatusKey } from '@chinooz/types'

const CARRIERS = [
  { key: 'pathao', labelKey: 'seller.orders.carrierPathao' },
  { key: 'dhl', labelKey: 'seller.orders.carrierDhl' },
  { key: 'aramex', labelKey: 'seller.orders.carrierAramex' },
  { key: 'fedex', labelKey: 'seller.orders.carrierFedex' },
  { key: 'local', labelKey: 'seller.orders.carrierLocal' },
  { key: 'other', labelKey: 'seller.orders.carrierOther' },
]

type BulkResult = {
  count: number
  action: 'accept' | 'pack' | 'ship' | 'print'
  failed: number
  failedOrders?: { subOrderId: string; orderId: string }[]
  action_key?: 'accept' | 'pack' | 'ship'
} | null

function ResultSnackbar({ result, t, onDismiss, onRetryFailed }: { result: BulkResult; t: (k: string, o?: Record<string, unknown>) => string; onDismiss: () => void; onRetryFailed?: () => void }) {
  const reduced = useReducedMotion()
  if (!result) return null
  const isPartialFail = result.failed > 0 && result.failedOrders && result.failedOrders.length > 0
  const msg = result.action === 'ship'
    ? t('seller.orders.bulkResultShipped', { count: result.count })
    : result.action === 'accept'
      ? t('seller.orders.bulkResultAccepted', { count: result.count })
      : result.action === 'pack'
        ? t('seller.orders.bulkResultPacked', { count: result.count })
        : t('seller.orders.printDocsBulkResult', { count: result.count })
  return (
    <AnimatePresence>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: 20 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg flex items-center gap-2.5 ${
          isPartialFail ? 'bg-warning text-white' : 'bg-success text-white'
        }`}
        role="status"
        aria-live="assertive"
      >
        {isPartialFail ? <AlertCircle size={16} /> : <Check size={16} strokeWidth={3} />}
        {isPartialFail ? t('seller.orders.bulkPartialFailSubtitle', { failed: result.failed, total: result.count + result.failed }) : msg}
        {isPartialFail && onRetryFailed && (
          <button
            onClick={onRetryFailed}
            className="ml-1 hover:bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold"
            aria-label={t('seller.orders.bulkRetryFailedAria', { count: result.failed })}
          >
            {t('seller.orders.bulkRetryFailed', { count: result.failed })}
          </button>
        )}
        <button onClick={onDismiss} className="ml-1 hover:bg-white/20 rounded-full p-0.5" aria-label={t('seller.orders.bulkDismissFailures')}>
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

function BulkTrackingSheet({
  orders,
  onClose,
  onConfirm,
  t,
}: {
  orders: SellerSubOrder[]
  onClose: () => void
  onConfirm: (shipments: { subOrderId: string; trackingNumber: string; carrier: string }[]) => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bulk-tracking-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 320 }}
        className="relative bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-border-light px-5 py-4 flex items-center justify-between">
          <h3 id="bulk-tracking-title" className="text-lg font-semibold text-text">{t('seller.orders.bulkTrackingTitle')}</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background" aria-label={t('seller.orders.bulkTrackingCancel')}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">{t('seller.orders.bulkTrackingSubtitle')}</p>

          <div>
            <label htmlFor="bulk-carrier" className="block text-sm font-semibold text-text mb-1.5">{t('seller.orders.bulkTrackingCourier')}</label>
            <select
              id="bulk-carrier"
              value={carrier}
              onChange={e => { setCarrier(e.target.value); setError('') }}
              aria-label={t('seller.orders.bulkTrackingCourier')}
              className={`w-full h-10 rounded-md border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${!carrier && error ? 'border-error' : 'border-border'}`}
            >
              <option value="">{t('seller.orders.shipCourierPlaceholder')}</option>
              {CARRIERS.map(c => <option key={c.key} value={c.key}>{t(c.labelKey)}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.subOrderId} className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-muted w-24 truncate">{o.orderId}</span>
                <input
                  type="text"
                  value={trackings[o.subOrderId] || ''}
                  onChange={e => { setTrackings(p => ({ ...p, [o.subOrderId]: e.target.value })); setError('') }}
                  placeholder={t('seller.orders.bulkTrackingEnter')}
                  aria-label={`${t('seller.orders.bulkTrackingOrder')} ${o.orderId} ${t('seller.orders.shipTracking')}`}
                  className="flex-1 h-9 rounded-md border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-error font-medium" role="alert">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border-light px-5 py-3 flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border border-border text-text font-semibold text-sm hover:bg-background" aria-label={t('seller.orders.bulkTrackingCancel')}>
            {t('seller.orders.bulkTrackingCancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allValid}
            className="flex-1 h-10 rounded-md bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-50"
            aria-label={t('seller.orders.bulkTrackingConfirm', { count: orders.length })}
          >
            {t('seller.orders.bulkTrackingConfirm', { count: orders.length })}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function OrdersBulkBar({
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
  const reduced = useReducedMotion()
  const [showTracking, setShowTracking] = useState(false)
  const [showPrintSheet, setShowPrintSheet] = useState(false)
  const [result, setResult] = useState<BulkResult>(null)
  const [busy, setBusy] = useState(false)

  const bulkUpdate = useBulkUpdateStatus()
  const bulkFulfill = useBulkFulfillOrders()

  const showResult = useCallback((r: NonNullable<BulkResult>) => {
    setResult(r)
    if (r.failed > 0) {
      // Keep partial-failure visible longer until user dismisses/retries
    } else {
      setTimeout(() => setResult(null), 3000)
    }
  }, [])

  const buildFailedOrders = (
    results: { subOrderId: string; success: boolean }[],
    orders: SellerSubOrder[],
  ): { subOrderId: string; orderId: string }[] => {
    return results
      .filter(r => !r.success)
      .map(r => {
        const o = orders.find(o => o.subOrderId === r.subOrderId)
        return { subOrderId: r.subOrderId, orderId: o?.orderId ?? r.subOrderId }
      })
  }

  const handleAccept = useCallback(async () => {
    setBusy(true)
    try {
      const res = await bulkUpdate.mutateAsync({
        subOrderIds: selectedOrders.map(o => o.subOrderId),
        newStatusKey: 'to_pack',
      })
      const failedOrders = buildFailedOrders(res.results, selectedOrders)
      showResult({ count: res.succeeded, action: 'accept', failed: res.failed, failedOrders, action_key: 'accept' })
      if (res.failed === 0) { onClear() }
      onRefetch?.()
    } catch {} finally { setBusy(false) }
  }, [selectedOrders, bulkUpdate, showResult, onClear, onRefetch])

  const handlePack = useCallback(async () => {
    setBusy(true)
    try {
      const res = await bulkUpdate.mutateAsync({
        subOrderIds: selectedOrders.map(o => o.subOrderId),
        newStatusKey: 'to_ship',
      })
      const failedOrders = buildFailedOrders(res.results, selectedOrders)
      showResult({ count: res.succeeded, action: 'pack', failed: res.failed, failedOrders, action_key: 'pack' })
      if (res.failed === 0) { onClear() }
      onRefetch?.()
    } catch {} finally { setBusy(false) }
  }, [selectedOrders, bulkUpdate, showResult, onClear, onRefetch])

  const handleShip = useCallback(async (shipments: { subOrderId: string; trackingNumber: string; carrier: string }[]) => {
    setBusy(true)
    setShowTracking(false)
    try {
      const res = await bulkFulfill.mutateAsync({ shipments })
      const failedOrders = buildFailedOrders(res.results, selectedOrders)
      showResult({ count: res.succeeded, action: 'ship', failed: res.failed, failedOrders, action_key: 'ship' })
      if (res.failed === 0) { onClear() }
      onRefetch?.()
    } catch {} finally { setBusy(false) }
  }, [bulkFulfill, showResult, onClear, onRefetch, selectedOrders])

  const handleRetryFailed = useCallback(async () => {
    if (!result?.failedOrders || result.failedOrders.length === 0) return
    const failedIds = new Set(result.failedOrders.map(f => f.subOrderId))
    const failedSelectedOrders = selectedOrders.filter(o => failedIds.has(o.subOrderId))
    setBusy(true)
    try {
      if (result.action_key === 'ship') {
        // Can't retry ship without tracking — just re-show tracking sheet
        setShowTracking(true)
      } else {
        const newStatusKey = result.action_key === 'accept' ? 'to_pack' : 'to_ship'
        const res = await bulkUpdate.mutateAsync({
          subOrderIds: failedSelectedOrders.map(o => o.subOrderId),
          newStatusKey,
        })
        const stillFailed = buildFailedOrders(res.results, failedSelectedOrders)
        showResult({
          count: res.succeeded,
          action: result.action_key as 'accept' | 'pack' | 'ship',
          failed: res.failed,
          failedOrders: stillFailed,
          action_key: result.action_key,
        })
        if (res.failed === 0) { onClear() }
        onRefetch?.()
      }
    } catch {} finally {
      setBusy(false)
    }
  }, [result, selectedOrders, bulkUpdate, showResult, onClear, onRefetch])

  const handlePrint = useCallback(() => {
    setShowPrintSheet(true)
  }, [])

  if (selectedOrders.length === 0) return null

  const canAccept = selectedOrders.every(o => o.statusKey === 'new')
  const canPack = selectedOrders.every(o => o.statusKey === 'to_pack')
  const canShip = selectedOrders.every(o => o.statusKey === 'to_ship')
  const canPrint = selectedOrders.every(o => o.statusKey === 'shipped' || o.statusKey === 'completed')

  return (
    <>
      <ResultSnackbar result={result} t={t} onDismiss={() => setResult(null)} onRetryFailed={handleRetryFailed} />

      <AnimatePresence>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: 24 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-surface rounded-lg shadow-xl border border-border-light px-4 py-3 flex items-center gap-3 max-w-[95vw]"
          role="toolbar"
          aria-label={t('seller.orders.bulkSelected', { count: selectedOrders.length })}
        >
          <span className="text-sm font-semibold text-text whitespace-nowrap" style={{ fontVariant: 'tabular-nums' }}>
            {t('seller.orders.bulkSelected', { count: selectedOrders.length })}
          </span>

          <div className="h-6 w-px bg-border-light" />

          <div className="flex items-center gap-1.5 flex-wrap">
            {canAccept && (
              <button
                onClick={handleAccept}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 min-h-[36px]"
                aria-label={t('seller.orders.bulkAcceptAria')}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t('seller.orders.bulkAccept')}
              </button>
            )}
            {canPack && (
              <button
                onClick={handlePack}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 min-h-[36px]"
                aria-label={t('seller.orders.bulkPackAria')}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                {t('seller.orders.bulkPack')}
              </button>
            )}
            {canShip && (
              <button
                onClick={() => setShowTracking(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-2 text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 min-h-[36px]"
                aria-label={t('seller.orders.bulkShipAria')}
              >
                <Truck size={14} />
                {t('seller.orders.bulkShip')}
              </button>
            )}
            {canPrint && (
              <button
                onClick={handlePrint}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface text-text px-3 py-2 text-sm font-semibold hover:bg-background disabled:opacity-50 min-h-[36px]"
                aria-label={t('seller.orders.bulkPrintAria')}
              >
                <Printer size={14} />
                {t('seller.orders.bulkPrint')}
              </button>
            )}
            {!canAccept && !canPack && !canShip && !canPrint && (
              <span className="text-xs text-text-muted italic">
                {t('seller.orders.invalidTransitionExplain', {
                  from: selectedOrders[0]?.statusKey ?? '',
                  to: 'next',
                })}
              </span>
            )}
          </div>

          <button
            onClick={onClear}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-background text-text-muted"
            aria-label={t('seller.orders.bulkClearAria')}
          >
            <X size={16} />
          </button>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showTracking && (
          <BulkTrackingSheet
            orders={selectedOrders}
            onClose={() => setShowTracking(false)}
            onConfirm={handleShip}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrintSheet && (
          <PrintDocsSheet
            orders={selectedOrders}
            onClose={() => setShowPrintSheet(false)}
            onPrinted={(ids) => {
              showResult({ count: ids.length, action: 'print', failed: 0 })
              onClear()
            }}
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default OrdersBulkBar
