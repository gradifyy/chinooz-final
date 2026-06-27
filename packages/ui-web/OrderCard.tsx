'use client'

import React, { useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from './hooks/useReducedMotion'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'
import type { OrderCardProps, Order, OrderStatus } from '@chinooz/types'

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]' },
  confirmed: { bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]' },
  processing: { bg: 'bg-[#DBEAFE]', text: 'text-[#2563EB]' },
  shipped: { bg: 'bg-[#DBEAFE]', text: 'text-[#2563EB]' },
  delivered: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]' },
  cancelled: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]' },
  returned: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]' },
}

const ACTION_CONFIG: Record<string, { labelKey: string; variant: 'primary' | 'outline' | 'text' }> = {
  pending: { labelKey: 'orderCard.payNow', variant: 'primary' },
  confirmed: { labelKey: 'orderCard.payNow', variant: 'primary' },
  processing: { labelKey: 'orderCard.viewDetails', variant: 'text' },
  shipped: { labelKey: 'orderCard.track', variant: 'outline' },
  delivered: { labelKey: 'orderCard.buyAgain', variant: 'outline' },
  cancelled: { labelKey: 'orderCard.viewDetails', variant: 'text' },
  returned: { labelKey: 'orderCard.viewDetails', variant: 'text' },
}

const MAX_VISIBLE_THUMBS = 4
const THUMB_SIZE = 48
const THUMB_OVERLAP = 8

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusPill({ status }: { status: OrderStatus }) {
  const { t } = useTranslation()
  const c = STATUS_COLORS[status]
  const label = t(`orderCard.status.${status}`)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}
      aria-label={label}
    >
      {label}
    </span>
  )
}

function ThumbStack({ items, firstThumbId }: { items: Order['items']; firstThumbId?: string }) {
  const visible = items.slice(0, MAX_VISIBLE_THUMBS)
  const overflow = items.length - MAX_VISIBLE_THUMBS

  return (
    <div className="flex items-center">
      {visible.map((item, i) => (
        <motion.div
          key={item.id}
          layoutId={i === 0 ? firstThumbId : undefined}
          transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
          className="relative shrink-0 overflow-hidden rounded-md bg-shimmer"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginLeft: i > 0 ? -THUMB_OVERLAP : 0,
            zIndex: MAX_VISIBLE_THUMBS - i,
          }}
        >
          <SafeImage
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
      ))}
      {overflow > 0 && (
        <div
          className="relative shrink-0 flex items-center justify-center rounded-md bg-surface border border-border"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginLeft: -THUMB_OVERLAP,
            zIndex: 0,
          }}
        >
          <span className="text-xs font-semibold text-text-muted">+{overflow}</span>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  order,
  onAction,
}: {
  order: Order
  onAction?: (order: Order) => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const config = ACTION_CONFIG[order.status] ?? ACTION_CONFIG.cancelled!
  const label = t(config.labelKey)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAction?.(order)
    },
    [order, onAction],
  )

  if (config.variant === 'primary') {
    return (
      <motion.button
        onClick={handleClick}
        whileHover={reduced ? {} : { scale: 1.03 }}
        whileTap={reduced ? {} : { scale: 0.97 }}
        className="bg-primary text-white rounded-md px-3.5 py-2 text-sm font-semibold hover:bg-primary-dark transition-colors min-h-[36px] flex items-center justify-center"
        aria-label={`${label} for order ${order.id}`}
      >
        {label}
      </motion.button>
    )
  }

  if (config.variant === 'outline') {
    return (
      <motion.button
        onClick={handleClick}
        whileHover={reduced ? {} : { scale: 1.03 }}
        whileTap={reduced ? {} : { scale: 0.97 }}
        className="border-[1.5px] border-primary text-primary rounded-md px-3.5 py-2 text-sm font-semibold hover:bg-primary-50 transition-colors min-h-[36px] flex items-center justify-center"
        aria-label={`${label} for order ${order.id}`}
      >
        {label}
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={handleClick}
      whileHover={reduced ? {} : { x: 2 }}
      className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
      aria-label={`${label} for order ${order.id}`}
    >
      {label}
      <span className="text-base">›</span>
    </motion.button>
  )
}

const OrderCard = memo(function OrderCard({
  order,
  sellerName,
  shipmentCount,
  onPress,
  onAction,
  className = '',
  testID,
}: OrderCardProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const itemCount = order.items.length
  const firstThumbId = `order-thumb-${order.id}`
  const a11yLabel = `Order ${order.id}, ${STATUS_COLORS[order.status].text} status, ${formatNPR(order.total)}, ${itemCount} item${itemCount !== 1 ? 's' : ''}`

  return (
    <motion.button
      data-testid={testID}
      onClick={() => onPress?.(order)}
      whileHover={reduced ? {} : { scale: 1.01 }}
      whileTap={reduced ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', damping: 15, stiffness: 400 }}
      className={`w-full text-left bg-surface rounded-xl p-4 shadow-sm flex flex-col gap-2.5 ${className}`}
      aria-label={a11yLabel}
    >
      {/* Header row: order id + date */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text truncate mr-2">{order.id}</span>
        <span className="text-xs text-text-muted shrink-0">{formatDate(order.createdAt)}</span>
      </div>

      {/* Seller / store name */}
      <p className="text-sm text-text-muted truncate">
        {sellerName ?? t('orderCard.multipleSellers')}
      </p>

      {/* Status pill + multi-seller shipment pill */}
      <div className="flex items-center gap-2">
        <StatusPill status={order.status} />
        {shipmentCount != null && shipmentCount > 1 && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-background border border-border text-text-muted">
            {t('orderCard.shipments', { count: shipmentCount })}
          </span>
        )}
      </div>

      {/* Thumbnails + item count */}
      <div className="flex items-center justify-between">
        <ThumbStack items={order.items} firstThumbId={firstThumbId} />
        <span className="text-xs text-text-muted">
          {itemCount} {itemCount === 1 ? t('orderCard.item') : t('orderCard.items')}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-light" />

      {/* Footer: total + action */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-primary tabular-nums">
          {formatNPR(order.total)}
        </span>
        <ActionButton order={order} onAction={onAction} />
      </div>
    </motion.button>
  )
})

export default OrderCard

export function OrderCardSkeleton({ testID }: { testID?: string }) {
  return (
    <div
      data-testid={testID}
      className="w-full text-left bg-surface rounded-xl p-4 shadow-sm flex flex-col gap-2.5"
      aria-busy="true"
      aria-label="Loading order"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width={120} height={14} borderRadius={4} />
        <Skeleton width={90} height={12} borderRadius={4} />
      </div>

      {/* Seller */}
      <Skeleton width="50%" height={14} borderRadius={4} />

      {/* Status pill */}
      <div className="flex items-center gap-2">
        <Skeleton width={72} height={22} borderRadius={9999} />
      </div>

      {/* Thumbnails row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -THUMB_OVERLAP : 0 }}>
              <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={8} />
            </div>
          ))}
        </div>
        <Skeleton width={50} height={12} borderRadius={4} />
      </div>

      {/* Divider */}
      <div className="h-px bg-border-light" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton width={100} height={16} borderRadius={4} />
        <Skeleton width={90} height={36} borderRadius={8} />
      </div>
    </div>
  )
}
