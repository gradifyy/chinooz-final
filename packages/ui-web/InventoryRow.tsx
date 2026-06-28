'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Minus, Plus, AlertTriangle, PackageX, Boxes, Pencil, X, AlertCircle } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'
import Skeleton from './Skeleton'
import SafeImage from './SafeImage'
import type { InventoryRowProps } from '@chinooz/types/components'
import type { StockStatus, StockEditMode, StockEditReason } from '@chinooz/types'

const DEFAULT_THRESHOLD = 10
const LARGE_CHANGE_ABS = 100
const LARGE_CHANGE_PCT = 50

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any

const STATUS_META: Record<
  StockStatus,
  { bg: string; text: string; dot: string; Icon: IconType; labelKey: string }
> = {
  in_stock: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success', Icon: Boxes, labelKey: 'seller.inventory.inStock' },
  low_stock: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning', Icon: AlertTriangle, labelKey: 'seller.inventory.lowStock' },
  out_of_stock: { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error', Icon: PackageX, labelKey: 'seller.inventory.outOfStock' },
}

const STOCK_COLOR: Record<StockStatus, string> = {
  in_stock: 'text-text',
  low_stock: 'text-warning',
  out_of_stock: 'text-error',
}

const REASONS: StockEditReason[] = ['restock', 'correction', 'damage', 'loss', 'return', 'other']
const REASON_LABELS: Record<StockEditReason, string> = {
  restock: 'seller.inventory.reasonRestock',
  correction: 'seller.inventory.reasonCorrection',
  damage: 'seller.inventory.reasonDamage',
  loss: 'seller.inventory.reasonLoss',
  return: 'seller.inventory.reasonReturn',
  other: 'seller.inventory.reasonOther',
}

const TABNUM = { fontVariant: 'tabular-nums' } as React.CSSProperties

function StatusPill({ status }: { status: StockStatus }) {
  const { t } = useTranslation()
  const m = STATUS_META[status]
  const Icon = m.Icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${m.bg} ${m.text}`}>
      <Icon size={12} className={m.text} />
      {t(m.labelKey)}
    </span>
  )
}

function VariantLabel({ attributes, name }: { attributes: Record<string, string>; name: string }) {
  const parts = Object.values(attributes)
  const label = parts.length > 0 ? parts.join(' / ') : name
  return (
    <span className="inline-flex items-center rounded-full bg-background border border-border-light px-2 py-0.5 text-xs font-medium text-text-secondary">
      {label}
    </span>
  )
}

function Checkbox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={[
        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
        checked ? 'bg-primary border-primary' : 'bg-surface border-border hover:border-primary',
      ].join(' ')}
    >
      {checked && <Check size={14} className="text-white" strokeWidth={3} />}
    </button>
  )
}

function StepperButton({ onClick, disabled, ariaLabel, children }: {
  onClick: () => void; disabled?: boolean; ariaLabel: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-8 h-8 rounded-md border border-border bg-surface text-text flex items-center justify-center text-base font-semibold leading-none hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

/** Inline quick stock control — optimistic, commits on blur/enter/stepper. */
function QuickStockControl({ value, onCommit, reduced }: {
  value: number; onCommit?: (v: number) => void; reduced: boolean
}) {
  const [local, setLocal] = useState(value)
  const [focused, setFocused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { if (!focused) setLocal(value) }, [value, focused])

  const clamp = (v: number) => Math.max(0, isNaN(v) ? 0 : v)

  const schedule = (v: number) => {
    setLocal(v)
    if (!onCommit) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onCommit(v), 600)
  }
  const commitNow = () => { clearTimeout(timer.current); if (onCommit) onCommit(local) }

  return (
    <div className="inline-flex items-center gap-1.5">
      <StepperButton onClick={() => { const v = clamp(local - 1); schedule(v); onCommit?.(v) }} disabled={local <= 0} ariaLabel="Decrease stock">
        <Minus size={15} />
      </StepperButton>
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commitNow() }}
        onChange={e => schedule(clamp(Number(e.target.value.replace(/[^0-9]/g, ''))))}
        onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); commitNow() } }}
        aria-label="Stock on hand"
        className="w-14 h-8 rounded-md border border-border bg-surface text-center text-sm font-semibold text-text tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
        style={TABNUM}
      />
      <StepperButton onClick={() => { const v = clamp(local + 1); schedule(v); onCommit?.(v) }} ariaLabel="Increase stock">
        <Plus size={15} />
      </StepperButton>
      {focused && !reduced && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-text-muted">·</motion.span>}
    </div>
  )
}

/** Inline save confirmation check that fades after 1.5s. */
function SaveCheck({ show, reduced, label }: { show: boolean; reduced: boolean; label: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          role="status"
          aria-live="polite"
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 15, stiffness: 300 }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-success"
        >
          <Check size={13} strokeWidth={3} />
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/** Inline rollback error — role="alert" for screen readers. */
function RollbackAlert({ show, label }: { show: boolean; label: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          role="alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-error"
        >
          <AlertCircle size={13} />
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/** Edit popover: set/adjust toggle + value input + reason chips + save. */
function EditPopover({
  variant,
  onConfirm,
  onClose,
  reduced,
}: {
  variant: { id: string; name: string; sku: string; stockCount: number; productName?: string }
  onConfirm: (newStock: number, mode: StockEditMode, reason: StockEditReason, note?: string) => void
  onClose: () => void
  reduced: boolean
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<StockEditMode>('set')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState<StockEditReason>('restock')
  const [note, setNote] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const numValue = Number(value.replace(/[^0-9-]/g, '')) || 0
  const computedStock = mode === 'adjust' ? Math.max(0, variant.stockCount + numValue) : Math.max(0, numValue)
  const canSave = mode === 'adjust' ? numValue !== 0 : numValue >= 0 && value !== ''

  const handleSave = () => {
    if (!canSave) return
    onConfirm(computedStock, mode, reason, note || undefined)
  }

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t('seller.inventory.edit')}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={reduced ? { duration: 0 } : { duration: 0.15 }}
      className="absolute z-30 mt-1 w-72 rounded-xl border border-border bg-surface shadow-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text truncate">{t('seller.inventory.edit')}</span>
        <button onClick={onClose} aria-label={t('seller.inventory.cancel')} className="text-text-muted hover:text-text">
          <X size={16} />
        </button>
      </div>

      {/* Mode toggle */}
      <div role="tablist" aria-label="Edit mode" className="flex bg-background rounded-lg p-0.5 mb-3">
        {(['set', 'adjust'] as StockEditMode[]).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setValue('') }}
            className={[
              'flex-1 h-8 rounded-md text-xs font-semibold transition-colors',
              mode === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            {t(m === 'set' ? 'seller.inventory.modeSet' : 'seller.inventory.modeAdjust')}
          </button>
        ))}
      </div>

      {/* Value input */}
      <div className="mb-3">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => setValue(e.target.value.replace(/[^0-9-]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder={mode === 'set' ? t('seller.inventory.setPlaceholder') : t('seller.inventory.adjustPlaceholder')}
          aria-label={mode === 'set' ? t('seller.inventory.setPlaceholder') : t('seller.inventory.adjustPlaceholder')}
          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
          style={TABNUM}
          autoFocus
        />
        <p className="text-xs text-text-muted mt-1 tabular-nums" style={TABNUM}>
          {mode === 'adjust'
            ? `${variant.stockCount} → ${computedStock}`
            : `current: ${variant.stockCount}`}
        </p>
      </div>

      {/* Reason chips */}
      <div className="mb-3">
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

      {/* Note */}
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={t('seller.inventory.notePlaceholder')}
        aria-label={t('seller.inventory.note')}
        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-text mb-3 focus:border-primary focus:outline-none"
      />

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-border text-sm font-semibold text-text hover:bg-background transition-colors">
          {t('seller.inventory.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 h-9 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {t('seller.inventory.save')}
        </button>
      </div>
    </motion.div>
  )
}

/** Large-change confirm dialog. */
function ConfirmDialog({
  from,
  to,
  onConfirm,
  onCancel,
  reduced,
}: {
  from: number; to: number; onConfirm: () => void; onCancel: () => void; reduced: boolean
}) {
  const { t } = useTranslation()
  const delta = to - from
  return (
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
        aria-label={t('seller.inventory.confirmTitle')}
        initial={reduced ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.15 }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-warning" />
          <h2 className="text-base font-bold text-text">{t('seller.inventory.confirmTitle')}</h2>
        </div>
        <p className="text-sm text-text-muted mb-4 tabular-nums" style={TABNUM}>
          {t('seller.inventory.confirmBody', { from, to, delta: delta > 0 ? `+${delta}` : delta })}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text">
            {t('seller.inventory.confirmCancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-lg bg-primary text-sm font-semibold text-white">
            {t('seller.inventory.confirmConfirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function InventoryRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 h-14" aria-busy="true" role="row">
      <Skeleton width={24} height={24} borderRadius={6} />
      <Skeleton width={36} height={36} borderRadius={8} />
      <div className="flex-1 min-w-0">
        <Skeleton width="60%" height={14} />
        <div className="mt-1.5"><Skeleton width="30%" height={10} /></div>
      </div>
      <Skeleton width={80} height={32} borderRadius={6} />
      <Skeleton width={48} height={16} />
      <Skeleton width={72} height={20} borderRadius={9999} />
    </div>
  )
}

export default function InventoryRow({
  variant,
  lowStockThreshold = DEFAULT_THRESHOLD,
  onStockChange,
  selected = false,
  onToggleSelect,
  showOptionalColumns = false,
  loading = false,
  layout = 'table',
  editable = false,
  editState = 'idle',
  largeChangeThreshold = LARGE_CHANGE_ABS,
  largeChangePercent = LARGE_CHANGE_PCT,
  testID,
}: InventoryRowProps) {
  const reduced = useReducedMotion()
  const { t } = useTranslation()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{ newStock: number; mode: StockEditMode; reason: StockEditReason; note?: string } | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Show saved check when editState transitions to 'saved'
  useEffect(() => {
    if (editState === 'saved') {
      setSavedFlash(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSavedFlash(false), 1500)
    }
    if (editState === 'saving') {
      setSavedFlash(false)
    }
  }, [editState])

  if (loading) return <InventoryRowSkeleton />

  const threshold = variant.lowStockThreshold ?? lowStockThreshold
  const stockColor = STOCK_COLOR[variant.stock]
  const statusMeta = STATUS_META[variant.stock]
  const ariaLabel = `${variant.productName ?? variant.name}, ${variant.sku}, ${variant.stockCount} units, ${t(statusMeta.labelKey)}`

  const isLargeChange = (newStock: number) => {
    const delta = Math.abs(newStock - variant.stockCount)
    if (delta > largeChangeThreshold) return true
    if (variant.stockCount > 0) {
      const pct = (delta / variant.stockCount) * 100
      if (pct > largeChangePercent) return true
    }
    return false
  }

  const handleCommit = (newStock: number, mode: StockEditMode = 'set', reason: StockEditReason = 'restock', note?: string) => {
    if (newStock < 0) return
    if (isLargeChange(newStock)) {
      setConfirmData({ newStock, mode, reason, note })
      return
    }
    onStockChange?.(newStock, mode, reason)
  }

  const handleQuickCommit = (v: number) => handleCommit(v, 'set', 'restock')

  const handleConfirm = () => {
    if (confirmData) {
      onStockChange?.(confirmData.newStock, confirmData.mode, confirmData.reason)
    }
    setConfirmData(null)
  }

  // ── Compact (mobile) layout ──────────────────────────────
  if (layout === 'compact') {
    return (
      <>
        <motion.div
          data-testid={testID}
          role="row"
          aria-label={ariaLabel}
          whileHover={reduced ? undefined : { backgroundColor: 'rgba(250,250,250,1)' }}
          className="flex items-center gap-3 px-3 py-3 border-b border-border-light last:border-b-0"
        >
          {onToggleSelect && <Checkbox checked={selected} onChange={() => onToggleSelect(variant.id)} ariaLabel="Select variant" />}
          <SafeImage src={variant.image} alt={variant.productName ?? variant.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-border-light" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text truncate">{variant.productName ?? variant.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <VariantLabel attributes={variant.attributes} name={variant.name} />
              <span className="text-xs font-normal text-text-muted font-mono truncate">{variant.sku}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-semibold tabular-nums ${stockColor}`} style={TABNUM}>{variant.stockCount}</span>
              <span className="text-xs text-text-muted">min {threshold}</span>
            </div>
            <StatusPill status={variant.stock} />
          </div>
          {editable && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setEditOpen(o => !o)}
                aria-label={t('seller.inventory.editAria', { name: variant.productName ?? variant.name })}
                className="w-8 h-8 rounded-md border border-border bg-surface flex items-center justify-center hover:bg-background transition-colors"
              >
                <Pencil size={14} className="text-text-muted" />
              </button>
              <AnimatePresence>
                {editOpen && (
                  <EditPopover variant={variant} onConfirm={(ns, m, r, n) => { handleCommit(ns, m, r, n); setEditOpen(false) }} onClose={() => setEditOpen(false)} reduced={reduced} />
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
        <div className="flex items-center gap-2 px-3 -mt-1 mb-1">
          <SaveCheck show={savedFlash && editState === 'saved'} reduced={reduced} label={t('seller.inventory.saved', { count: variant.stockCount })} />
          <RollbackAlert show={editState === 'error'} label={t('seller.inventory.saveError')} />
        </div>
        <AnimatePresence>
          {confirmData && (
            <ConfirmDialog
              from={variant.stockCount}
              to={confirmData.newStock}
              onConfirm={handleConfirm}
              onCancel={() => setConfirmData(null)}
              reduced={reduced}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Dense table (web) layout ─────────────────────────────
  return (
    <>
      <motion.div
        data-testid={testID}
        role="row"
        aria-label={ariaLabel}
        whileHover={reduced ? undefined : { backgroundColor: 'rgba(250,250,250,0.6)' }}
        className="flex items-center gap-3 px-4 h-14 border-b border-border-light"
      >
        {onToggleSelect && <Checkbox checked={selected} onChange={() => onToggleSelect(variant.id)} ariaLabel="Select variant" />}
        <SafeImage src={variant.image} alt={variant.productName ?? variant.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-border-light" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text truncate">{variant.productName ?? variant.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <VariantLabel attributes={variant.attributes} name={variant.name} />
            <span className="text-xs font-normal text-text-muted font-mono truncate">{variant.sku}</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center w-24 flex-shrink-0">
          <span className={`text-base font-semibold tabular-nums ${stockColor}`} style={TABNUM}>{variant.stockCount}</span>
          <span className="text-xs font-normal text-text-muted">min {threshold}</span>
        </div>

        <div className="flex-shrink-0">
          <QuickStockControl value={variant.stockCount} onCommit={handleQuickCommit} reduced={reduced} />
        </div>

        {editable && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setEditOpen(o => !o)}
              aria-label={t('seller.inventory.editAria', { name: variant.productName ?? variant.name })}
              className="w-8 h-8 rounded-md border border-border bg-surface flex items-center justify-center hover:bg-background transition-colors"
            >
              <Pencil size={14} className="text-text-muted" />
            </button>
            <AnimatePresence>
              {editOpen && (
                <EditPopover variant={variant} onConfirm={(ns, m, r, n) => { handleCommit(ns, m, r, n); setEditOpen(false) }} onClose={() => setEditOpen(false)} reduced={reduced} />
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex-shrink-0 w-28 flex justify-end items-center gap-1.5">
          <SaveCheck show={savedFlash && editState === 'saved'} reduced={reduced} label={t('seller.inventory.saved', { count: variant.stockCount })} />
          <StatusPill status={variant.stock} />
        </div>
        {editState === 'error' && (
          <div className="flex-shrink-0">
            <RollbackAlert show={editState === 'error'} label={t('seller.inventory.saveError')} />
          </div>
        )}
      </motion.div>

      {showOptionalColumns && (
        <div className="hidden lg:flex items-center gap-6 px-4 py-1 text-xs text-text-muted border-b border-border-light bg-background/40">
          <span className="w-20 text-right tabular-nums" style={TABNUM}>{variant.committed ?? 0} reserved</span>
          <span className="w-20 text-right tabular-nums" style={TABNUM}>{variant.incoming ?? 0} incoming</span>
          <span className="w-20 text-right tabular-nums" style={TABNUM}>{variant.salesCount} sold</span>
        </div>
      )}

      <AnimatePresence>
        {confirmData && (
          <ConfirmDialog
            from={variant.stockCount}
            to={confirmData.newStock}
            onConfirm={handleConfirm}
            onCancel={() => setConfirmData(null)}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
    </>
  )
}
