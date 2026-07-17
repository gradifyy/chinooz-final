'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  X,
  AlertTriangle,
  Loader2,
  Check,
  XCircle,
  Image as ImageIcon,
  MessageCircle,
  Package,
  RotateCcw,
  ShieldAlert,
  Clock,
} from 'lucide-react'
import { useReducedMotion, SafeImage } from '@chinooz/ui-web'
import {
  useSellerCancelOrder,
  useApproveReturnRequest,
  useRejectReturnRequest,
  useLocale,
} from '@chinooz/hooks'
import { formatNPR } from '@chinooz/utils'
import { duration, easing, colors } from '@chinooz/theme'
import type {
  SellerSubOrder,
  SellerCancelReason,
  RefundStatus,
  SellerReturnRequest,
  ReturnRequestStatus,
} from '@chinooz/types'

const TABNUM: React.CSSProperties = { fontVariant: 'tabular-nums' }

const CANCEL_REASONS: { key: SellerCancelReason; labelKey: string }[] = [
  { key: 'out_of_stock', labelKey: 'seller.orders.cancelReasonOutOfStock' },
  { key: 'pricing_error', labelKey: 'seller.orders.cancelReasonPricingError' },
  { key: 'shipping_unavailable', labelKey: 'seller.orders.cancelReasonShippingUnavailable' },
  { key: 'buyer_request', labelKey: 'seller.orders.cancelReasonBuyerRequest' },
  { key: 'fraud_suspected', labelKey: 'seller.orders.cancelReasonFraudSuspected' },
  { key: 'other', labelKey: 'seller.orders.cancelReasonOther' },
]

const REFUND_STATUS_META: Record<
  RefundStatus,
  { bg: string; text: string; dot: string; labelKey: string; icon: typeof Clock }
> = {
  none: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    labelKey: 'seller.orders.refundNone',
    icon: Clock,
  },
  pending: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    dot: 'bg-warning',
    labelKey: 'seller.orders.refundPending',
    icon: Clock,
  },
  refunded: {
    bg: 'bg-success/10',
    text: 'text-success',
    dot: 'bg-success',
    labelKey: 'seller.orders.refundRefunded',
    icon: Check,
  },
  rejected: {
    bg: 'bg-error/10',
    text: 'text-error',
    dot: 'bg-error',
    labelKey: 'seller.orders.refundRejected',
    icon: XCircle,
  },
}

const RETURN_STATUS_META: Record<
  ReturnRequestStatus,
  { bg: string; text: string; dot: string; labelKey: string }
> = {
  requested: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    dot: 'bg-warning',
    labelKey: 'seller.orders.returnRequested',
  },
  approved: {
    bg: 'bg-info/10',
    text: 'text-info',
    dot: 'bg-info',
    labelKey: 'seller.orders.returnApproved',
  },
  rejected: {
    bg: 'bg-error/10',
    text: 'text-error',
    dot: 'bg-error',
    labelKey: 'seller.orders.returnRejected',
  },
  refund_processed: {
    bg: 'bg-success/10',
    text: 'text-success',
    dot: 'bg-success',
    labelKey: 'seller.orders.returnRefundProcessed',
  },
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function computeVatBreakdown(order: SellerSubOrder) {
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0)
  const vatInclusive = Math.round((subtotal * 0.13) / 1.13)
  const deliveryFee = Math.max(0, order.total - subtotal)
  const discount =
    subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0
  return { subtotal, vatInclusive, deliveryFee, discount, refundTotal: order.total }
}

/** Focus trap hook for modal sheets */
function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open || !containerRef.current) return
    const container = containerRef.current
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    container.addEventListener('keydown', handleKey)
    first.focus()
    return () => container.removeEventListener('keydown', handleKey)
  }, [open, containerRef])
}

