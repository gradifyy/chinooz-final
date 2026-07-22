'use client'

import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X, Upload, FileText, Check } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { useBulkCreateProducts } from '@chinooz/hooks'
import type { BulkListingRow, BulkListingResult } from '@chinooz/mock-data'

export interface BulkListingModalProps {
  open: boolean
  onClose: () => void
}

const TEMPLATE = 'name,price,stock,categoryId,sku,description\nWireless Mouse,1200,50,,SKU-WM-01,Ergonomic wireless mouse\nUSB-C Cable,450,200,,SKU-UC-02,1m fast-charge cable'

/**
 * Catalog bulk listing: parse a product CSV (name, price, stock, categoryId,
 * sku, description) and create draft products in one batch. Closes the
 * seller-web gap where only single-product creation existed.
 */
export default function BulkListingModal({ open, onClose }: BulkListingModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<BulkListingRow[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<BulkListingResult | null>(null)
  const bulkCreate = useBulkCreateProducts()

  const parseCsv = (text: string): BulkListingRow[] => {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length === 0) return []
    const header = lines[0].toLowerCase().split(',').map(s => s.trim())
    const idx = (key: string) => header.indexOf(key)
    const iName = idx('name'), iPrice = idx('price'), iStock = idx('stock')
    const iCat = idx('categoryid'), iSku = idx('sku'), iDesc = idx('description')
    const out: BulkListingRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim())
      if (cols.every(c => !c)) continue
      out.push({
        name: iName >= 0 ? cols[iName] ?? '' : cols[0] ?? '',
        price: Number(iPrice >= 0 ? cols[iPrice] : cols[1]) || 0,
        stockCount: Number(iStock >= 0 ? cols[iStock] : cols[2]) || 0,
        categoryId: iCat >= 0 ? cols[iCat] || undefined : undefined,
        sku: iSku >= 0 ? cols[iSku] || undefined : undefined,
        description: iDesc >= 0 ? cols[iDesc] || undefined : undefined,
      })
    }
    return out
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => setRows(parseCsv(String(reader.result)))
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'chinooz-bulk-listing-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    setRows([])
    setFileName('')
    setResult(null)
    onClose()
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    const res = await bulkCreate.mutateAsync(rows)
    setResult(res)
  }

  const validCount = rows.filter(r => r.name && r.price > 0).length

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
            aria-label={t('seller.products.bulkTitle')}
            initial={reduced ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-surface p-5 shadow-xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-text">{t('seller.products.bulkTitle')}</h2>
              <button onClick={handleClose} aria-label={t('seller.products.bulkCancel')} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">{t('seller.products.bulkSubtitle')}</p>

            {result ? (
              <div className="rounded-xl border border-border-light p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Check size={24} className="text-success" />
                </div>
                <p className="text-base font-semibold text-text">
                  {t('seller.products.bulkDone', { count: result.created })}
                </p>
                {result.failed > 0 && (
                  <p className="text-sm text-error mt-1">{t('seller.products.bulkSkipped', { count: result.failed })}</p>
                )}
                <button onClick={handleClose} className="mt-4 h-10 px-5 rounded-lg bg-primary text-sm font-semibold text-white">
                  {t('seller.products.bulkClose')}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary p-8 flex flex-col items-center gap-2 transition-colors"
                >
                  <Upload size={28} className="text-text-muted" />
                  <span className="text-sm text-text-muted">{t('seller.products.bulkDrop')}</span>
                  {fileName && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mt-1">
                      <FileText size={13} />
                      {fileName}
                    </span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

                <button onClick={downloadTemplate} className="mt-2 text-xs font-semibold text-primary hover:underline">
                  {t('seller.products.bulkTemplate')}
                </button>

                {rows.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-text-muted mb-2">
                      {t('seller.products.bulkPreview', { count: rows.length })}
                    </p>
                    <div className="rounded-lg border border-border-light overflow-hidden max-h-48 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background border-b border-border">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">{t('seller.products.colProduct')}</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted">{t('seller.products.colPrice')}</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted">{t('seller.products.colStock')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 20).map((r, i) => {
                            const invalid = !r.name || !(r.price > 0)
                            return (
                              <tr key={i} className={`border-b border-border-light last:border-b-0 ${invalid ? 'bg-error/5' : ''}`}>
                                <td className="px-3 py-2 text-xs text-text truncate max-w-[200px]">{r.name || '—'}</td>
                                <td className="px-3 py-2 text-right text-xs tabular-nums text-text">{r.price || 0}</td>
                                <td className="px-3 py-2 text-right text-xs tabular-nums text-text-muted">{r.stockCount}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 20 && <p className="text-xs text-text-muted mt-1">+{rows.length - 20} more rows</p>}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button onClick={handleClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text">
                    {t('seller.products.bulkCancel')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validCount === 0 || bulkCreate.isPending}
                    className="flex-1 h-10 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                  >
                    {bulkCreate.isPending ? t('common.loading') : t('seller.products.bulkApply', { count: validCount })}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
