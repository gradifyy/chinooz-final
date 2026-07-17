'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Printer,
  FileDown,
  Share2,
  X,
  Loader2,
  Check,
  FileText,
  Package,
  Boxes,
} from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { useMarkLabelPrinted, useLocale } from '@chinooz/hooks'
import { formatNPR } from '@chinooz/utils'
import { duration, easing } from '@chinooz/theme'
import type { SellerSubOrder } from '@chinooz/types'

const TABNUM: React.CSSProperties = { fontVariant: 'tabular-nums' }
const MONO: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }

type DocTab = 'slip' | 'label' | 'invoice' | 'both'
type Phase = 'idle' | 'preparing' | 'ready'

const SELLER_PAN = '601234567'

const SHIPPING_TO_CARRIER: Record<string, string> = {
  standard: 'Local Post',
  express: 'Pathao Express',
  sameday: 'Pathao SameDay',
  pickup: 'Store Pickup',
}

const SERVICE_LABEL: Record<string, string> = {
  standard: 'Standard',
  express: 'Express',
  sameday: 'Same-day',
  pickup: 'Pickup',
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function genTracking(order: SellerSubOrder): string {
  if (order.trackingNumber) return order.trackingNumber
  const digits = order.orderId.replace(/\D/g, '') || '000000'
  return `TRK${digits.padStart(8, '0')}`
}

function carrierFor(order: SellerSubOrder): string {
  if (order.carrier) return order.carrier
  return SHIPPING_TO_CARRIER[order.shippingMethod] ?? 'Local Courier'
}

function computeWeight(order: SellerSubOrder): number {
  if (order.weightGrams) return order.weightGrams
  const itemWeight = order.items.reduce((s, it) => s + it.quantity * 220, 0)
  return itemWeight + 120 // packaging
}

/**
 * Deterministic pseudo-barcode: renders a row of vertical bars whose widths
 * are derived from the characters of the value. Print-grade, no external lib.
 */
function BarcodeBars({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const bars = useMemo(() => {
    const out: { w: number; dark: boolean }[] = []
    const chars = value.split('')
    for (let i = 0; i < chars.length; i++) {
      const code = chars[i].charCodeAt(0)
      // each char → 4 modules
      for (let j = 0; j < 4; j++) {
        const bit = (code >> (j * 2)) & 0x3
        out.push({ w: 1 + (bit & 1), dark: (bit & 0x2) === 0 })
      }
      // guard space between chars
      if (i < chars.length - 1) out.push({ w: 1, dark: false })
    }
    return out
  }, [value])

  return (
    <div className="print-barcode" role="img" aria-label={ariaLabel} aria-hidden={false}>
      <div className="print-barcode-bars" aria-hidden="true">
        {bars.map((b, i) => (
          <span
            key={i}
            className={b.dark ? 'print-bar-on' : 'print-bar-off'}
            style={{ width: `${b.w * 2}px` }}
          />
        ))}
      </div>
      <div className="print-barcode-value" style={MONO}>
        {value}
      </div>
    </div>
  )
}

/**
 * Deterministic pseudo-QR placeholder: a grid of cells derived from a hash of
 * the value. Print-grade placeholder (no scanning).
 */
function QrPlaceholder({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const cells = useMemo(() => {
    const size = 21
    const grid: boolean[] = []
    let h = 2166136261
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    for (let i = 0; i < size * size; i++) {
      h = Math.imul(h ^ (h >>> 13), 16777619)
      grid.push(((h >>> 0) & 0x7) < 3)
    }
    // finder squares (corners) for QR look
    const setFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const onRing = r === 0 || r === 6 || c === 0 || c === 6
          const onCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
          grid[(r0 + r) * size + (c0 + c)] = onRing || onCore
        }
      }
    }
    setFinder(0, 0)
    setFinder(0, size - 7)
    setFinder(size - 7, 0)
    return { size, grid }
  }, [value])

  return (
    <div className="print-qr" role="img" aria-label={ariaLabel}>
      <div
        className="print-qr-grid"
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${cells.size}, 1fr)`,
          gridTemplateRows: `repeat(${cells.size}, 1fr)`,
        }}
      >
        {cells.grid.map((on, i) => (
          <span key={i} className={on ? 'print-qr-on' : 'print-qr-off'} />
        ))}
      </div>
    </div>
  )
}

function PackingSlipPage({
  order,
  t,
}: {
  order: SellerSubOrder
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const locale = useLocale()
  const isCod = order.paymentType === 'cod'
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0)
  const deliveryFee = Math.max(0, order.total - subtotal)
  const tracking = genTracking(order)

  return (
    <section className="print-page print-page-slip" aria-label={t('seller.orders.slipTitle')}>
      <header className="print-page-head">
        <div>
          <h2 className="print-page-title">{t('seller.orders.slipTitle')}</h2>
          <p className="print-store">{t('seller.orders.slipStoreName')}: Chinooz Store</p>
        </div>
        <div className="print-page-id">
          <p className="print-meta-label">{t('seller.orders.slipOrder')}</p>
          <p className="print-order-id" style={MONO}>
            {order.orderId}
          </p>
          <p className="print-meta">
            {t('seller.orders.slipDate')}: {formatDateLong(order.createdAt)}
          </p>
        </div>
      </header>

      <div className="print-barcode-block">
        <BarcodeBars value={order.orderId} ariaLabel={t('seller.orders.slipBarcode')} />
        <QrPlaceholder value={order.orderId} ariaLabel={t('seller.orders.slipQr')} />
      </div>

      <div className="print-parties">
        <div className="print-party">
          <p className="print-meta-label">{t('seller.orders.slipBillTo')}</p>
          <p className="print-party-name">{order.buyerName}</p>
          <p className="print-party-line">
            {order.city}, {order.district}
          </p>
          <p className="print-party-line" style={MONO}>
            {order.buyerPhone}
          </p>
        </div>
        <div className="print-party">
          <p className="print-meta-label">{t('seller.orders.slipShipTo')}</p>
          <p className="print-party-name">{order.buyerName}</p>
          <p className="print-party-line">
            {order.city}, {order.district}
          </p>
          <p className="print-party-line">
            {t('seller.orders.labelService')}:{' '}
            {SERVICE_LABEL[order.shippingMethod] ?? order.shippingMethod}
          </p>
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th scope="col" className="print-col-item">
              {t('seller.orders.slipItem')}
            </th>
            <th scope="col" className="print-col-sku">
              {t('seller.orders.slipSku')}
            </th>
            <th scope="col" className="print-col-qty">
              {t('seller.orders.slipQty')}
            </th>
            <th scope="col" className="print-col-price">
              {t('seller.orders.slipPrice')}
            </th>
            <th scope="col" className="print-col-total">
              {t('seller.orders.slipLineTotal')}
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => {
            const base = item.name.split('—')[0]?.trim() || item.name
            const variant = item.name.split('—')[1]?.trim()
            return (
              <tr key={item.id}>
                <td className="print-col-item">
                  <span className="print-item-name">{base}</span>
                  {variant && <span className="print-item-variant">{variant}</span>}
                </td>
                <td className="print-col-sku" style={MONO}>
                  {item.sku ?? '—'}
                </td>
                <td className="print-col-qty" style={TABNUM}>
                  {item.quantity}
                </td>
                <td className="print-col-price" style={TABNUM}>
                  {formatNPR(item.price, locale)}
                </td>
                <td className="print-col-total" style={TABNUM}>
                  {formatNPR(item.price * item.quantity, locale)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="print-totals">
        <div className="print-totals-line">
          <span>{t('seller.orders.slipSubtotal')}</span>
          <span style={TABNUM}>{formatNPR(subtotal, locale)}</span>
        </div>
        <div className="print-totals-line">
          <span>{t('seller.orders.slipDelivery')}</span>
          <span style={TABNUM}>{formatNPR(deliveryFee, locale)}</span>
        </div>
        <div className="print-totals-line print-totals-grand">
          <span>{t('seller.orders.slipTotal')}</span>
          <span style={TABNUM}>{formatNPR(order.total, locale)}</span>
        </div>
      </div>

      {isCod ? (
        <div
          className="print-cod-box print-cod-box-slip"
          role="group"
          aria-label={t('seller.orders.slipCodAmountAria', {
            amount: formatNPR(order.total, locale),
          })}
        >
          <p className="print-cod-box-label">{t('seller.orders.slipCodCollect')}</p>
          <p className="print-cod-box-amount" style={TABNUM}>
            {formatNPR(order.total, locale)}
          </p>
          <p className="print-cod-box-sub">{t('seller.orders.slipCodAmount')}</p>
        </div>
      ) : (
        <p className="print-prepaid-note">{t('seller.orders.slipPrepaid')}</p>
      )}

      <footer className="print-page-foot">
        <p className="print-meta-label">{t('seller.orders.slipPackedBy')}</p>
        <div className="print-sign-line" aria-hidden="true" />
        <p className="print-meta">{t('seller.orders.slipNotes')}: __________________</p>
        <p className="print-meta print-tracking-line" style={MONO}>
          {t('seller.orders.labelTracking')}: {tracking}
        </p>
      </footer>
    </section>
  )
}

function ShippingLabelPage({
  order,
  t,
}: {
  order: SellerSubOrder
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const locale = useLocale()
  const isCod = order.paymentType === 'cod'
  const tracking = genTracking(order)
  const carrier = carrierFor(order)
  const weight = computeWeight(order)

  return (
    <section className="print-page print-page-label" aria-label={t('seller.orders.labelTitle')}>
      <header className="print-label-header">
        <div>
          <h2 className="print-page-title">{t('seller.orders.labelTitle')}</h2>
          <p className="print-store">{t('seller.orders.slipStoreName')}: Chinooz Store</p>
        </div>
        <div className="print-label-meta-grid">
          <div>
            <p className="print-meta-label">{t('seller.orders.labelCarrier')}</p>
            <p className="print-meta-value">{carrier}</p>
          </div>
          <div>
            <p className="print-meta-label">{t('seller.orders.labelService')}</p>
            <p className="print-meta-value">
              {SERVICE_LABEL[order.shippingMethod] ?? order.shippingMethod}
            </p>
          </div>
          <div>
            <p className="print-meta-label">{t('seller.orders.labelShipDate')}</p>
            <p className="print-meta-value">{formatDateShort(new Date().toISOString())}</p>
          </div>
          <div>
            <p className="print-meta-label">{t('seller.orders.labelWeight')}</p>
            <p className="print-meta-value" style={TABNUM}>
              {weight} g
            </p>
          </div>
        </div>
      </header>

      <div className="print-label-addresses">
        <div className="print-label-from">
          <p className="print-meta-label">{t('seller.orders.labelFrom')}</p>
          <p className="print-party-name">Chinooz Store</p>
          <p className="print-party-line">Kathmandu, Nepal</p>
          <p className="print-party-line" style={MONO}>
            +977-1-4000000
          </p>
        </div>
        <div className="print-label-arrow" aria-hidden="true">
          →
        </div>
        <div className="print-label-to">
          <p className="print-meta-label">{t('seller.orders.labelTo')}</p>
          <p className="print-party-name print-label-to-name">{order.buyerName}</p>
          <p className="print-party-line print-label-to-line">
            {order.city}, {order.district}
          </p>
          <p className="print-party-line print-label-to-line" style={MONO}>
            {order.buyerPhone}
          </p>
        </div>
      </div>

      <div className="print-barcode-block print-label-barcode">
        <BarcodeBars value={tracking} ariaLabel={t('seller.orders.labelBarcode')} />
      </div>
      <p className="print-tracking-line print-tracking-center" style={MONO}>
        {t('seller.orders.labelTracking')}: {tracking}
      </p>

      {isCod ? (
        <div
          className="print-cod-box print-cod-box-label"
          role="group"
          aria-label={t('seller.orders.labelCodAmountAria', {
            amount: formatNPR(order.total, locale),
          })}
        >
          <p className="print-cod-box-banner">{t('seller.orders.labelCodBox')}</p>
          <p className="print-cod-box-amount" style={TABNUM}>
            {formatNPR(order.total, locale)}
          </p>
          <p className="print-cod-box-sub">{t('seller.orders.labelCodCollect')}</p>
        </div>
      ) : (
        <div className="print-payment-row">
          <p className="print-meta-label">{t('seller.orders.labelPayment')}</p>
          <p className="print-prepaid-pill">{t('seller.orders.slipPrepaid')}</p>
        </div>
      )}

      <footer className="print-page-foot print-label-foot">
        <p className="print-meta" style={MONO}>
          {order.orderId} · {order.subOrderId}
        </p>
        <p className="print-meta">{t('seller.orders.labelDimensions')}: 15 × 10 × 5 cm</p>
      </footer>
    </section>
  )
}

function TaxInvoicePage({
  order,
  t,
}: {
  order: SellerSubOrder
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  const locale = useLocale()
  const subtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0)
  const deliveryFee = Math.max(0, order.total - subtotal)
  // Prices are VAT-inclusive (13%); back out the tax component for the invoice.
  const taxable = order.total / 1.13
  const vat = order.total - taxable
  const invoiceNo = `INV-${order.orderId.toUpperCase().replace('ORD-', '')}`

  return (
    <section className="print-page print-page-slip" aria-label={t('seller.orders.invoiceTitle')}>
      <header className="print-page-head">
        <div>
          <h2 className="print-page-title">{t('seller.orders.invoiceTaxInvoice')}</h2>
          <p className="print-store">Chinooz Store</p>
          <p className="print-meta">
            {t('seller.orders.invoicePan')}: {SELLER_PAN}
          </p>
        </div>
        <div className="print-page-id">
          <p className="print-meta-label">{t('seller.orders.invoiceNo')}</p>
          <p className="print-order-id" style={MONO}>
            {invoiceNo}
          </p>
          <p className="print-meta">
            {t('seller.orders.slipDate')}: {formatDateLong(order.createdAt)}
          </p>
          <p className="print-meta" style={MONO}>
            {order.orderId}
          </p>
        </div>
      </header>

      <div className="print-parties">
        <div className="print-party">
          <p className="print-meta-label">{t('seller.orders.invoiceBillTo')}</p>
          <p className="print-party-name">{order.buyerName}</p>
          <p className="print-party-line">
            {order.city}, {order.district}
          </p>
          <p className="print-party-line" style={MONO}>
            {order.buyerPhone}
          </p>
        </div>
        <div className="print-party">
          <p className="print-meta-label">{t('seller.orders.labelPayment')}</p>
          <p className="print-party-name">
            {order.paymentType === 'cod'
              ? t('seller.orders.slipCodCollect')
              : t('seller.orders.slipPrepaid')}
          </p>
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th scope="col" className="print-col-item">
              {t('seller.orders.slipItem')}
            </th>
            <th scope="col" className="print-col-sku">
              {t('seller.orders.slipSku')}
            </th>
            <th scope="col" className="print-col-qty">
              {t('seller.orders.slipQty')}
            </th>
            <th scope="col" className="print-col-price">
              {t('seller.orders.slipPrice')}
            </th>
            <th scope="col" className="print-col-total">
              {t('seller.orders.slipLineTotal')}
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => {
            const base = item.name.split('—')[0]?.trim() || item.name
            const variant = item.name.split('—')[1]?.trim()
            return (
              <tr key={item.id}>
                <td className="print-col-item">
                  <span className="print-item-name">{base}</span>
                  {variant && <span className="print-item-variant">{variant}</span>}
                </td>
                <td className="print-col-sku" style={MONO}>
                  {item.sku ?? '—'}
                </td>
                <td className="print-col-qty" style={TABNUM}>
                  {item.quantity}
                </td>
                <td className="print-col-price" style={TABNUM}>
                  {formatNPR(item.price, locale)}
                </td>
                <td className="print-col-total" style={TABNUM}>
                  {formatNPR(item.price * item.quantity, locale)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="print-totals">
        <div className="print-totals-line">
          <span>{t('seller.orders.invoiceTaxable')}</span>
          <span style={TABNUM}>{formatNPR(Math.round(taxable), locale)}</span>
        </div>
        <div className="print-totals-line">
          <span>{t('seller.orders.invoiceVat')}</span>
          <span style={TABNUM}>{formatNPR(Math.round(vat), locale)}</span>
        </div>
        <div className="print-totals-line">
          <span>{t('seller.orders.slipDelivery')}</span>
          <span style={TABNUM}>{formatNPR(deliveryFee, locale)}</span>
        </div>
        <div className="print-totals-line print-totals-grand">
          <span>{t('seller.orders.slipTotal')}</span>
          <span style={TABNUM}>{formatNPR(order.total, locale)}</span>
        </div>
      </div>

      <footer className="print-page-foot">
        <p className="print-meta">{t('seller.orders.invoiceFooter')}</p>
      </footer>
    </section>
  )
}

export interface PrintDocsSheetProps {
  orders: SellerSubOrder[]
  onClose: () => void
  onPrinted?: (subOrderIds: string[]) => void
  t: (k: string, o?: Record<string, unknown>) => string
}

export function PrintDocsSheet({ orders, onClose, onPrinted, t }: PrintDocsSheetProps) {
  const reduced = useReducedMotion()
  const [tab, setTab] = useState<DocTab>('both')
  const [phase, setPhase] = useState<Phase>('preparing')
  const [banner, setBanner] = useState<string | null>(null)
  const markPrinted = useMarkLabelPrinted()

  // Simulate "generate" delay: preparing → ready (respects reduced motion via short duration).
  useEffect(() => {
    setPhase('preparing')
    const id = setTimeout(() => setPhase('ready'), reduced ? 150 : 550)
    return () => clearTimeout(id)
  }, [orders, reduced])

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ids = useMemo(() => orders.map(o => o.subOrderId), [orders])

  const announce = useCallback((msg: string) => {
    setBanner(msg)
    setTimeout(() => setBanner(null), 3000)
  }, [])

  const handlePrint = useCallback(() => {
    if (phase !== 'ready') return
    setPhase('preparing')
    // Defer so the busy state paints before the print dialog blocks.
    setTimeout(() => {
      try {
        window.print()
      } catch {
        // noop — some embedded webviews block print
      }
      markPrinted.mutate({ subOrderIds: ids })
      setPhase('ready')
      announce(
        orders.length > 1
          ? t('seller.orders.printDocsBulkResult', { count: orders.length })
          : t('seller.orders.printDocsPrintedBanner'),
      )
      onPrinted?.(ids)
    }, 50)
  }, [phase, ids, markPrinted, announce, orders.length, t, onPrinted])

  const handleExport = useCallback(() => {
    if (phase !== 'ready') return
    setPhase('preparing')
    setTimeout(() => {
      setPhase('ready')
      markPrinted.mutate({ subOrderIds: ids })
      announce(t('seller.orders.printDocsExportedBanner'))
      onPrinted?.(ids)
    }, 600)
  }, [phase, ids, markPrinted, announce, t, onPrinted])

  const handleShare = useCallback(() => {
    if (phase !== 'ready') return
    setPhase('preparing')
    setTimeout(() => {
      setPhase('ready')
      markPrinted.mutate({ subOrderIds: ids })
      announce(t('seller.orders.printDocsExportedBanner'))
      onPrinted?.(ids)
    }, 600)
  }, [phase, ids, markPrinted, announce, t, onPrinted])

  const tabs: { key: DocTab; label: string; Icon: typeof FileText }[] = [
    { key: 'slip', label: t('seller.orders.printDocsTabSlip'), Icon: FileText },
    { key: 'label', label: t('seller.orders.printDocsTabLabel'), Icon: Package },
    { key: 'invoice', label: t('seller.orders.printDocsTabInvoice'), Icon: FileText },
    { key: 'both', label: t('seller.orders.printDocsTabBoth'), Icon: Boxes },
  ]

  const busy = phase !== 'ready'

  return (
    <div
      className="print-docs-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-docs-title"
    >
      <div className="print-docs-backdrop" onClick={onClose} />

      {/* Live region: announce bulk/single print result + phase */}
      <span className="sr-only" role="status" aria-live="assertive">
        {banner ??
          (phase === 'preparing'
            ? t('seller.orders.printDocsPreparing')
            : t('seller.orders.printDocsReady'))}
      </span>

      <div className="print-docs-shell">
        {/* Toolbar — hidden in print */}
        <div className="print-docs-toolbar">
          <div className="print-docs-toolbar-left">
            <div className="print-docs-titles">
              <h2 id="print-docs-title" className="print-docs-title">
                {t('seller.orders.printDocsTitle')}
              </h2>
              <p className="print-docs-subtitle">
                {t('seller.orders.printDocsSubtitle')} ·{' '}
                {t('seller.orders.printDocsCount', { count: orders.length })}
              </p>
            </div>
            <div
              className="print-docs-tabs"
              role="tablist"
              aria-label={t('seller.orders.printDocsTitle')}
            >
              {tabs.map(tb => {
                const active = tab === tb.key
                const Icon = tb.Icon
                return (
                  <button
                    key={tb.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(tb.key)}
                    className={`print-docs-tab ${active ? 'print-docs-tab-active' : ''}`}
                  >
                    <Icon size={15} />
                    {tb.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="print-docs-toolbar-right">
            <div className="print-docs-phase" aria-hidden="true">
              {phase === 'preparing' ? (
                <span className="print-docs-phase-prep">
                  <Loader2 size={14} className="animate-spin" />
                  {t('seller.orders.printDocsPreparing')}
                </span>
              ) : (
                <span className="print-docs-phase-ready">
                  <Check size={14} />
                  {t('seller.orders.printDocsReady')}
                </span>
              )}
            </div>

            <button
              onClick={handleShare}
              disabled={busy}
              className="print-docs-btn print-docs-btn-ghost md:hidden"
              aria-label={t('seller.orders.printDocsShareAria')}
            >
              <Share2 size={16} />
              <span className="sr-only">{t('seller.orders.printDocsShare')}</span>
            </button>

            <button
              onClick={handleExport}
              disabled={busy}
              className="print-docs-btn print-docs-btn-ghost"
              aria-label={t('seller.orders.printDocsExportAria')}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              <span className="hidden sm:inline">{t('seller.orders.printDocsExport')}</span>
            </button>

            <motion.button
              whileTap={reduced ? undefined : { scale: 0.97 }}
              onClick={handlePrint}
              disabled={busy}
              className="print-docs-btn print-docs-btn-primary"
              aria-label={t('seller.orders.printDocsPrintAria')}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              {t('seller.orders.printDocsPrint')}
            </motion.button>

            <button
              onClick={onClose}
              className="print-docs-btn print-docs-btn-icon"
              aria-label={t('seller.orders.printDocsCloseAria')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Banner (non-print) */}
        <AnimatePresence>
          {banner && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: duration.normal / 1000, ease: easing.easeOut }
              }
              className="print-docs-banner"
              role="status"
            >
              <Check size={16} strokeWidth={3} />
              {banner}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview / print area */}
        <div className="print-docs-scroll">
          <div className="print-area">
            {orders.map(order => (
              <div key={order.subOrderId} className="print-doc-group">
                {(tab === 'slip' || tab === 'both') && <PackingSlipPage order={order} t={t} />}
                {(tab === 'label' || tab === 'both') && <ShippingLabelPage order={order} t={t} />}
                {tab === 'invoice' && <TaxInvoicePage order={order} t={t} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintDocsSheet
