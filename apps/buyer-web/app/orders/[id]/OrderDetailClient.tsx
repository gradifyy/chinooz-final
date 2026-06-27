'use client'

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion, OrderStatusTimeline, EmptyState } from '@chinooz/ui-web'
import { duration, easing } from '@chinooz/theme'
import { useSessionStore } from '@chinooz/state'
import { OrderDetailSkeleton } from '../../components/skeletons'
import type { Order, OrderStatus, CartItem, TimelineStep, ShipmentTimeline } from '@chinooz/types'

const OrderActions = dynamic(() => import('../../components/OrderActions'), { ssr: false }) as React.ComponentType<{ order: Order; onScrollToTimeline?: () => void }>

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-warning-light', text: 'text-warning' },
  confirmed: { bg: 'bg-info-light', text: 'text-info' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-600' },
  shipped: { bg: 'bg-sky-100', text: 'text-sky-600' },
  delivered: { bg: 'bg-success-light', text: 'text-success' },
  cancelled: { bg: 'bg-error-light', text: 'text-error' },
  returned: { bg: 'bg-amber-100', text: 'text-amber-600' },
}

function groupBySeller(items: CartItem[]): Map<string, CartItem[]> {
  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const seller = item.name.split('—')[0]?.trim() || item.name
    if (!groups.has(seller)) groups.set(seller, [])
    groups.get(seller)!.push(item)
  }
  return groups
}

const ALL_STEPS = ['ordered', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const

function buildTimelineSteps(order: Order, t: (key: string) => string): TimelineStep[] {
  const timelineMap = new Map<string, { timestamp: string; note?: string }>()
  for (const entry of order.timeline) {
    timelineMap.set(entry.status, { timestamp: entry.timestamp, note: entry.note })
  }

  const isCancelled = order.status === 'cancelled'
  const isReturned = order.status === 'returned'
  const lastTimelineStatus = order.timeline[order.timeline.length - 1]?.status

  const labelMap: Record<string, string> = {
    ordered: t('orders.ordered'),
    pending: t('orders.ordered'),
    confirmed: t('orders.confirmed'),
    processing: t('orders.packed'),
    packed: t('orders.packed'),
    shipped: t('orders.shipped'),
    out_for_delivery: t('orders.outForDelivery'),
    delivered: t('orders.delivered'),
    cancelled: t('orders.cancelled'),
    returned: t('orders.returned'),
  }

  const steps: TimelineStep[] = []

  for (const stepKey of ALL_STEPS) {
    const statusKey = stepKey === 'ordered' ? 'pending' : stepKey === 'packed' ? 'processing' : stepKey
    const entry = timelineMap.get(statusKey)

    if (entry) {
      let stepStatus: 'completed' | 'current' | 'upcoming' = 'completed'
      if (statusKey === lastTimelineStatus && !isCancelled && !isReturned) {
        stepStatus = 'current'
      }
      steps.push({
        key: stepKey,
        label: labelMap[stepKey] || stepKey,
        status: stepStatus,
        timestamp: entry.timestamp,
        note: entry.note,
      })
    } else {
      const stepIndex = ALL_STEPS.indexOf(stepKey)
      const mappedLast = lastTimelineStatus === 'pending' ? 'ordered' :
        lastTimelineStatus === 'processing' ? 'packed' :
        lastTimelineStatus as typeof ALL_STEPS[number]
      const lastCompletedIndex = ALL_STEPS.indexOf(mappedLast)

      if (isCancelled || isReturned) {
        steps.push({ key: stepKey, label: labelMap[stepKey] || stepKey, status: 'upcoming' })
      } else if (stepIndex <= lastCompletedIndex) {
        steps.push({ key: stepKey, label: labelMap[stepKey] || stepKey, status: 'completed' })
      } else if (stepIndex === lastCompletedIndex + 1) {
        steps.push({ key: stepKey, label: labelMap[stepKey] || stepKey, status: 'current' })
      } else {
        steps.push({ key: stepKey, label: labelMap[stepKey] || stepKey, status: 'upcoming' })
      }
    }
  }

  if (isCancelled) {
    const entry = timelineMap.get('cancelled')
    steps.push({ key: 'cancelled', label: labelMap['cancelled'], status: 'current', timestamp: entry?.timestamp, note: entry?.note })
  } else if (isReturned) {
    const entry = timelineMap.get('returned')
    steps.push({ key: 'returned', label: labelMap['returned'], status: 'current', timestamp: entry?.timestamp, note: entry?.note })
  }

  return steps
}

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : duration.normal / 1000,
        ease: easing.easeOut as any,
        delay: reduced ? 0 : delay / 1000,
      }}
    >
      {children}
    </motion.div>
  )
}

