'use client'

import React, { useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, AlertTriangle, Clock, Printer, Eye, Package, Truck } from 'lucide-react'
import { formatNPR, getLocale } from '@chinooz/utils'
import { duration } from '@chinooz/theme'
import { useReducedMotion } from './hooks/useReducedMotion'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'
import type { SellerOrderRowProps } from '@chinooz/types/components'
import type { SellerSubOrder, SellerOrderStatusKey } from '@chinooz/types'

const TABNUM: React.CSSProperties = { fontVariant: 'tabular-nums' }

const STATUS_META: Record<
  SellerOrderStatusKey,
  { bg: string; text: string; dot: string; labelKey: string }
> = {
  new: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info', labelKey: 'seller.orders.tabNew' },
  to_pack: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning', labelKey: 'seller.orders.tabToPack' },
  to_ship: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning', labelKey: 'seller.orders.tabToShip' },
  shipped: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info', labelKey: 'seller.orders.tabShipped' },
  completed: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success', labelKey: 'seller.orders.tabCompleted' },
  cancelled_returned: { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error', labelKey: 'seller.orders.tabCancelledReturned' },
  action_needed: { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error', labelKey: 'seller.orders.tabActionNeeded' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any

const ACTION_MAP: Record<SellerOrderStatusKey, { labelKey: string; ariaKey: string; Icon: IconType } | null> = {
  new: { labelKey: 'seller.orders.actionAccept', ariaKey: 'seller.orders.actionAcceptAria', Icon: Check },
  to_pack: { labelKey: 'seller.orders.actionPack', ariaKey: 'seller.orders.actionPackAria', Icon: Package },
  to_ship: { labelKey: 'seller.orders.actionShip', ariaKey: 'seller.orders.actionShipAria', Icon: Truck },
  shipped: { labelKey: 'seller.orders.actionPrintLabel', ariaKey: 'seller.orders.actionPrintLabelAria', Icon: Printer },
  completed: { labelKey: 'seller.orders.actionView', ariaKey: 'seller.orders.actionViewAria', Icon: Eye },
  cancelled_returned: { labelKey: 'seller.orders.actionView', ariaKey: 'seller.orders.actionViewAria', Icon: Eye },
  action_needed: { labelKey: 'seller.orders.actionView', ariaKey: 'seller.orders.actionViewAria', Icon: Eye },
}

const THUMB_SIZE = 32
const THUMB_OVERLAP = 8
const MAX_THUMBS = 3

function formatDate(iso: string, lang?: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(getLocale(lang), { month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function computeShipBy(order: SellerSubOrder): { date: Date; isOverdue: boolean; isDueToday: boolean } | null {
  if (order.statusKey === 'shipped' || order.statusKey === 'completed' || order.statusKey === 'cancelled_returned') return null
  const created = new Date(order.createdAt).getTime()
  const slaDays = order.shippingMethod === 'sameday' ? 0 : order.shippingMethod === 'express' ? 1 : 2
  const shipBy = new Date(created + slaDays * 86400000)
  shipBy.setHours(23, 59, 59, 999)
  const now = Date.now()
  const isOverdue = now > shipBy.getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const shipByDay = new Date(shipBy)
  shipByDay.setHours(0, 0, 0, 0)
  const isDueToday = !isOverdue && shipByDay.getTime() === today.getTime()
  return { date: shipBy, isOverdue, isDueToday }
}

function StatusPill({ statusKey, t }: { statusKey: SellerOrderStatusKey; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const reduced = useReducedMotion()
  const m = STATUS_META[statusKey]
  return (
    <motion.span
      key={statusKey}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${m.bg} ${m.text}`}
    >
      <motion.span
        className={`h-1.5 w-1.5 rounded-full ${m.dot}`}
        initial={reduced ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 18, stiffness: 300, duration: 0.6 }}
        aria-hidden="true"
      />
      {t(m.labelKey)}
    </motion.span>
  )
}

function PaymentChip({ order, t }: { order: SellerSubOrder; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const isCod = order.paymentType === 'cod'
  const isPaid = !isCod
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${
          isCod ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
        }`}
      >
        {isCod ? t('seller.orders.paymentCod') : t('seller.orders.paymentPrepaid')}
      </span>
      <span className={`text-[11px] font-medium ${isPaid ? 'text-success' : 'text-text-muted'}`}>
        {isPaid ? t('seller.orders.paid') : t('seller.orders.unpaid')}
      </span>
    </div>
  )
}

function ThumbStack({ items }: { items: SellerSubOrder['items'] }) {
  const visible = items.slice(0, MAX_THUMBS)
  const overflow = items.length - MAX_THUMBS
  return (
    <div className="flex items-center">
      {visible.map((item, i) => (
        <div
          key={item.id}
          className="relative shrink-0 overflow-hidden rounded-md bg-shimmer border border-border-light"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginLeft: i > 0 ? -THUMB_OVERLAP : 0,
            zIndex: MAX_THUMBS - i,
          }}
        >
          <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="relative shrink-0 flex items-center justify-center rounded-md bg-background border border-border text-text-muted"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginLeft: -THUMB_OVERLAP,
            zIndex: 0,
          }}
        >
          <span className="text-[11px] font-semibold" style={TABNUM}>+{overflow}</span>
        </div>
      )}
    </div>
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
        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0',
        checked ? 'bg-primary border-primary' : 'bg-surface border-border hover:border-primary',
      ].join(' ')}
    >
      {checked && <Check size={14} className="text-white" strokeWidth={3} />}
    </button>
  )
}

function SlaIndicator({ order, t, lang }: { order: SellerSubOrder; t: (k: string, opts?: Record<string, unknown>) => string; lang?: string }) {
  const sla = computeShipBy(order)
  if (!sla) return null
  const dateStr = sla.date.toLocaleDateString(getLocale(lang), { month: 'short', day: 'numeric' })
  const text = sla.isOverdue
    ? t('seller.orders.slaOverdue')
    : sla.isDueToday
      ? t('seller.orders.slaDueToday')
      : t('seller.orders.slaShipBy', { date: dateStr })
  const color = sla.isOverdue || sla.isDueToday ? 'text-warning' : 'text-text-muted'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-semibold ${color}`}
      aria-label={text}
    >
      <Clock size={12} className={color} aria-hidden="true" />
      {text}
    </span>
  )
}

function ActionButton({
  order,
  onAction,
  t,
}: {
  order: SellerSubOrder
  onAction?: (order: SellerSubOrder) => void
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const reduced = useReducedMotion()
  const config = ACTION_MAP[order.statusKey]
  if (!config) return null
  const Icon = config.Icon
  const label = t(config.labelKey)
  const aria = t(config.ariaKey, { id: order.orderId })
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAction?.(order)
    },
    [order, onAction],
  )
  const isPrimary = order.statusKey === 'new' || order.statusKey === 'to_pack' || order.statusKey === 'to_ship'
  if (isPrimary) {
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={reduced ? undefined : { scale: 1.03 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-2 text-sm font-semibold hover:bg-primary-dark transition-colors min-h-[36px]"
        aria-label={aria}
      >
        <Icon size={15} className="shrink-0" />
        {label}
      </motion.button>
    )
  }
  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={reduced ? undefined : { scale: 1.03 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface text-text px-3 py-2 text-sm font-semibold hover:bg-background transition-colors min-h-[36px]"
      aria-label={aria}
    >
      <Icon size={15} className="shrink-0 text-text-muted" />
      {label}
    </motion.button>
  )
}

export function SellerOrderRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 h-[72px] border-b border-border-light" aria-busy="true" role="row">
      <Skeleton width={20} height={20} borderRadius={6} />
      <div className="min-w-0 w-24">
        <Skeleton width="80%" height={14} />
        <div className="mt-1.5"><Skeleton width="50%" height={10} /></div>
      </div>
      <Skeleton width={72} height={32} borderRadius={8} />
      <div className="flex-1 min-w-0 max-w-[200px]">
        <Skeleton width="70%" height={14} />
      </div>
      <Skeleton width={72} height={16} />
      <Skeleton width={56} height={20} borderRadius={9999} />
      <Skeleton width={90} height={32} borderRadius={6} />
    </div>
  )
}

const SellerOrderRow = memo(function SellerOrderRow({
  order,
  selected = false,
  onToggleSelect,
  onPress,
  onAction,
  index = 0,
  loading = false,
  testID,
}: SellerOrderRowProps) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const lang = i18n.language

  if (loading) return <SellerOrderRowSkeleton />

  const isNew = order.statusKey === 'new'
  const statusMeta = STATUS_META[order.statusKey]
  const statusLabel = t(statusMeta.labelKey)
  const ariaLabel = t('seller.orders.rowAria', {
    id: order.orderId,
    buyer: order.buyerName,
    total: formatNPR(order.total),
    status: statusLabel,
  })

  const handleRowClick = useCallback(() => {
    onPress?.(order)
  }, [order, onPress])

  const handleCheckboxClick = useCallback(
    () => {
      onToggleSelect?.(order.subOrderId)
    },
    [order.subOrderId, onToggleSelect],
  )

  return (
    <motion.tr
      data-testid={testID}
      role="row"
      aria-label={ariaLabel}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1, backgroundColor: isNew ? 'rgba(124, 58, 237, 0.06)' : 'rgba(255, 255, 255, 1)' }}
      transition={reduced ? { duration: 0 } : { duration: duration.normal / 1000, delay: Math.min(index * 0.03, 0.2), backgroundColor: { duration: 0.6, ease: 'easeOut' } }}
      onClick={handleRowClick}
      className={`group h-[72px] cursor-pointer border-b border-[#E5E5E5] transition-colors duration-200 hover:bg-primary/[0.03] ${
        isNew ? 'bg-primary/[0.06]' : 'bg-surface'
      }`}
    >
      {onToggleSelect && (
        <td className="px-4 py-3 w-12">
          <Checkbox
            checked={selected}
            onChange={handleCheckboxClick}
            ariaLabel={t('seller.orders.selectOrder', { id: order.orderId })}
          />
        </td>
      )}

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isNew && <span className="h-9 w-1 rounded-full bg-primary" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-text tabular-nums truncate" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {order.orderId}
            </p>
            <p className="text-[12px] font-normal text-text-muted truncate">
              {formatDate(order.createdAt, lang)} · {formatTime(order.createdAt)}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 hidden lg:table-cell">
        <p className="text-sm font-normal text-text truncate">{order.buyerName}</p>
        <p className="text-sm font-normal text-text-muted truncate">{order.city}, {order.district}</p>
      </td>

      <td className="px-4 py-3 max-w-[240px]">
        <div className="flex items-center gap-2.5">
          <ThumbStack items={order.items} />
          <span className="text-sm font-normal text-text-muted shrink-0" style={TABNUM}>
            {order.itemCount} {order.itemCount === 1 ? t('seller.orders.item') : t('seller.orders.items')}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm font-semibold text-text tabular-nums" style={TABNUM}>
          {formatNPR(order.total)}
        </span>
      </td>

      <td className="px-4 py-3 hidden xl:table-cell">
        <PaymentChip order={order} t={t} />
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm font-normal text-text-muted tabular-nums" style={TABNUM}>
          {formatDate(order.createdAt, lang)}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <StatusPill statusKey={order.statusKey} t={t} />
          {order.labelPrinted && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success"
              aria-label={t('seller.orders.labelPrintedChipAria')}
            >
              <Printer size={11} aria-hidden="true" />
              {t('seller.orders.labelPrintedChip')}
            </span>
          )}
          {order.actionNeeded && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-error" title={order.actionReason ?? undefined}>
              <AlertTriangle size={12} />
              {t('seller.orders.actionNeededLabel')}
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-3 hidden xl:table-cell">
        <SlaIndicator order={order} t={t} lang={lang} />
      </td>

      <td className="px-4 py-3 text-right">
        <ActionButton order={order} onAction={onAction} t={t} />
      </td>
    </motion.tr>
  )
})

export default SellerOrderRow
