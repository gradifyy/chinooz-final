'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Power,
  PowerOff,
  Square,
  Trash2,
  Tag,
} from 'lucide-react'
import { useReducedMotion } from '@chinooz/ui-web'
import type { Promotion, PromotionStatus, PromotionType } from '@chinooz/mock-data'

export interface PromotionRowProps {
  promo: Promotion
  selected?: boolean
  selectable?: boolean
  onSelectChange?: (id: string, selected: boolean) => void
  onEdit?: (promo: Promotion) => void
  onDuplicate?: (promo: Promotion) => void
  onToggleActive?: (promo: Promotion) => void
  onEndNow?: (promo: Promotion) => void
  onDelete?: (promo: Promotion) => void
  onCopyCode?: (code: string) => void
}

const STATUS_CFG: Record<PromotionStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'seller.promotions.statusActive', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  scheduled: { label: 'seller.promotions.statusScheduled', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  expired: { label: 'seller.promotions.statusExpired', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  draft: { label: 'seller.promotions.statusDraft', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
}

type TT = (key: string, opts?: Record<string, unknown>) => string

function typeLabel(t: TT, type: PromotionType): string {
  const map: Record<PromotionType, string> = {
    percentage: t('seller.promotions.typePercentage'),
    fixed: t('seller.promotions.typeFixed'),
    flash_sale: t('seller.promotions.typeFlashSale'),
    bogo: t('seller.promotions.typeBogo'),
    free_shipping: t('seller.promotions.typeFreeShipping'),
  }
  return map[type]
}

function discountText(p: Promotion): string {
  if (p.type === 'percentage' || p.type === 'flash_sale') return `${p.discountValue}%`
  if (p.type === 'fixed') return `NPR ${p.discountValue}`
  if (p.type === 'bogo') return 'BOGO'
  return ''
}

function scopeText(t: TT, p: Promotion): string {
  if (p.scope === 'all') return t('seller.promotions.scopeAll')
  if (p.scope === 'category') return t('seller.promotions.scopeCategory', { label: p.scopeLabel ?? '' })
  return t('seller.promotions.scopeProducts', { count: p.productsCount })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatNPR(n: number): string {
  return n.toLocaleString()
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function getTimeRemaining(target: string): { total: number; days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, new Date(target).getTime() - Date.now())
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  return { total, days, hours, minutes, seconds }
}

function countdownStr(r: ReturnType<typeof getTimeRemaining>): string {
  if (r.days > 0) return `${r.days}d ${pad(r.hours)}h ${pad(r.minutes)}m`
  return `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
}

export function PromotionRow({
  promo,
  selected = false,
  selectable = false,
  onSelectChange,
  onEdit,
  onDuplicate,
  onToggleActive,
  onEndNow,
  onDelete,
  onCopyCode,
}: PromotionRowProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [time, setTime] = useState(() => getTimeRemaining(promo.endsAt))
  const menuRef = useRef<HTMLDivElement>(null)

  const stCfg = STATUS_CFG[promo.status]
  const isActive = promo.status === 'active'
  const isScheduled = promo.status === 'scheduled'
  const showCountdown = (isActive || isScheduled) && time.total > 0
  const countdownTarget = isScheduled ? promo.startsAt : promo.endsAt
  const isEndingSoon = isActive && time.total > 0 && time.total < 24 * 60 * 60 * 1000
  const isSale = promo.type === 'flash_sale' || promo.type === 'percentage'

  useEffect(() => {
    if (!showCountdown) return
    const id = setInterval(() => {
      const r = getTimeRemaining(countdownTarget)
      setTime(r)
      if (r.total <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [showCountdown, countdownTarget])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promo.code)
    } catch {}
    setCopied(true)
    onCopyCode?.(promo.code)
    setTimeout(() => setCopied(false), 2000)
  }, [promo.code, onCopyCode])

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-stop-propagation]')) return
    onEdit?.(promo)
  }

  const handleCheckboxChange = () => {
    onSelectChange?.(promo.id, !selected)
  }

  const rowAria = t('seller.promotions.rowAria', {
    name: promo.name,
    type: typeLabel(t, promo.type),
    value: discountText(promo),
    status: t(stCfg.label),
  })

  const countdownAria = showCountdown
    ? t('seller.promotions.countdownAria', {
        time: t(
          isScheduled ? 'seller.promotions.countdownStartsIn' : 'seller.promotions.countdownEndsIn',
          { time: countdownStr(time) },
        ),
      })
    : undefined

  const toggleLabel = isActive ? 'seller.promotions.actionPause' : 'seller.promotions.actionActivate'
  const ToggleIcon = isActive ? PowerOff : Power

  return (
    <>
      <tr
        onClick={handleRowClick}
        className="group h-16 border-b border-border-light last:border-b-0 hover:bg-primary-50/40 transition-colors duration-150 cursor-pointer"
        role="button"
        aria-label={rowAria}
      >
        {selectable && (
          <td className="py-2 px-4 w-10" data-stop-propagation>
            <input
              type="checkbox"
              checked={selected}
              onChange={handleCheckboxChange}
              aria-label={t('seller.promotions.selectPromotionAria', { name: promo.name })}
              aria-checked={selected}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2 accent-primary cursor-pointer"
            />
          </td>
        )}

        <td className="py-2 px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
              <Tag size={16} color="#8A1B57" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-semibold text-text truncate max-w-[200px] leading-tight">{promo.name}</span>
                {isSale && isActive && (
                  <span className="shrink-0 text-[10px] font-bold tracking-wide text-white bg-gold rounded-full px-1.5 py-px">
                    {t('seller.promotions.saleBadge')}
                  </span>
                )}
              </div>
              {promo.isCoupon ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCopy() }}
                  data-stop-propagation
                  aria-label={t('seller.promotions.copyCodeAria', { code: promo.code })}
                  className="inline-flex items-center gap-1 text-[12px] text-text-muted font-mono hover:text-primary transition-colors mt-0.5"
                >
                  {promo.code}
                  <span className={`text-[11px] font-semibold ${copied ? 'text-success' : 'text-primary'}`}>
                    {copied ? `✓ ${t('seller.promotions.codeCopied')}` : t('seller.promotions.copyCode')}
                  </span>
                </button>
              ) : (
                <span className="text-[12px] font-medium text-text-muted mt-0.5">
                  {typeLabel(t, promo.type)}
                </span>
              )}
            </div>
          </div>
        </td>

        <td className="py-2 px-4">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium bg-background border border-border text-text-secondary">
            {typeLabel(t, promo.type)}
          </span>
        </td>

        <td className="py-2 px-4">
          <span className="text-[14px] font-semibold text-gold tabular-nums">{discountText(promo)}</span>
        </td>

        <td className="py-2 px-4">
          <span className="text-[12px] font-normal text-text-muted">{scopeText(t, promo)}</span>
        </td>

        <td className="py-2 px-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-normal text-text-secondary whitespace-nowrap">
              {formatDate(promo.startsAt)} – {formatDate(promo.endsAt)}
            </span>
            {showCountdown && (
              <span
                className={`text-[12px] font-semibold tabular-nums whitespace-nowrap ${isEndingSoon ? 'text-warning' : 'text-text-muted'}`}
                aria-label={countdownAria}
                role="timer"
              >
                {isScheduled ? t('seller.promotions.countdownStartsIn', { time: countdownStr(time) }) : t('seller.promotions.countdownEndsIn', { time: countdownStr(time) })}
                {isEndingSoon && <span className="ml-1 text-warning">⚠</span>}
              </span>
            )}
          </div>
        </td>

        <td className="py-2 px-4">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold"
            style={{ backgroundColor: stCfg.bg, color: stCfg.color }}
          >
            {t(stCfg.label)}
          </span>
        </td>

        <td className="py-2 px-4">
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[12px] font-normal text-text-muted tabular-nums">
              {t('seller.promotions.uses', { count: promo.redemptions })}
            </span>
            <span className="text-[12px] font-semibold text-text tabular-nums">
              {t('seller.promotions.revenue', { amount: formatNPR(promo.revenue) })}
            </span>
          </div>
        </td>

        <td className="py-2 px-4 text-right" data-stop-propagation>
          <div ref={menuRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-label={t('seller.promotions.actionSheetTitle')}
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
                  <MenuItem icon={<Pencil size={15} />} label={t('seller.promotions.actionEdit')} ariaLabel={t('seller.promotions.actionEditAria', { name: promo.name })} onClick={() => { setMenuOpen(false); onEdit?.(promo) }} />
                  <MenuItem icon={<Copy size={15} />} label={t('seller.promotions.actionDuplicate')} ariaLabel={t('seller.promotions.actionDuplicateAria', { name: promo.name })} onClick={() => { setMenuOpen(false); onDuplicate?.(promo) }} />
                  <MenuItem icon={<ToggleIcon size={15} />} label={t(toggleLabel)} ariaLabel={isActive ? t('seller.promotions.actionPauseAria', { name: promo.name }) : t('seller.promotions.actionActivateAria', { name: promo.name })} onClick={() => { setMenuOpen(false); onToggleActive?.(promo) }} />
                  {isActive && (
                    <MenuItem icon={<Square size={15} />} label={t('seller.promotions.actionEndNow')} ariaLabel={t('seller.promotions.actionEndNowAria', { name: promo.name })} onClick={() => { setMenuOpen(false); setConfirmEnd(true) }} />
                  )}
                  <div className="border-t border-border-light my-1" />
                  <MenuItem icon={<Trash2 size={15} />} label={t('seller.promotions.actionDelete')} ariaLabel={t('seller.promotions.actionDeleteAria', { name: promo.name })} danger onClick={() => { setMenuOpen(false); setConfirmDelete(true) }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </td>
      </tr>

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            title={t('seller.promotions.actionDeleteConfirm')}
            body={t('seller.promotions.actionDeleteConfirmBody', { name: promo.name })}
            confirmLabel={t('seller.promotions.actionDeleteConfirmBtn')}
            cancelLabel={t('seller.promotions.actionCancel')}
            danger
            reduced={reduced}
            onConfirm={() => { setConfirmDelete(false); onDelete?.(promo) }}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmEnd && (
          <ConfirmDialog
            title={t('seller.promotions.actionEndConfirm')}
            body={t('seller.promotions.actionEndConfirmBody', { name: promo.name })}
            confirmLabel={t('seller.promotions.actionEndConfirmBtn')}
            cancelLabel={t('seller.promotions.actionCancel')}
            reduced={reduced}
            onConfirm={() => { setConfirmEnd(false); onEndNow?.(promo) }}
            onCancel={() => setConfirmEnd(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export function PromotionRowSkeleton({ selectable = false }: { selectable?: boolean }) {
  return (
    <tr aria-busy="true" className="h-16 border-b border-border-light last:border-b-0">
      {selectable && <td className="py-2 px-4 w-10"><div className="w-4 h-4 rounded bg-shimmer animate-pulse" /></td>}
      <td className="py-2 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-shimmer animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 rounded bg-shimmer animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-shimmer animate-pulse" />
          </div>
        </div>
      </td>
      <td className="py-2 px-4"><div className="h-5 w-20 rounded-full bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="h-4 w-10 rounded bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="h-3 w-24 rounded bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="space-y-1"><div className="h-3 w-24 rounded bg-shimmer animate-pulse" /><div className="h-3 w-16 rounded bg-shimmer animate-pulse" /></div></td>
      <td className="py-2 px-4"><div className="h-5 w-16 rounded-full bg-shimmer animate-pulse" /></td>
      <td className="py-2 px-4"><div className="space-y-1"><div className="h-3 w-12 rounded bg-shimmer animate-pulse ml-auto" /><div className="h-3 w-16 rounded bg-shimmer animate-pulse ml-auto" /></div></td>
      <td className="py-2 px-4"><div className="w-8 h-8 rounded-md bg-shimmer animate-pulse ml-auto" /></td>
    </tr>
  )
}

export function PromotionCardSkeleton() {
  return (
    <div aria-busy="true" className="rounded-lg border border-border-light bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-shimmer animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-shimmer animate-pulse" />
            <div className="h-3 w-20 rounded bg-shimmer animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-shimmer animate-pulse shrink-0" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="h-3 w-14 rounded bg-shimmer animate-pulse" />
          <div className="h-6 w-10 rounded bg-shimmer animate-pulse" />
        </div>
        <div className="space-y-1 text-right">
          <div className="h-3 w-14 rounded bg-shimmer animate-pulse ml-auto" />
          <div className="h-4 w-20 rounded bg-shimmer animate-pulse ml-auto" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border-light flex justify-between">
        <div className="h-3 w-28 rounded bg-shimmer animate-pulse" />
        <div className="h-3 w-16 rounded bg-shimmer animate-pulse" />
      </div>
    </div>
  )
}

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