function SectionHeader({ title, id }: { title: string; id?: string }) {
  return (
    <div className="space-y-2" aria-labelledby={id}>
      <h3 id={id} className="text-lg font-semibold text-text">{title}</h3>
      <div className="h-px bg-border" />
    </div>
  )
}

function OrderItemRow({ item }: { item: CartItem }) {
  const { t } = useTranslation()
  const router = useRouter()
  const lineTotal = item.price * item.quantity
  const variantText = item.name.split('—')[1]?.trim()

  return (
    <button
      onClick={() => router.push(`/product/${item.productId}`)}
      className="flex items-center gap-3 w-full text-left hover:bg-background rounded-lg p-1 -m-1 transition-colors cursor-pointer"
      aria-label={`${item.name}${variantText ? `, ${variantText}` : ''}, ${t('orders.quantity')} ${item.quantity}, ${formatNPR(lineTotal)}`}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg bg-shimmer overflow-hidden flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-base text-text truncate">
          {item.name.split('—')[0]?.trim() || item.name}
        </p>
        {variantText && (
          <p className="text-xs font-medium text-text-muted">{variantText}</p>
        )}
        <p className="text-xs text-text-muted">
          {t('orders.quantity')}: {item.quantity}
        </p>
      </div>

      {/* Price */}
      <span className="text-sm font-semibold text-text tabular-nums flex-shrink-0">
        {formatNPR(lineTotal)}
      </span>
    </button>
  )
}

function SubOrderCard({
  sellerName,
  items,
  index,
}: {
  sellerName: string
  items: CartItem[]
  index: number
}) {
  const { t } = useTranslation()

  return (
    <SectionReveal delay={200 + index * 50}>
      <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3">
        {/* Seller header */}
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-text">{sellerName}</h4>
          <span className="bg-background rounded-full px-2 py-0.5 text-xs font-semibold text-text-muted">
            {items.length} {items.length === 1 ? t('orders.item') : t('orders.items')}
          </span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </SectionReveal>
  )
}

function PriceBreakdown({ order }: { order: Order }) {
  const { t } = useTranslation()
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vatAmount = Math.round(subtotal * 0.13 / 1.13)
  const deliveryFee = order.total > subtotal ? order.total - subtotal : 0
  const discount = subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0

  return (
    <div
      className="bg-surface rounded-xl border border-border-light p-4 space-y-2"
      aria-label={`Order total: ${formatNPR(order.total)}`}
    >
      <SummaryLine label={t('orders.subtotal')} value={subtotal} />
      <SummaryLine label={t('orders.vatInclusive')} value={vatAmount} muted />
      <SummaryLine label={t('orders.deliveryFee')} value={deliveryFee} />
      {discount > 0 && (
        <SummaryLine label={t('orders.discount')} value={-discount} muted />
      )}
      <div className="h-px bg-border-light my-1" />
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-text">{t('orders.grandTotal')}</span>
        <span className="text-base font-bold text-text tabular-nums">
          {formatNPR(order.total)}
        </span>
      </div>
    </div>
  )
}