export function RefundStatusPill({
  status,
  t,
  size = 'sm',
}: {
  status: RefundStatus
  t: (k: string) => string
  size?: 'sm' | 'md'
}) {
  const meta = REFUND_STATUS_META[status]
  const Icon = meta.icon
  const sizeCls = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-[12px]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeCls} font-semibold ${meta.bg} ${meta.text}`}
      role="status"
      aria-label={`${t('seller.orders.refundStatusLabel')}: ${t(meta.labelKey)}`}
    >
      <Icon size={size === 'md' ? 14 : 12} aria-hidden="true" />
      {t(meta.labelKey)}
    </span>
  )
}

export function RefundBreakdownTable({
  order,
  t,
}: {
  order: SellerSubOrder
  t: (k: string) => string
}) {
  const locale = useLocale()
  const breakdown = order.refundBreakdown ?? computeVatBreakdown(order)
  return (
    <div
      className="bg-surface rounded-xl border border-border-light p-4 space-y-2"
      aria-labelledby="refund-breakdown-heading"
    >
      <h4 id="refund-breakdown-heading" className="text-sm font-semibold text-text mb-2">
        {t('seller.orders.refundBreakdownTitle')}
      </h4>
      <div className="flex items-center justify-between py-0.5">
        <span className="text-sm text-text-muted">{t('seller.orders.refundSubtotal')}</span>
        <span
          className="text-sm text-text tabular-nums"
          style={TABNUM}
          aria-label={`${t('seller.orders.refundSubtotal')}: ${formatNPR(breakdown.subtotal, locale)}`}
        >
          {formatNPR(breakdown.subtotal, locale)}
        </span>
      </div>
      <div className="flex items-center justify-between py-0.5">
        <span className="text-sm text-text-muted">{t('seller.orders.refundVatIncl')}</span>
        <span
          className="text-sm text-text-muted tabular-nums"
          style={TABNUM}
          aria-label={`${t('seller.orders.refundVatIncl')}: ${formatNPR(breakdown.vatInclusive, locale)}`}
        >
          {formatNPR(breakdown.vatInclusive, locale)}
        </span>
      </div>
      <div className="flex items-center justify-between py-0.5">
        <span className="text-sm text-text-muted">{t('seller.orders.refundDeliveryFee')}</span>
        <span
          className="text-sm text-text tabular-nums"
          style={TABNUM}
          aria-label={`${t('seller.orders.refundDeliveryFee')}: ${formatNPR(breakdown.deliveryFee, locale)}`}
        >
          {formatNPR(breakdown.deliveryFee, locale)}
        </span>
      </div>
      {breakdown.discount > 0 && (
        <div className="flex items-center justify-between py-0.5">
          <span className="text-sm text-text-muted">{t('seller.orders.refundDiscount')}</span>
          <span
            className="text-sm text-text-muted tabular-nums"
            style={TABNUM}
            aria-label={`${t('seller.orders.refundDiscount')}: ${formatNPR(breakdown.discount, locale)}`}
          >
            -{formatNPR(breakdown.discount, locale)}
          </span>
        </div>
      )}
      <div className="h-px bg-border-light my-1" />
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-text">{t('seller.orders.refundTotal')}</span>
        <span
          className="text-base font-bold text-text tabular-nums"
          style={TABNUM}
          aria-label={`${t('seller.orders.refundTotal')}: ${formatNPR(breakdown.refundTotal, locale)}`}
        >
          {formatNPR(breakdown.refundTotal, locale)}
        </span>
      </div>
      <p className="text-[12px] text-text-muted pt-1">{t('seller.orders.refundVatNote')}</p>
    </div>
  )
}

export function CancelOrderSheet({
  order,
  onClose,
  onCancelled,
  t,
}: {
  order: SellerSubOrder
  onClose: () => void
  onCancelled?: (reason: SellerCancelReason, reasonDetail?: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
  const locale = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const [reason, setReason] = useState<SellerCancelReason | ''>('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const cancelOrder = useSellerCancelOrder()
  useFocusTrap(true, containerRef)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const isPrepaid = order.paymentType === 'prepaid'
  const breakdown = useMemo(() => computeVatBreakdown(order), [order])

  const handleConfirm = useCallback(async () => {
    if (!reason) {
      setError(t('seller.orders.cancelReasonRequired'))
      return
    }
    setBusy(true)
    try {
      await cancelOrder.mutateAsync({
        subOrderId: order.subOrderId,
        reason: reason as SellerCancelReason,
        reasonDetail: detail.trim() || undefined,
      })
      onCancelled?.(reason as SellerCancelReason, detail.trim() || undefined)
      onClose()
    } catch {
      setError(t('seller.orders.cancelError'))
    } finally {
      setBusy(false)
    }
  }, [reason, detail, order, cancelOrder, onCancelled, onClose, t])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-sheet-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => !busy && onClose()} />
      <motion.div
        ref={containerRef}
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 320 }}
        className="relative bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-border-light px-5 py-4 flex items-center justify-between">
          <h3
            id="cancel-sheet-title"
            className="text-lg font-semibold text-text flex items-center gap-2"
          >
            <AlertTriangle size={18} className="text-error" aria-hidden="true" />
            {t('seller.orders.cancelTitle')}
          </h3>
          <button
            onClick={() => !busy && onClose()}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background"
            aria-label={t('seller.orders.cancelClose')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Calm summary — not alarming */}
          <div className="rounded-lg bg-background border border-border-light p-3 space-y-1.5">
            <p
              className="text-sm font-semibold text-text"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {order.orderId}
            </p>
            <p className="text-sm text-text-muted">
              {order.buyerName} · {order.itemCount}{' '}
              {order.itemCount === 1 ? t('seller.orders.item') : t('seller.orders.items')}
            </p>
            <p className="text-sm font-semibold text-text tabular-nums" style={TABNUM}>
              {formatNPR(order.total, locale)}
            </p>
            <p className="text-[12px] text-text-muted">
              {isPrepaid ? t('seller.orders.cancelPrepaidNote') : t('seller.orders.cancelCodNote')}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-text" id="cancel-reason-group-label">
              {t('seller.orders.cancelReasonLabel')}
            </p>
            <div
              role="radiogroup"
              aria-labelledby="cancel-reason-group-label"
              className="space-y-1"
            >
              {CANCEL_REASONS.map(r => (
                <label
                  key={r.key}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-background cursor-pointer border border-transparent has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r.key}
                    checked={reason === r.key}
                    onChange={() => {
                      setReason(r.key)
                      setError('')
                    }}
                    aria-label={t(r.labelKey)}
                    className="w-5 h-5 text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-text">{t(r.labelKey)}</span>
                </label>
              ))}
            </div>
            {error && (
              <p className="text-xs text-error font-medium" role="alert">
                {error}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cancel-detail" className="block text-sm font-semibold text-text mb-1.5">
              {t('seller.orders.cancelReasonDetail')}
            </label>
            <textarea
              id="cancel-detail"
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder={t('seller.orders.cancelReasonDetailPlaceholder')}
              rows={3}
              aria-label={t('seller.orders.cancelReasonDetail')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* VAT-aware refund breakdown for prepaid */}
          {isPrepaid && (
            <div className="rounded-lg border border-border-light p-3 space-y-1.5">
              <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
                {t('seller.orders.refundBreakdownTitle')}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t('seller.orders.refundSubtotal')}</span>
                <span className="text-text tabular-nums" style={TABNUM}>
                  {formatNPR(breakdown.subtotal, locale)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t('seller.orders.refundVatIncl')}</span>
                <span className="text-text-muted tabular-nums" style={TABNUM}>
                  {formatNPR(breakdown.vatInclusive, locale)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t('seller.orders.refundDeliveryFee')}</span>
                <span className="text-text tabular-nums" style={TABNUM}>
                  {formatNPR(breakdown.deliveryFee, locale)}
                </span>
              </div>
              <div className="h-px bg-border-light my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-bold text-text">
                  {t('seller.orders.refundTotal')}
                </span>
                <span
                  className="text-sm font-bold text-text tabular-nums"
                  style={TABNUM}
                  aria-label={`${t('seller.orders.refundTotal')}: ${formatNPR(breakdown.refundTotal, locale)}`}
                >
                  {formatNPR(breakdown.refundTotal, locale)}
                </span>
              </div>
            </div>
          )}

          {/* Restock + refund info */}
          <div className="flex items-start gap-2 text-[12px] text-text-muted bg-info/5 rounded-lg p-2.5">
            <Package size={14} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
            <span>{t('seller.orders.cancelRestockInfo')}</span>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border-light px-5 py-3 flex gap-3">
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex-1 h-10 rounded-md border border-border text-text font-semibold text-sm hover:bg-background disabled:opacity-50"
            aria-label={t('seller.orders.cancelClose')}
          >
            {t('seller.orders.cancelKeepOrder')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 h-10 rounded-md bg-error text-white font-semibold text-sm hover:bg-error/90 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: colors.error }}
            aria-label={t('seller.orders.cancelConfirmAria', {
              id: order.orderId,
              amount: formatNPR(order.total, locale),
            })}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            {t('seller.orders.cancelConfirm')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function ReturnRequestCard({
  request,
  onApprove,
  onReject,
  onMessage,
  t,
}: {
  request: SellerReturnRequest
  onApprove: (requestId: string, note?: string) => void
  onReject: (requestId: string, note?: string) => void
  onMessage: (orderId: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
  const locale = useLocale()
  const [showApproveSheet, setShowApproveSheet] = useState(false)
  const [showRejectSheet, setShowRejectSheet] = useState(false)
  const cardId = `return-card-${request.id}`
  const statusMeta = RETURN_STATUS_META[request.status]
  const isResolved =
    request.status === 'approved' ||
    request.status === 'rejected' ||
    request.status === 'refund_processed'

  return (
    <>
      <motion.article
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced ? { duration: 0 } : { duration: duration.normal / 1000, ease: easing.easeOut }
        }
        className="bg-surface rounded-xl border border-border-light p-4 space-y-3 shadow-sm"
        aria-labelledby={`${cardId}-title`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 id={`${cardId}-title`} className="text-base font-semibold text-text">
              {t('seller.orders.returnCardTitle')} · {request.buyerName}
            </h4>
            <p className="text-sm text-text-muted mt-0.5">
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{request.orderId}</span>
              {' · '}
              {formatDateShort(request.createdAt)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold shrink-0 ${statusMeta.bg} ${statusMeta.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} aria-hidden="true" />
            {t(statusMeta.labelKey)}
          </span>
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
            {t('seller.orders.returnReasonLabel')}
          </p>
          <p className="text-sm text-text">
            {t(
              `seller.orders.cancelReason${request.reason.charAt(0).toUpperCase()}${request.reason.slice(1)}`,
            )}
          </p>
          {request.reasonDetail && (
            <p className="text-sm text-text-muted italic">{request.reasonDetail}</p>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
            {t('seller.orders.returnItemsLabel')}
          </p>
          {request.items.map(item => (
            <div key={item.itemId} className="flex items-center gap-2.5">
              <SafeImage
                src={item.image}
                alt=""
                className="w-10 h-10 rounded-md object-cover bg-shimmer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">
                  {item.name.split('—')[0]?.trim() || item.name}
                </p>
                <p className="text-xs text-text-muted">
                  {t('seller.orders.qty')}: {item.quantity} · {formatNPR(item.price, locale)}{' '}
                  {t('seller.orders.each')}
                </p>
              </div>
              <span
                className="text-sm font-semibold text-text tabular-nums shrink-0"
                style={TABNUM}
              >
                {formatNPR(item.price * item.quantity, locale)}
              </span>
            </div>
          ))}
        </div>

        {/* Photos placeholder */}
        {request.photoUrls.length > 0 && (
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
              {t('seller.orders.returnPhotosLabel')}
            </p>
            <div className="flex gap-2">
              {request.photoUrls.map((url, i) => (
                <div
                  key={i}
                  className="w-16 h-16 rounded-lg border border-border-light bg-background flex items-center justify-center text-text-tertiary"
                  aria-label={`${t('seller.orders.returnPhoto')} ${i + 1}`}
                >
                  <ImageIcon size={20} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requested amount */}
        <div className="flex items-center justify-between rounded-lg bg-background border border-border-light px-3 py-2">
          <span className="text-sm font-semibold text-text-muted">
            {t('seller.orders.returnRequestedAmount')}
          </span>
          <span
            className="text-base font-bold text-text tabular-nums"
            style={TABNUM}
            aria-label={`${t('seller.orders.returnRequestedAmount')}: ${formatNPR(request.requestedAmount, locale)}`}
          >
            {formatNPR(request.requestedAmount, locale)}
          </span>
        </div>

        {/* Resolution note if resolved */}
        {isResolved && request.resolutionNote && (
          <div className="rounded-lg bg-background border border-border-light p-2.5">
            <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-1">
              {t('seller.orders.returnResolutionNote')}
            </p>
            <p className="text-sm text-text">{request.resolutionNote}</p>
          </div>
        )}

        {/* Refund status pill */}
        {request.refundStatus !== 'none' && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-text-muted">
              {t('seller.orders.refundStatusLabel')}
            </span>
            <RefundStatusPill status={request.refundStatus} t={t} />
          </div>
        )}

        {/* Actions */}
        {!isResolved && (
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              whileTap={reduced ? undefined : { scale: 0.97 }}
              onClick={() => setShowApproveSheet(true)}
              className="flex-1 h-9 rounded-md bg-success text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-success/90"
              aria-label={t('seller.orders.returnApproveAria', {
                id: request.orderId,
                amount: formatNPR(request.requestedAmount, locale),
              })}
            >
              <Check size={15} />
              {t('seller.orders.returnApprove')}
            </motion.button>
            <motion.button
              whileTap={reduced ? undefined : { scale: 0.97 }}
              onClick={() => setShowRejectSheet(true)}
              className="flex-1 h-9 rounded-md border border-error/30 bg-error/5 text-error text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-error/10"
              aria-label={t('seller.orders.returnRejectAria', { id: request.orderId })}
            >
              <XCircle size={15} />
              {t('seller.orders.returnReject')}
            </motion.button>
            <motion.button
              whileTap={reduced ? undefined : { scale: 0.97 }}
              onClick={() => onMessage(request.orderId)}
              className="h-9 px-3 rounded-md border border-border bg-surface text-text text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-background"
              aria-label={t('seller.orders.returnMessageAria', { id: request.orderId })}
            >
              <MessageCircle size={15} />
            </motion.button>
          </div>
        )}

        {/* Message link for resolved */}
        {isResolved && (
          <button
            onClick={() => onMessage(request.orderId)}
            className="text-sm font-semibold text-primary inline-flex items-center gap-1.5 hover:underline"
            aria-label={t('seller.orders.returnMessageAria', { id: request.orderId })}
          >
            <MessageCircle size={14} />
            {t('seller.orders.returnMessageBuyer')}
          </button>
        )}
      </motion.article>

      <AnimatePresence>
        {showApproveSheet && (
          <ReturnResolutionSheet
            mode="approve"
            request={request}
            onClose={() => setShowApproveSheet(false)}
            onConfirm={note => {
              onApprove(request.id, note)
              setShowApproveSheet(false)
            }}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRejectSheet && (
          <ReturnResolutionSheet
            mode="reject"
            request={request}
            onClose={() => setShowRejectSheet(false)}
            onConfirm={note => {
              onReject(request.id, note)
              setShowRejectSheet(false)
            }}
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function ReturnResolutionSheet({
  mode,
  request,
  onClose,
  onConfirm,
  t,
}: {
  mode: 'approve' | 'reject'
  request: SellerReturnRequest
  onClose: () => void
  onConfirm: (note?: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
  const locale = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useFocusTrap(true, containerRef)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const isApprove = mode === 'approve'
  const titleKey = isApprove
    ? 'seller.orders.returnApproveTitle'
    : 'seller.orders.returnRejectTitle'
  const subtitleKey = isApprove
    ? 'seller.orders.returnApproveSubtitle'
    : 'seller.orders.returnRejectSubtitle'
  const confirmKey = isApprove
    ? 'seller.orders.returnApproveConfirm'
    : 'seller.orders.returnRejectConfirm'
  const confirmAriaKey = isApprove
    ? 'seller.orders.returnApproveConfirmAria'
    : 'seller.orders.returnRejectConfirmAria'

  const handleConfirm = useCallback(async () => {
    setBusy(true)
    // Small delay for UX; the parent handles the actual mutation
    await new Promise(r => setTimeout(r, reduced ? 100 : 300))
    onConfirm(note.trim() || undefined)
    setBusy(false)
  }, [note, onConfirm, reduced])

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-resolution-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => !busy && onClose()} />
      <motion.div
        ref={containerRef}
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 24, scale: 0.97 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 320 }}
        className="relative bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-surface border-b border-border-light px-5 py-4 flex items-center justify-between">
          <h3
            id="return-resolution-title"
            className="text-lg font-semibold text-text flex items-center gap-2"
          >
            {isApprove ? (
              <RotateCcw size={18} className="text-success" aria-hidden="true" />
            ) : (
              <ShieldAlert size={18} className="text-error" aria-hidden="true" />
            )}
            {t(titleKey)}
          </h3>
          <button
            onClick={() => !busy && onClose()}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background"
            aria-label={t('seller.orders.cancelClose')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">{t(subtitleKey)}</p>

          {/* Summary with item + amount in copy */}
          <div className="rounded-lg bg-background border border-border-light p-3 space-y-1.5">
            <p
              className="text-sm font-semibold text-text"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {request.orderId}
            </p>
            <p className="text-sm text-text-muted">
              {request.buyerName} · {request.items.length}{' '}
              {request.items.length === 1 ? t('seller.orders.item') : t('seller.orders.items')}
            </p>
            <p className="text-sm text-text">
              {t('seller.orders.returnAmountToRefund')}:{' '}
              <span className="font-semibold tabular-nums" style={TABNUM}>
                {formatNPR(request.requestedAmount, locale)}
              </span>
            </p>
            {isApprove && (
              <p className="text-[12px] text-text-muted pt-1">
                {t('seller.orders.returnApproveRestockNote')}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="resolution-note"
              className="block text-sm font-semibold text-text mb-1.5"
            >
              {t('seller.orders.returnResolutionNoteLabel')}
            </label>
            <textarea
              id="resolution-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('seller.orders.returnResolutionNotePlaceholder')}
              rows={3}
              aria-label={t('seller.orders.returnResolutionNoteLabel')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border-light px-5 py-3 flex gap-3">
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex-1 h-10 rounded-md border border-border text-text font-semibold text-sm hover:bg-background disabled:opacity-50"
            aria-label={t('seller.orders.cancelClose')}
          >
            {t('seller.orders.returnResolutionCancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`flex-1 h-10 rounded-md text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${
              isApprove ? 'bg-success hover:bg-success/90' : 'bg-error hover:bg-error/90'
            }`}
            style={isApprove ? undefined : { backgroundColor: colors.error }}
            aria-label={t(confirmAriaKey, {
              id: request.orderId,
              amount: formatNPR(request.requestedAmount, locale),
            })}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isApprove ? (
              <Check size={16} />
            ) : (
              <XCircle size={16} />
            )}
            {t(confirmKey)}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function ReturnRequestsQueue({
  requests,
  onMessage,
  t,
}: {
  requests: SellerReturnRequest[]
  onMessage: (orderId: string) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
  const locale = useLocale()
  const approveReturn = useApproveReturnRequest()
  const rejectReturn = useRejectReturnRequest()
  const [resultBanner, setResultBanner] = useState<string | null>(null)

  const handleApprove = useCallback(
    async (requestId: string, note?: string) => {
      try {
        await approveReturn.mutateAsync({ requestId, resolutionNote: note })
        setResultBanner(t('seller.orders.returnApproveSuccess'))
        setTimeout(() => setResultBanner(null), 3000)
      } catch {
        setResultBanner(t('seller.orders.returnApproveError'))
        setTimeout(() => setResultBanner(null), 3000)
      }
    },
    [approveReturn, t],
  )

  const handleReject = useCallback(
    async (requestId: string, note?: string) => {
      try {
        await rejectReturn.mutateAsync({ requestId, resolutionNote: note })
        setResultBanner(t('seller.orders.returnRejectSuccess'))
        setTimeout(() => setResultBanner(null), 3000)
      } catch {
        setResultBanner(t('seller.orders.returnRejectError'))
        setTimeout(() => setResultBanner(null), 3000)
      }
    },
    [rejectReturn, t],
  )

  const pending = requests.filter(r => r.status === 'requested')
  const resolved = requests.filter(r => r.status !== 'requested')

  return (
    <div className="space-y-4">
      {/* Live region for bulk/single result */}
      <span className="sr-only" role="status" aria-live="assertive">
        {resultBanner ?? ''}
      </span>

      <AnimatePresence>
        {resultBanner && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={
              reduced ? { duration: 0 } : { duration: duration.normal / 1000, ease: easing.easeOut }
            }
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg flex items-center gap-2"
            role="status"
          >
            <Check size={16} strokeWidth={3} />
            {resultBanner}
          </motion.div>
        )}
      </AnimatePresence>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t('seller.orders.returnQueuePending')} ({pending.length})
          </h3>
          {pending.map(r => (
            <ReturnRequestCard
              key={r.id}
              request={r}
              onApprove={handleApprove}
              onReject={handleReject}
              onMessage={onMessage}
              t={t}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t('seller.orders.returnQueueResolved')} ({resolved.length})
          </h3>
          {resolved.map(r => (
            <ReturnRequestCard
              key={r.id}
              request={r}
              onApprove={handleApprove}
              onReject={handleReject}
              onMessage={onMessage}
              t={t}
            />
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-text-tertiary mb-3" aria-hidden="true">
            <RotateCcw size={36} />
          </span>
          <h3 className="text-base font-semibold text-text">
            {t('seller.orders.returnEmptyTitle')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-xs">
            {t('seller.orders.returnEmptySubtitle')}
          </p>
        </div>
      )}
    </div>
  )
}

export default CancelOrderSheet
