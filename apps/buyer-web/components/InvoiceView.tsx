'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
import { motion, AnimatePresence } from 'framer-motion'
import type { OrderInvoice } from '@chinooz/types'

interface InvoiceViewProps {
  visible: boolean
  invoice: OrderInvoice | null
  onClose: () => void
}

export default function InvoiceView({ visible, invoice, onClose }: InvoiceViewProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  if (!invoice) return null

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${t('orderActions.invoiceFor')} ${invoice.orderId}`}>
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="relative bg-background rounded-2xl w-full max-w-[600px] max-h-[85vh] overflow-auto shadow-xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-text">{t('orderActions.invoiceTitle')}</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface transition-colors text-text-muted text-lg"
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Company header */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-text">{t('orderActions.companyName')}</h3>
                <p className="text-sm text-text-muted">{t('orderActions.companyAddress')}</p>
                <p className="text-sm text-text-muted">{t('orderActions.companyPan')}</p>
                <div className="inline-block mt-2 bg-primary-50 px-4 py-1.5 rounded-full">
                  <span className="text-sm font-bold text-primary">{t('orderActions.taxInvoice')}</span>
                </div>
              </div>

              {/* Invoice details */}
              <div className="bg-surface rounded-xl border border-border-light p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">{t('orders.orderId')}</span>
                  <span className="text-sm font-semibold text-text tabular-nums">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">{t('orders.orderDate')}</span>
                  <span className="text-sm text-text">
                    {new Date(invoice.issuedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Bill to */}
              <div className="bg-surface rounded-xl border border-border-light p-4 space-y-1">
                <p className="text-sm font-semibold text-text-muted">{t('orderActions.billTo')}</p>
                <p className="text-base font-semibold text-text">{invoice.customerName}</p>
                <p className="text-sm text-text-muted">{invoice.customerAddress}</p>
              </div>

              {/* Items table */}
              <div className="bg-surface rounded-xl border border-border-light p-4">
                {/* Table header */}
                <div className="flex pb-2 border-b border-border-light mb-2">
                  <span className="flex-1 text-xs font-semibold text-text-muted">Item</span>
                  <span className="w-10 text-xs font-semibold text-text-muted text-center">Qty</span>
                  <span className="w-20 text-xs font-semibold text-text-muted text-right">Price</span>
                  <span className="w-20 text-xs font-semibold text-text-muted text-right">Total</span>
                </div>

                {/* Table rows */}
                {invoice.items.map((item, index) => (
                  <div key={index} className="flex items-center py-1.5">
                    <span className="flex-1 text-sm text-text" title={item.name}>{item.name}</span>
                    <span className="w-10 text-sm text-text text-center tabular-nums">{item.quantity}</span>
                    <span className="w-20 text-sm text-text text-right tabular-nums">{formatNPR(item.unitPrice)}</span>
                    <span className="w-20 text-sm font-semibold text-text text-right tabular-nums">{formatNPR(item.total)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-surface rounded-xl border border-border-light p-4 space-y-2">
                <SummaryLine label={t('orderActions.subtotal')} value={invoice.subtotal} />
                <SummaryLine label={t('orderActions.vat')} value={invoice.vat} muted />
                <SummaryLine label={t('orderActions.deliveryFee')} value={invoice.deliveryFee} />
                {invoice.discount > 0 && (
                  <SummaryLine label={t('orderActions.discount')} value={-invoice.discount} muted />
                )}
                <div className="h-px bg-border-light my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-text">{t('orderActions.grandTotal')}</span>
                  <span className="text-lg font-bold text-primary tabular-nums">{formatNPR(invoice.grandTotal)}</span>
                </div>
              </div>

              {/* Download PDF button (mock) */}
              <button
                onClick={() => {}}
                className="w-full h-12 rounded-xl border-[1.5px] border-primary text-primary font-bold text-base hover:bg-primary-50 transition-colors"
                aria-label={t('orderActions.downloadPdf')}
              >
                {t('orderActions.downloadPdf')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function SummaryLine({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? 'text-text-muted' : 'text-text'}`}>{label}</span>
      <span className="text-sm text-text tabular-nums">{formatNPR(Math.abs(value))}</span>
    </div>
  )
}