function SummaryLine({
  label,
  value,
  muted,
}: {
  label: string
  value: number
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? 'text-text-muted' : 'text-text'}`}>{label}</span>
      <span className="text-sm text-text tabular-nums">{formatNPR(Math.abs(value))}</span>
    </div>
  )
}

export default function OrderDetailClient({ order, isError }: { order: Order | null; isError?: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const [isOffline, setIsOffline] = useState(false)

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    setIsOffline(typeof window !== 'undefined' && !navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Logged-out state
  if (!isLoggedIn) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('orders.orderDetail')}</h1>
        </div>
        <EmptyState
          icon={<span className="text-5xl">🔒</span>}
          title={t('orders.signInPrompt')}
          action={{ label: t('orders.signIn'), onPress: () => router.push('/phone-entry') }}
        />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('orders.orderDetail')}</h1>
        </div>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-8"
        >
          <span className="text-5xl mb-4">⚠️</span>
          <h3 className="text-lg font-semibold text-text text-center">{t('orders.errorTitle')}</h3>
          <p className="text-sm text-text-muted text-center mt-2">{t('orders.errorSubtitle')}</p>
          <button
            onClick={() => router.push('/orders')}
            className="mt-4 px-5 py-2.5 rounded-xl border-[1.5px] border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors"
            aria-label={t('orders.backToOrders')}
          >
            {t('orders.backToOrders')}
          </button>
        </motion.div>
      </div>
    )
  }

  // Not found state
  if (!order) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('orders.orderDetail')}</h1>
        </div>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-8"
        >
          <span className="text-5xl mb-4">😕</span>
          <h3 className="text-lg font-semibold text-text text-center">{t('orders.notFound')}</h3>
          <p className="text-sm text-text-muted text-center mt-2">{t('orders.notFoundSubtitle')}</p>
          <button
            onClick={() => router.push('/orders')}
            className="mt-4 px-5 py-2.5 rounded-xl border-[1.5px] border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors"
            aria-label={t('orders.backToOrders')}
          >
            {t('orders.backToOrders')}
          </button>
        </motion.div>
      </div>
    )
  }

  const statusStyle = STATUS_COLORS[order.status]

  const sellerGroups = useMemo(() => {
    return [...groupBySeller(order.items).entries()]
  }, [order.items])

  const timelineSteps = useMemo(() => {
    return buildTimelineSteps(order, t)
  }, [order, t])

  const shipments = useMemo((): ShipmentTimeline[] | undefined => {
    if (sellerGroups.length <= 1) return undefined
    return sellerGroups.map(([sellerName]) => ({
      sellerName,
      steps: timelineSteps,
      estimatedDelivery: order.estimatedDelivery,
    }))
  }, [sellerGroups, timelineSteps, order.estimatedDelivery])

  return (
    <div className="space-y-5">
      {/* Offline banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={reduced ? false : { y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: -48, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
            className="sticky top-16 z-40 bg-warning-light border-b border-warning px-4 py-2 -mx-4 md:-mx-6 lg:-mx-8"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-sm font-semibold text-[#92400E]">
                {t('orders.offlineCached')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button */}
      <SectionReveal delay={0}>
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('orders.orderDetail')}</h1>
        </div>
      </SectionReveal>

      {/* Header */}
      <SectionReveal delay={0}>
        <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-text">
              {order.id.toUpperCase()}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
            >
              {t(`orders.${order.status}`)}
            </span>
          </div>
          <p className="text-sm text-text-muted">
            {t('orders.orderDate')}:{' '}
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {order.estimatedDelivery &&
            order.status !== 'delivered' &&
            order.status !== 'cancelled' &&
            order.status !== 'returned' && (
              <p className="text-sm text-primary font-medium">
                {t('orders.estimatedDelivery')}:{' '}
                {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
        </div>
      </SectionReveal>

      {/* Status Timeline */}
      <SectionReveal delay={50}>
        <div className="space-y-3">
          <SectionHeader title={t('orders.statusTimeline')} id="timeline-heading" />
          <OrderStatusTimeline
            steps={timelineSteps}
            shipments={shipments}
          />
        </div>
      </SectionReveal>

      {/* Sub-orders / Seller breakdown */}
      <SectionReveal delay={100}>
        <div className="space-y-3">
          <SectionHeader title={t('orders.orderItems')} id="items-heading" />
          {sellerGroups.length > 1 ? (
            <div className="space-y-3">
              {sellerGroups.map(([sellerName, items], index) => (
                <SubOrderCard
                  key={sellerName}
                  sellerName={sellerName}
                  items={items}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border-light p-4 space-y-2">
              {order.items.map((item) => (
                <OrderItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </SectionReveal>

      {/* Delivery Address */}
      <SectionReveal delay={150}>
        <div className="space-y-3">
          <SectionHeader title={t('orders.deliveryAddress')} id="address-heading" />
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-1">
            <p className="text-sm font-semibold text-text">{order.address.fullName}</p>
            <p className="text-xs text-text-muted">{order.address.phone}</p>
            <p className="text-xs text-text-muted">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ''}
            </p>
            <p className="text-xs text-text-muted">
              {order.address.city}, {order.address.district}, {order.address.province}
            </p>
            {order.address.postalCode && (
              <p className="text-xs text-text-muted">{order.address.postalCode}</p>
            )}
          </div>
        </div>
      </SectionReveal>

      {/* Price Breakdown */}
      <SectionReveal delay={200}>
        <div className="space-y-3">
          <SectionHeader title={t('orders.paymentSummary')} id="payment-heading" />
          <PriceBreakdown order={order} />
        </div>
      </SectionReveal>

      {/* Order Actions */}
      <SectionReveal delay={250}>
        <OrderActions order={order} />
      </SectionReveal>
    </div>
  )
}
