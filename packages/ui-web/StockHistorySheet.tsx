'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X, History, TrendingUp, TrendingDown, Bell, BellOff } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'
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

export interface StockHistorySheetProps {
  open: boolean
  variant: SellerInventoryVariant | null
  history: StockHistoryEntry[]
  restockReminder?: boolean
  onToggleReminder?: (enabled: boolean) => void
  onClose: () => void
  isPending?: boolean
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function StockHistorySheet({
  open, variant, history, restockReminder, onToggleReminder, onClose, isPending,
}: StockHistorySheetProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {open && variant && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-overlay" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('seller.inventory.historyTitle')}
            initial={reduced ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-text-muted" />
                <h2 className="text-base font-bold text-text">{t('seller.inventory.historyTitle')}</h2>
              </div>
              <button onClick={onClose} aria-label={t('seller.inventory.cancel')} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>

            {/* Variant info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-light">
              <SafeImage src={variant.image} alt={variant.productName ?? variant.name} width={36} height={36} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-border-light" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text truncate">{variant.productName ?? variant.name}</p>
                <p className="text-xs text-text-muted font-mono truncate">{variant.sku}</p>
              </div>
              <span className="text-sm font-bold text-text tabular-nums" style={{ fontVariant: 'tabular-nums' }}>
                {variant.stockCount}
              </span>
            </div>

            {/* Restock reminder toggle */}
            {onToggleReminder && (
              <div className="flex items-center justify-between mb-4 rounded-lg bg-background px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {restockReminder ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-text-muted" />}
                  <div>
                    <p className="text-sm font-semibold text-text">{t('seller.inventory.restockReminder')}</p>
                    <p className="text-xs text-text-muted">{t('seller.inventory.restockReminderDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={restockReminder ?? false}
                  aria-label={t('seller.inventory.restockReminder')}
                  onClick={() => onToggleReminder(!restockReminder)}
                  disabled={isPending}
                  className={[
                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                    restockReminder ? 'bg-primary' : 'bg-border',
                  ].join(' ')}
                >
                  <span className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                    restockReminder ? 'translate-x-[22px]' : 'translate-x-0.5',
                  ].join(' ')} />
                </button>
              </div>
            )}

            {/* History timeline */}
            {history.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">{t('seller.inventory.historyEmpty')}</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border-light" />
                <div className="space-y-4">
                  {history.map((entry) => {
                    const isPositive = entry.delta > 0
                    const isNegative = entry.delta < 0
                    return (
                      <div
                        key={entry.id}
                        className="relative flex items-start gap-3"
                        aria-label={`${entry.delta > 0 ? '+' : ''}${entry.delta} ${t('seller.inventory.historyDelta', { delta: '' })}, ${t(REASON_LABELS[entry.reason])}, ${formatTimestamp(entry.createdAt)}`}
                      >
                        {/* Node */}
                        <div className={[
                          'relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                          isPositive ? 'bg-success-light' : isNegative ? 'bg-error-light' : 'bg-border-light',
                        ].join(' ')}>
                          {isPositive ? <TrendingUp size={12} className="text-success" /> : <TrendingDown size={12} className="text-error" />}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className={[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                              isPositive ? 'bg-success-light text-success' : isNegative ? 'bg-error-light text-error' : 'bg-background text-text-muted',
                            ].join(' ')} style={{ fontVariant: 'tabular-nums' }}>
                              {entry.delta > 0 ? '+' : ''}{entry.delta}
                            </span>
                            <span className="text-xs text-text-muted">{t(REASON_LABELS[entry.reason])}</span>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatTimestamp(entry.createdAt)} · {t('seller.inventory.historyBy', { who: t('seller.inventory.who') })}
                          </p>
                          {entry.note && <p className="text-xs text-text-secondary mt-0.5 italic">"{entry.note}"</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
