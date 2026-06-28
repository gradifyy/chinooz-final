'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X, Layers, SlidersHorizontal, AlertTriangle, PackageX, Upload, Download } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { BulkStockAction } from '@chinooz/types'

export interface BulkBarProps {
  selectedCount: number
  onAction: (action: BulkStockAction) => void
  onClear: () => void
  onExport?: () => void
  onImport?: () => void
}

export default function BulkBar({ selectedCount, onAction, onClear, onExport, onImport }: BulkBarProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any

  const actions: { key: BulkStockAction; labelKey: string; Icon: IconType }[] = [
    { key: 'set', labelKey: 'seller.inventory.bulkSet', Icon: SlidersHorizontal },
    { key: 'adjust', labelKey: 'seller.inventory.bulkAdjust', Icon: Layers },
    { key: 'threshold', labelKey: 'seller.inventory.bulkThreshold', Icon: SlidersHorizontal },
    { key: 'mark_out', labelKey: 'seller.inventory.bulkMarkOut', Icon: PackageX },
  ]

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          role="toolbar"
          aria-label={t('seller.inventory.selected', { count: selectedCount })}
          initial={reduced ? { opacity: 1 } : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 20, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface shadow-e2 px-4 py-2.5 flex-wrap"
        >
          <span className="text-sm font-semibold text-text tabular-nums" style={{ fontVariant: 'tabular-nums' }}>
            {t('seller.inventory.selected', { count: selectedCount })}
          </span>

          <div className="h-5 w-px bg-border-light mx-1" />

          {actions.map(({ key, labelKey, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onAction(key)}
              aria-label={t(labelKey)}
              className={[
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
                key === 'mark_out'
                  ? 'text-error border border-error/30 hover:bg-error-light'
                  : 'text-text border border-border hover:bg-background',
              ].join(' ')}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t(labelKey)}</span>
            </button>
          ))}

          {onImport && (
            <button
              type="button"
              onClick={onImport}
              aria-label={t('seller.inventory.import')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-text-muted border border-border hover:bg-background transition-colors"
            >
              <Upload size={14} />
              <span className="hidden lg:inline">{t('seller.inventory.import')}</span>
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              aria-label={t('seller.inventory.export')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-text-muted border border-border hover:bg-background transition-colors"
            >
              <Download size={14} />
              <span className="hidden lg:inline">{t('seller.inventory.export')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            aria-label={t('seller.inventory.clearAria')}
            className="ml-auto inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            <X size={14} />
            <span>{t('seller.inventory.clear')}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
