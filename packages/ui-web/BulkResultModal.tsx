'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertCircle, X, RotateCw, CheckCircle } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'

export interface FailedRow {
  sku: string
  productName: string
  error?: string
}

export interface BulkResultModalProps {
  open: boolean
  failedRows: FailedRow[]
  total: number
  updated: number
  onRetryFailed: () => void
  onDismiss: () => void
}

export default function BulkResultModal({
  open, failedRows, total, updated, onRetryFailed, onDismiss,
}: BulkResultModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const failed = failedRows.length

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-overlay" onClick={onDismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('seller.inventory.bulkPartialTitle')}
            initial={reduced ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-warning" />
                <h2 className="text-base font-bold text-text">{t('seller.inventory.bulkPartialTitle')}</h2>
              </div>
              <button onClick={onDismiss} aria-label={t('seller.inventory.bulkPartialDismiss')} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                <CheckCircle size={14} />
                {updated} OK
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-error">
                <AlertCircle size={14} />
                {failed} failed
              </span>
            </div>

            <p className="text-sm text-text-muted mb-3">
              {t('seller.inventory.bulkPartialSub', { failed, total })}
            </p>

            <ul className="space-y-1.5 mb-4">
              {failedRows.map((row) => (
                <li
                  key={row.sku}
                  className="flex items-center gap-3 rounded-lg border border-error/20 bg-error-light/50 px-3 py-2.5"
                >
                  <AlertCircle size={14} className="text-error flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text truncate">{row.productName}</p>
                    <p className="text-xs text-text-muted font-mono truncate">{row.sku}</p>
                  </div>
                  {row.error && <span className="text-xs text-error">{row.error}</span>}
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <button onClick={onDismiss} className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text">
                {t('seller.inventory.bulkPartialDismiss')}
              </button>
              <button
                onClick={onRetryFailed}
                className="flex-1 h-10 rounded-lg bg-primary text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5"
              >
                <RotateCw size={15} />
                {t('seller.inventory.bulkPartialRetry')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
