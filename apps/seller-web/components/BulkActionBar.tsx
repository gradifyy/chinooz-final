'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Power, PowerOff, Trash2, Tag, DollarSign, Package, Check, AlertCircle } from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import type { SellerProduct, SellerProductStatus } from '@chinooz/types'

export type BulkAction =
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'setCategory'
  | 'adjustPrice'
  | 'updateStock'

export interface BulkActionResult {
  action: BulkAction
  count: number
  success: boolean
}

export interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  indeterminate: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onApply: (action: BulkAction, params?: BulkActionParams) => Promise<boolean>
  categories?: { id: string; name: string }[]
}

export interface BulkActionParams {
  categoryId?: string
  priceMode?: 'percent' | 'amount'
  priceValue?: number
  stockValue?: number
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 25, mass: 0.8 }

export function BulkActionBar({
  selectedCount,
  totalCount,
  allSelected,
  indeterminate,
  onSelectAll,
  onClearSelection,
  onApply,
  categories,
}: BulkActionBarProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [activeDialog, setActiveDialog] = useState<BulkAction | null>(null)
  const [snackbar, setSnackbar] = useState<{ message: string; isError: boolean } | null>(null)
  const [applying, setApplying] = useState(false)

  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (snackbarTimer.current) clearTimeout(snackbarTimer.current) }
  }, [])

  const showSnackbar = (message: string, isError = false) => {
    setSnackbar({ message, isError })
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current)
    snackbarTimer.current = setTimeout(() => setSnackbar(null), 3000)
  }

  const handleApply = async (action: BulkAction, params?: BulkActionParams) => {
    setApplying(true)
    try {
      const ok = await onApply(action, params)
      const resultKey =
        action === 'delete' ? 'seller.products.bulkResultDeleted'
        : action === 'activate' ? 'seller.products.bulkResultActivated'
        : action === 'deactivate' ? 'seller.products.bulkResultDeactivated'
        : 'seller.products.bulkResultUpdated'
      if (ok) {
        showSnackbar(t(resultKey, { count: selectedCount }))
      } else {
        showSnackbar(t('seller.products.bulkError'), true)
      }
      setActiveDialog(null)
    } finally {
      setApplying(false)
    }
  }

  const actions: { key: BulkAction; label: string; ariaLabel: string; icon: React.ReactNode; danger?: boolean }[] = [
    { key: 'activate', label: t('seller.products.bulkActivate'), ariaLabel: t('seller.products.bulkActivateAria'), icon: <Power size={15} /> },
    { key: 'deactivate', label: t('seller.products.bulkDeactivate'), ariaLabel: t('seller.products.bulkDeactivateAria'), icon: <PowerOff size={15} /> },
    { key: 'setCategory', label: t('seller.products.bulkSetCategory'), ariaLabel: t('seller.products.bulkSetCategoryAria'), icon: <Tag size={15} /> },
    { key: 'adjustPrice', label: t('seller.products.bulkAdjustPrice'), ariaLabel: t('seller.products.bulkAdjustPriceAria'), icon: <DollarSign size={15} /> },
    { key: 'updateStock', label: t('seller.products.bulkUpdateStock'), ariaLabel: t('seller.products.bulkUpdateStockAria'), icon: <Package size={15} /> },
    { key: 'delete', label: t('seller.products.bulkDelete'), ariaLabel: t('seller.products.bulkDeleteAria'), icon: <Trash2 size={15} />, danger: true },
  ]

  return (
    <>
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={reduced ? { duration: 0 } : SPRING}
            className="sticky bottom-4 z-dropdown"
          >
            <div
              role="toolbar"
              aria-label={t('seller.products.bulkBarAria', { count: selectedCount })}
              className="bg-surface border border-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 flex-wrap"
            >
              {/* Select-all checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = indeterminate }}
                  onChange={onSelectAll}
                  aria-label={t('seller.products.selectAllAria')}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="text-[13px] font-semibold text-text">
                  {t('seller.products.bulkSelected', { count: selectedCount })}
                </span>
              </label>

              <div className="h-6 w-px bg-border" />

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                {actions.map(a => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setActiveDialog(a.key)}
                    aria-label={a.ariaLabel}
                    disabled={applying}
                    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 ${
                      a.danger
                        ? 'text-error hover:bg-error/10'
                        : 'text-text-secondary hover:bg-background'
                    }`}
                  >
                    <span className={a.danger ? 'text-error' : 'text-text-muted'} aria-hidden="true">{a.icon}</span>
                    <span className="hidden lg:inline">{a.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Clear */}
              <button
                type="button"
                onClick={onClearSelection}
                aria-label={t('seller.products.clearSelectionAria')}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-text-muted hover:text-text transition-colors shrink-0"
              >
                <X size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{t('seller.products.clearSelection')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <AnimatePresence>
        {activeDialog && (
          <BulkDialog
            action={activeDialog}
            count={selectedCount}
            categories={categories}
            reduced={reduced}
            applying={applying}
            onApply={(params) => handleApply(activeDialog, params)}
            onCancel={() => setActiveDialog(null)}
          />
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast"
            role="status"
            aria-live="polite"
          >
            <div className={`inline-flex items-center gap-2 rounded-lg shadow-xl px-4 py-3 text-[14px] font-semibold ${
              snackbar.isError ? 'bg-error text-white' : 'bg-surface text-text border border-border'
            }`}>
              {snackbar.isError ? (
                <AlertCircle size={18} aria-hidden="true" />
              ) : (
                <Check size={18} className="text-success" aria-hidden="true" />
              )}
              {snackbar.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ---- Dialog ----

function BulkDialog({
  action,
  count,
  categories,
  reduced,
  applying,
  onApply,
  onCancel,
}: {
  action: BulkAction
  count: number
  categories?: { id: string; name: string }[]
  reduced: boolean
  applying: boolean
  onApply: (params?: BulkActionParams) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Simple focus trap
  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>('button, input, select')
    focusable[0]?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key === 'Tab' && focusable.length > 0) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  // Input state
  const [categoryId, setCategoryId] = useState('')
  const [priceMode, setPriceMode] = useState<'percent' | 'amount'>('percent')
  const [priceValue, setPriceValue] = useState('')
  const [stockValue, setStockValue] = useState('')

  const isDelete = action === 'delete'
  const isConfirm = action === 'activate' || action === 'deactivate' || action === 'delete'
  const isInput = action === 'setCategory' || action === 'adjustPrice' || action === 'updateStock'

  const title =
    action === 'delete' ? t('seller.products.bulkDeleteConfirm', { count })
    : action === 'activate' ? t('seller.products.bulkActivateConfirm', { count })
    : action === 'deactivate' ? t('seller.products.bulkDeactivateConfirm', { count })
    : action === 'setCategory' ? t('seller.products.bulkSetCategory')
    : action === 'adjustPrice' ? t('seller.products.bulkAdjustPrice')
    : t('seller.products.bulkUpdateStock')

  const body =
    action === 'delete' ? t('seller.products.bulkDeleteConfirmBody', { count })
    : action === 'deactivate' ? t('seller.products.bulkDeactivateConfirmBody')
    : ''

  const canApply = (() => {
    if (action === 'setCategory') return !!categoryId
    if (action === 'adjustPrice') return priceValue !== '' && !isNaN(Number(priceValue))
    if (action === 'updateStock') return stockValue !== '' && !isNaN(Number(stockValue))
    return true
  })()

  const handleApply = () => {
    if (!canApply) return
    const params: BulkActionParams = {}
    if (action === 'setCategory') params.categoryId = categoryId
    if (action === 'adjustPrice') { params.priceMode = priceMode; params.priceValue = Number(priceValue) }
    if (action === 'updateStock') params.stockValue = Math.max(0, Math.floor(Number(stockValue))) 
    onApply(isConfirm ? undefined : params)
  }

  const confirmLabel =
    action === 'delete' ? t('seller.products.bulkDeleteConfirmBtn', { count })
    : t('seller.products.bulkApply')

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onCancel}
      />
      <motion.div
        ref={dialogRef}
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={reduced ? { duration: 0 } : SPRING}
        className="relative bg-surface rounded-xl p-5 w-full max-w-[440px] shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-text mb-2">{title}</h2>
        {body && <p className="text-[14px] text-text-muted leading-5 mb-4">{body}</p>}

        {action === 'setCategory' && (
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-text mb-2">{t('seller.products.bulkCategorySelect')}</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              aria-label={t('seller.products.bulkCategorySelect')}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-[14px] text-text outline-none focus:border-primary transition-colors"
            >
              <option value="">{t('seller.products.bulkCategorySelect')}</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {action === 'adjustPrice' && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-text mb-2">{t('seller.products.bulkPriceMode')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriceMode('percent')}
                  className={`flex-1 h-10 rounded-md border text-[14px] font-medium transition-colors ${priceMode === 'percent' ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-background text-text'}`}
                >
                  {t('seller.products.bulkPricePercent')}
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode('amount')}
                  className={`flex-1 h-10 rounded-md border text-[14px] font-medium transition-colors ${priceMode === 'amount' ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-background text-text'}`}
                >
                  {t('seller.products.bulkPriceAmount')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-text mb-2">{t('seller.products.bulkPriceValue')}</label>
              <input
                type="number"
                inputMode="numeric"
                value={priceValue}
                onChange={e => setPriceValue(e.target.value)}
                placeholder={priceMode === 'percent' ? '10' : '100'}
                aria-label={t('seller.products.bulkPriceValue')}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-[14px] text-text outline-none focus:border-primary transition-colors"
              />
              <p className="text-[12px] text-text-muted mt-1.5">
                {priceMode === 'percent' ? t('seller.products.bulkPricePercentHint') : t('seller.products.bulkPriceAmountHint')}
              </p>
            </div>
          </div>
        )}

        {action === 'updateStock' && (
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-text mb-2">{t('seller.products.bulkStockValue')}</label>
            <input
              type="number"
              inputMode="numeric"
              value={stockValue}
              onChange={e => setStockValue(e.target.value)}
              placeholder="0"
              aria-label={t('seller.products.bulkStockValue')}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-[14px] text-text tabular-nums outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="px-4 h-10 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors disabled:opacity-50"
          >
            {t('seller.products.bulkCancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !canApply}
            className={`px-4 h-10 rounded-md text-[14px] font-semibold text-white transition-colors disabled:opacity-50 ${isDelete ? 'bg-error hover:opacity-90' : 'bg-primary hover:opacity-90'}`}
          >
            {applying ? '…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
