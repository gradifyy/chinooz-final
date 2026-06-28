'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Minus, Plus, AlertTriangle, PackageX, Boxes } from 'lucide-react'
import { useReducedMotion } from './hooks/useReducedMotion'
import Skeleton from './Skeleton'
import SafeImage from './SafeImage'
import type { InventoryRowProps } from '@chinooz/types/components'
import type { StockStatus } from '@chinooz/types'

const DEFAULT_THRESHOLD = 10

const STATUS_META: Record<
  StockStatus,
  { bg: string; text: string; dot: string; Icon: React.ComponentType<{ size?: number; className?: string }>; labelKey: string }
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

const TABNUM = { fontVariant: 'tabular-nums' } as React.CSSProperties

function useDebouncedCommit(value: number, onCommit?: (v: number) => void) {
  const [local, setLocal] = useState(value)
  const [focused, setFocused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { if (!focused) setLocal(value) }, [value, focused])

  const schedule = (v: number) => {
    setLocal(v)
    if (!onCommit) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onCommit(v), 600)
  }

  const commitNow = () => {
    clearTimeout(timer.current)
    if (onCommit) onCommit(local)
  }

  return { local, setLocal: schedule, commitNow, focused, setFocused }
}

function StatusPill({ status }: { status: StockStatus }) {
  const { t } = useTranslation()
  const m = STATUS_META[status]
  const Icon = m.Icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${m.bg} ${m.text}`}
    >
      <Icon size={12} className={m.text} />
      {t(m.labelKey)}
    </span>
  )
}

function StepperButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
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

function StockControl({
  value,
  onCommit,
  reduced,
}: {
  value: number
  onCommit?: (v: number) => void
  reduced: boolean
}) {
  const { local, setLocal, commitNow, focused, setFocused } = useDebouncedCommit(value, onCommit)

  const clamp = (v: number) => Math.max(0, isNaN(v) ? 0 : v)

  return (
    <div className="inline-flex items-center gap-1.5">
      <StepperButton
        onClick={() => { const v = clamp(local - 1); setLocal(v); onCommit?.(v) }}
        disabled={local <= 0}
        ariaLabel="Decrease stock"
      >
        <Minus size={15} />
      </StepperButton>
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commitNow() }}
        onChange={e => setLocal(clamp(Number(e.target.value.replace(/[^0-9]/g, ''))))}
        onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); commitNow() } }}
        aria-label="Stock on hand"
        className="w-14 h-8 rounded-md border border-border bg-surface text-center text-sm font-semibold text-text tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
        style={TABNUM}
      />
      <StepperButton
        onClick={() => { const v = clamp(local + 1); setLocal(v); onCommit?.(v) }}
        ariaLabel="Increase stock"
      >
        <Plus size={15} />
      </StepperButton>
      {focused && !reduced && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-text-muted"
        >
          ·
        </motion.span>
      )}
    </div>
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

function InventoryRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 h-14" aria-busy="true" role="row">
      <Skeleton width={24} height={24} borderRadius={6} />
      <Skeleton width={36} height={36} borderRadius={8} />
      <div className="flex-1 min-w-0">
        <Skeleton width="60%" height={14} />
        <div className="mt-1.5">
          <Skeleton width="30%" height={10} />
        </div>
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
  testID,
}: InventoryRowProps) {
  const reduced = useReducedMotion()
  const { t } = useTranslation()

  if (loading) return <InventoryRowSkeleton />

  const threshold = variant.lowStockThreshold ?? lowStockThreshold
  const stockColor = STOCK_COLOR[variant.stock]
  const statusMeta = STATUS_META[variant.stock]
  const ariaLabel = `${variant.productName ?? variant.name}, ${variant.sku}, ${variant.stockCount} units, ${t(statusMeta.labelKey)}`

  // ── Compact (mobile) layout ──────────────────────────────
  if (layout === 'compact') {
    return (
      <motion.div
        data-testid={testID}
        role="row"
        aria-label={ariaLabel}
        whileHover={reduced ? undefined : { backgroundColor: 'rgba(250,250,250,1)' }}
        className="flex items-center gap-3 px-3 py-3 border-b border-border-light last:border-b-0"
      >
        {onToggleSelect && (
          <Checkbox checked={selected} onChange={() => onToggleSelect(variant.id)} ariaLabel="Select variant" />
        )}
        <SafeImage
          src={variant.image}
          alt={variant.productName ?? variant.name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-border-light"
        />
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
      </motion.div>
    )
  }

  // ── Dense table (web) layout ─────────────────────────────
  return (
    <motion.div
      data-testid={testID}
      role="row"
      aria-label={ariaLabel}
      whileHover={reduced ? undefined : { backgroundColor: 'rgba(250,250,250,0.6)' }}
      className="flex items-center gap-3 px-4 h-14 border-b border-border-light"
    >
      {onToggleSelect && (
        <Checkbox checked={selected} onChange={() => onToggleSelect(variant.id)} ariaLabel="Select variant" />
      )}
      <SafeImage
        src={variant.image}
        alt={variant.productName ?? variant.name}
        width={40}
        height={40}
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-border-light"
      />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-text truncate">{variant.productName ?? variant.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <VariantLabel attributes={variant.attributes} name={variant.name} />
          <span className="text-xs font-normal text-text-muted font-mono truncate">{variant.sku}</span>
        </div>
      </div>

      {/* Stock + threshold */}
      <div className="flex flex-col items-end justify-center w-24 flex-shrink-0">
        <span className={`text-base font-semibold tabular-nums ${stockColor}`} style={TABNUM}>{variant.stockCount}</span>
        <span className="text-xs font-normal text-text-muted">min {threshold}</span>
      </div>

      {/* Quick stock control */}
      <div className="flex-shrink-0">
        <StockControl value={variant.stockCount} onCommit={onStockChange} reduced={reduced} />
      </div>

      {/* Optional columns */}
      {showOptionalColumns && (
        <div className="hidden lg:flex items-center gap-6 flex-shrink-0">
          <div className="flex flex-col items-end w-20">
            <span className="text-xs font-normal text-text-muted tabular-nums" style={TABNUM}>{variant.committed ?? 0}</span>
            <span className="text-[10px] text-text-tertiary">reserved</span>
          </div>
          <div className="flex flex-col items-end w-20">
            <span className="text-xs font-normal text-text-muted tabular-nums" style={TABNUM}>{variant.incoming ?? 0}</span>
            <span className="text-[10px] text-text-tertiary">incoming</span>
          </div>
          <div className="flex flex-col items-end w-20">
            <span className="text-xs font-normal text-text-muted tabular-nums" style={TABNUM}>{variant.salesCount}</span>
            <span className="text-[10px] text-text-tertiary">sold</span>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 w-28 flex justify-end">
        <StatusPill status={variant.stock} />
      </div>
    </motion.div>
  )
}
