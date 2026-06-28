'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'
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

export interface BulkConfirmModalProps {
  open: boolean
  action: BulkStockAction
  count: number
  onConfirm: (value: number | undefined, reason: StockEditReason) => void
  onCancel: () => void
}

export default function BulkConfirmModal({ open, action, count, onConfirm, onCancel }: BulkConfirmModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [value, setValue] = useState('')
  const [reason, setReason] = useState<StockEditReason>('restock')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setValue(''); setReason('restock'); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  const isDestructive = action === 'mark_out'
  const needsValue = action === 'set' || action === 'adjust' || action === 'threshold'
  const numValue = Number(value.replace(/[^0-9-]/g, '')) || 0
  const canConfirm = !needsValue || value !== ''

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(needsValue ? numValue : undefined, reason)
  }

  const titleKey = isDestructive ? 'seller.inventory.bulkConfirmDestructive' : 'seller.inventory.bulkConfirm'
  const actionLabelKey: Record<BulkStockAction, string> = {
    set: 'seller.inventory.bulkSet',
    adjust: 'seller.inventory.bulkAdjust',
    threshold: 'seller.inventory.bulkThreshold',
    mark_out: 'seller.inventory.bulkMarkOut',
  }

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
          <div className="absolute inset-0 bg-overlay" onClick={onCancel} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t(titleKey, { count })}
            initial={reduced ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isDestructive && <AlertTriangle size={18} className="text-error" />}
                <h2 className="text-base font-bold text-text">
                  {t(titleKey, { count })}
                </h2>
              </div>
              <button onClick={onCancel} aria-label={t('seller.inventory.cancel')} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">
              {t(actionLabelKey[action])}
              {isDestructive && (
                <span className="block mt-2 text-error font-medium">{t('seller.inventory.bulkConfirmDestructiveBody')}</span>
              )}
            </p>

            {needsValue && (
              <div className="mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={e => setValue(e.target.value.replace(/[^0-9-]/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                  placeholder={t('seller.inventory.bulkValue')}
                  aria-label={t('seller.inventory.bulkValue')}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
                  style={{ fontVariant: 'tabular-nums' }}
                />
              </div>
            )}

            {/* Reason chips */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-text-muted mb-1.5">{t('seller.inventory.reason')}</p>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    aria-pressed={reason === r}
                    aria-label={t(REASON_LABELS[r])}
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      reason === r ? 'bg-primary text-white' : 'bg-background text-text-secondary border border-border hover:border-primary',
                    ].join(' ')}
                  >
                    {t(REASON_LABELS[r])}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text">
                {t('seller.inventory.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={[
                  'flex-1 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity',
                  isDestructive ? 'bg-error' : 'bg-primary',
                ].join(' ')}
              >
                {t('seller.inventory.bulkConfirm', { count })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
