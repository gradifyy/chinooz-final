'use client'

import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X, Upload, FileText } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { CsvStockRow } from '@chinooz/types'

export interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (rows: CsvStockRow[]) => void
  isPending?: boolean
}

export default function CsvImportModal({ open, onClose, onImport, isPending }: CsvImportModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CsvStockRow[]>([])
  const [fileName, setFileName] = useState('')

  const parseCsv = (text: string): CsvStockRow[] => {
    const lines = text.trim().split('\n')
    const result: CsvStockRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const [sku, stockCount, threshold] = lines[i].split(',').map(s => s.trim())
      if (sku && stockCount != null) {
        result.push({
          sku,
          stockCount: Number(stockCount) || 0,
          lowStockThreshold: threshold ? Number(threshold) : undefined,
        })
      }
    }
    return result
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      setRows(parseCsv(text))
    }
    reader.readAsText(file)
  }

  const handleClose = () => {
    setRows([])
    setFileName('')
    onClose()
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
          <div className="absolute inset-0 bg-overlay" onClick={handleClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('seller.inventory.importTitle')}
            initial={reduced ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-surface p-5 shadow-xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-text">{t('seller.inventory.importTitle')}</h2>
              <button onClick={handleClose} aria-label={t('seller.inventory.cancel')} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>

            {/* Upload card */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary p-8 flex flex-col items-center gap-2 transition-colors"
            >
              <Upload size={28} className="text-text-muted" />
              <span className="text-sm text-text-muted">{t('seller.inventory.importDrop')}</span>
              {fileName && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mt-1">
                  <FileText size={13} />
                  {fileName}
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

            {/* Preview table */}
            {rows.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-text-muted mb-2">{t('seller.inventory.importPreview')}</p>
                <div className="rounded-lg border border-border-light overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-sm" role="table">
                    <thead className="sticky top-0 bg-background border-b border-border">
                      <tr>
                        <th scope="col" className="text-left px-3 py-2 text-xs font-semibold text-text-muted">SKU</th>
                        <th scope="col" className="text-right px-3 py-2 text-xs font-semibold text-text-muted">Stock</th>
                        <th scope="col" className="text-right px-3 py-2 text-xs font-semibold text-text-muted">Threshold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b border-border-light last:border-b-0">
                          <td className="px-3 py-2 text-xs font-mono text-text-secondary">{r.sku}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-text" style={{ fontVariant: 'tabular-nums' }}>{r.stockCount}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-text-muted" style={{ fontVariant: 'tabular-nums' }}>{r.lowStockThreshold ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 20 && (
                  <p className="text-xs text-text-muted mt-1">+{rows.length - 20} more rows</p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={handleClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text">
                {t('seller.inventory.cancel')}
              </button>
              <button
                onClick={() => onImport(rows)}
                disabled={rows.length === 0 || isPending}
                className="flex-1 h-10 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              >
                {t('seller.inventory.importApply', { count: rows.length })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
