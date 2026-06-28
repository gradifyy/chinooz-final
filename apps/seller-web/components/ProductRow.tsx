'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Power,
  PowerOff,
  Trash2,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Minus,
  Plus,
} from 'lucide-react'
import { SafeImage, useReducedMotion } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import type { SellerProduct, SellerProductStatus } from '@chinooz/types'

export const LOW_STOCK_THRESHOLD = 10

export interface ProductRowProps {
  product: SellerProduct
  selected?: boolean
  selectable?: boolean
  onSelectChange?: (id: string, selected: boolean) => void
  onEdit?: (product: SellerProduct) => void
  onDuplicate?: (product: SellerProduct) => void
  onToggleActive?: (product: SellerProduct) => void
  onDelete?: (product: SellerProduct) => void
  onStockChange?: (product: SellerProduct, stock: number) => void
  threshold?: number
}

// ---- Status config (spec colors) ----

const STATUS_CFG: Record<SellerProductStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'seller.products.statusActive', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  draft: { label: 'seller.products.statusDraft', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  out_of_stock: { label: 'seller.products.statusOutOfStock', color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  archived: { label: 'seller.products.statusArchived', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
}

type StockLevel = 'in_stock' | 'low' | 'out'

function stockLevel(count: number, threshold: number): StockLevel {
  if (count <= 0) return 'out'
  if (count <= threshold) return 'low'
  return 'in_stock'
}

const STOCK_CFG: Record<StockLevel, { label: string; color: string; bg: string; Icon: any }> = {
  in_stock: { label: 'seller.products.stockInStock', color: '#16A34A', bg: 'rgba(22,163,74,0.10)', Icon: CheckCircle },
  low: { label: 'seller.products.stockLowStock', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', Icon: AlertTriangle },
  out: { label: 'seller.products.stockOutOfStock', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', Icon: XCircle },
}

// ---- Component ----

export function ProductRow({
  product,
  selected = false,
  selectable = false,
  onSelectChange,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onStockChange,
  threshold = LOW_STOCK_THRESHOLD,
}: ProductRowProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stockEditOpen, setStockEditOpen] = useState(false)
  const [stockValue, setStockValue] = useState(String(product.stockCount))
  const menuRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLTableRowElement>(null)

  const sLevel = stockLevel(product.stockCount, threshold)
  const sCfg = STOCK_CFG[sLevel]
  const stCfg = STATUS_CFG[product.status]
  const StockIcon = sCfg.Icon

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const rowAria = t('seller.products.rowAria', {
    name: product.name,
    price: formatNPR(product.price),
    stockLabel: t(sCfg.label),
    count: product.stockCount,
    status: t(stCfg.label),
  })

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click when clicking checkbox, menu, or interactive elements
    const target = e.target as HTMLElement
    if (target.closest('[data-stop-propagation]')) return
    onEdit?.(product)
  }

  const handleCheckboxChange = () => {
    onSelectChange?.(product.id, !selected)
  }

  const handleStockSave = () => {
    const n = Math.max(0, Math.floor(Number(stockValue) || 0))
    onStockChange?.(product, n)
    setStockEditOpen(false)
  }

  const isActive = product.status === 'active'
  const toggleLabel = isActive ? 'seller.products.actionDeactivate' : 'seller.products.actionActivate'
  const ToggleIcon = isActive ? PowerOff : Power

  return (
    <>
      <tr
        ref={rowRef}
        onClick={handleRowClick}
        className="group h-16 border-b border-border last:border-b-0 hover:bg-primary-50/40 transition-colors duration-150 cursor-pointer"
      >
        {/* Selection checkbox */}
        {selectable && (
          <td className="py-2 px-4 w-10" data-stop-propagation>
            <input
              type="checkbox"
              checked={selected}
              onChange={handleCheckboxChange}
              aria-label={t('seller.products.selectProductAria', { name: product.name })}
              aria-checked={selected}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2 accent-primary cursor-pointer"
            />
          </td>
        )}

        {/* Product: thumbnail + name + SKU */}
        <td className="py-2 px-4">
          <div className="flex items-center gap-3">
            <SafeImage
              src={product.image}
              alt={product.name}
              className="w-12 h-12 rounded-md object-cover bg-border-light shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-text truncate max-w-[260px] leading-tight">{product.name}</p>
              <p className="text-[12px] font-normal text-text-muted truncate max-w-[260px] font-mono leading-tight mt-0.5">
                {product.sku}
              </p>
            </div>
          </div>
        </td>

        {/* Category */}
        <td className="py-2 px-4">
          <span className="text-[12px] font-normal text-text-muted">{product.categoryName}</span>
        </td>

        {/* Price */}
        <td className="py-2 px-4 text-right">
          <span className="text-[14px] font-semibold text-text tabular-nums">{formatNPR(product.price)}</span>
          {product.compareAtPrice && (
            <span className="block text-[12px] text-text-tertiary line-through tabular-nums">{formatNPR(product.compareAtPrice)}</span>
          )}
        </td>

        {/* Stock — color-coded count + icon/label */}
        <td className="py-2 px-4">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold"
            style={{ backgroundColor: sCfg.bg, color: sCfg.color }}
          >
            <StockIcon size={13} className="shrink-0" aria-hidden="true" />
            {t(sCfg.label)}
          </span>
          <span
            className="ml-1.5 text-[14px] font-semibold tabular-nums"
            style={{ color: sLevel === 'in_stock' ? '#1F2937' : sCfg.color }}
          >
            {product.stockCount}
          </span>
        </td>

        {/* Status pill */}
        <td className="py-2 px-4">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold"
            style={{ backgroundColor: stCfg.bg, color: stCfg.color }}
          >
            {t(stCfg.label)}
          </span>
        </td>

        {/* Units sold */}
        <td className="py-2 px-4 text-right">
          <span className="text-[12px] font-normal text-text-muted tabular-nums">{product.salesCount}</span>
        </td>

        {/* Actions — kebab menu, hover-reveal on web */}
        <td className="py-2 px-4 text-right" data-stop-propagation>
          <div ref={menuRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-label={t('seller.products.actionSheetTitle')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text hover:bg-border-light opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={reduced ? false : { opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.15 }}
                  className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-md shadow-lg z-dropdown overflow-hidden"
                >
                  <MenuItem icon={<Pencil size={15} />} label={t('seller.products.actionEdit')} ariaLabel={t('seller.products.actionEditAria')} onClick={() => { setMenuOpen(false); onEdit?.(product) }} />
                  <MenuItem icon={<Copy size={15} />} label={t('seller.products.actionDuplicate')} ariaLabel={t('seller.products.actionDuplicateAria')} onClick={() => { setMenuOpen(false); onDuplicate?.(product) }} />
                  <MenuItem icon={<ToggleIcon size={15} />} label={t(toggleLabel)} ariaLabel={isActive ? t('seller.products.actionDeactivateAria') : t('seller.products.actionActivateAria')} onClick={() => { setMenuOpen(false); onToggleActive?.(product) }} />
                  <MenuItem icon={<Package size={15} />} label={t('seller.products.actionQuickStock')} ariaLabel={t('seller.products.actionQuickStockAria')} onClick={() => { setMenuOpen(false); setStockValue(String(product.stockCount)); setStockEditOpen(true) }} />
                  <div className="border-t border-border-light my-1" />
                  <MenuItem icon={<Trash2 size={15} />} label={t('seller.products.actionDelete')} ariaLabel={t('seller.products.actionDeleteAria')} danger onClick={() => { setMenuOpen(false); setConfirmOpen(true) }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </td>
      </tr>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmOpen && (
          <ConfirmDialog
            title={t('seller.products.actionDeleteConfirm')}
            body={t('seller.products.actionDeleteConfirmBody', { name: product.name })}
            confirmLabel={t('seller.products.actionDeleteConfirmBtn')}
            cancelLabel={t('seller.products.actionCancel')}
            danger
            reduced={reduced}
            onConfirm={() => { setConfirmOpen(false); onDelete?.(product) }}
            onCancel={() => setConfirmOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Quick stock edit modal */}
      <AnimatePresence>
        {stockEditOpen && (
          <StockEditDialog
            title={t('seller.products.stockEditTitle')}
            label={t('seller.products.stockEditLabel')}
            hint={t('seller.products.stockEditHint')}
            saveLabel={t('seller.products.stockEditSave')}
            cancelLabel={t('seller.products.actionCancel')}
            value={stockValue}
            onChange={setStockValue}
            reduced={reduced}
            onSave={handleStockSave}
            onCancel={() => setStockEditOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ---- Skeleton ----

export function ProductRowSkeleton({ selectable = false }: { selectable?: boolean }) {
  return (
    <tr aria-busy="true" className="h-16 border-b border-border last:border-b-0">
      {selectable && <td className="py-2 px-4 w-10"><div className="w-4 h-4 rounded bg-shimmer animate-pulse" /></td>}
      <td className="py-2 px-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-shimmer animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-shimmer animate-pulse" />
            <div className="h-2.5 w-1/3 rounded bg-shimmer animate-pulse" />
          </div>
        </div>
      </td>
      <td className="py-2 px-4"><div className="h-3 w-20 rounded bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="h-3 w-16 rounded bg-shimmer animate-pulse ml-auto" /></td>
      <td className="py-2 px-4"><div className="h-5 w-20 rounded-full bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="h-5 w-16 rounded-full bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="h-3 w-10 rounded bg-shimmer animate-pulse ml-auto" /></td>
      <td className="py-2 px-4"><div className="w-8 h-8 rounded-md bg-shimmer animate-pulse ml-auto" /></td>
    </tr>
  )
}

// ---- Helpers ----

function MenuItem({
  icon,
  label,
  ariaLabel,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  ariaLabel: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-left transition-colors hover:bg-background ${
        danger ? 'text-error hover:bg-error/5' : 'text-text'
      }`}
    >
      <span className={danger ? 'text-error' : 'text-text-muted'} aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  reduced,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  reduced: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onCancel}
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="relative bg-surface rounded-xl p-5 w-full max-w-[400px] shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-text mb-2">{title}</h2>
        <p className="text-[14px] text-text-muted leading-5 mb-5">{body}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-10 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 h-10 rounded-md text-[14px] font-semibold text-white transition-colors ${danger ? 'bg-error hover:opacity-90' : 'bg-primary hover:opacity-90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function StockEditDialog({
  title,
  label,
  hint,
  saveLabel,
  cancelLabel,
  value,
  onChange,
  reduced,
  onSave,
  onCancel,
}: {
  title: string
  label: string
  hint: string
  saveLabel: string
  cancelLabel: string
  value: string
  onChange: (v: string) => void
  reduced: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const n = Math.max(0, Math.floor(Number(value) || 0))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 bg-black/40"
        onClick={onCancel}
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="relative bg-surface rounded-xl p-5 w-full max-w-[400px] shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-text mb-4">{title}</h2>
        <label className="block text-[13px] font-medium text-text mb-2">{label}</label>
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => onChange(String(Math.max(0, n - 1)))}
            aria-label="Decrease stock"
            className="w-10 h-10 rounded-md border border-border bg-background flex items-center justify-center text-text hover:bg-surface transition-colors"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-[16px] text-text text-center tabular-nums outline-none focus:border-primary transition-colors"
            aria-label={label}
          />
          <button
            type="button"
            onClick={() => onChange(String(n + 1))}
            aria-label="Increase stock"
            className="w-10 h-10 rounded-md border border-border bg-background flex items-center justify-center text-text hover:bg-surface transition-colors"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="text-[12px] text-text-muted mb-5">{hint}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-10 rounded-md border border-border bg-background text-[14px] font-semibold text-text hover:bg-surface transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 h-10 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            {saveLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
