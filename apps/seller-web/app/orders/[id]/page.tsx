'use client'

import React, { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion, OrderStatusTimeline } from '@chinooz/ui-web'
import FulfillmentActionBar from '@/components/FulfillmentActionBar'
import { useSellerOrderById } from '@chinooz/hooks'
import { useSellerSessionStore } from '@chinooz/state'
import { analytics } from '@chinooz/analytics'
import { formatNPR } from '@chinooz/utils'
import { duration, easing } from '@chinooz/theme'
import type {
  SellerSubOrder,
  SellerOrderStatusKey,
  TimelineStep,
  TimelineStepStatus,
} from '@chinooz/types'

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

const STEP_KEYS = ['ordered', 'confirmed', 'packed', 'shipped', 'delivered'] as const

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length < 6) return phone
  const start = digits.slice(0, 2)
  const end = digits.slice(-2)
  return `${start}XXXXXX${end}`
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

function buildTimelineSteps(order: SellerSubOrder, t: (k: string) => string): TimelineStep[] {
  const statusOrderMap: Record<SellerOrderStatusKey, number> = {
    new: 0,
    to_pack: 1,
    to_ship: 2,
    shipped: 3,
    completed: 4,
    cancelled_returned: -1,
    action_needed: -1,
  }

  const isCancelled = order.statusKey === 'cancelled_returned' && order.status === 'cancelled'
  const isReturned = order.statusKey === 'cancelled_returned' && order.status === 'returned'
  const currentIdx = statusOrderMap[order.statusKey]

  const labelMap: Record<string, string> = {
    ordered: t('seller.orders.tabNew'),
    confirmed: t('seller.orders.tabToPack'),
    packed: t('seller.orders.tabToShip'),
    shipped: t('seller.orders.tabShipped'),
    delivered: t('seller.orders.tabCompleted'),
    cancelled: t('seller.orders.tabCancelledReturned'),
    returned: t('seller.orders.tabCancelledReturned'),
  }

  const steps: TimelineStep[] = []
  for (let i = 0; i < STEP_KEYS.length; i++) {
    const key = STEP_KEYS[i]
    let status: TimelineStepStatus = 'upcoming'
    if (isCancelled || isReturned) {
      status = i < currentIdx ? 'completed' : 'upcoming'
    } else if (i < currentIdx) {
      status = 'completed'
    } else if (i === currentIdx) {
      status = 'current'
    }
    const ts = i === 0 ? order.createdAt : status === 'completed' || status === 'current' ? order.createdAt : undefined
    steps.push({
      key,
      label: labelMap[key] ?? key,
      status,
      timestamp: ts,
    })
  }

  if (isCancelled) {
    steps.push({ key: 'cancelled', label: labelMap['cancelled'], status: 'current', timestamp: order.createdAt })
  } else if (isReturned) {
    steps.push({ key: 'returned', label: labelMap['returned'], status: 'current', timestamp: order.createdAt })
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

function SectionHeader({ title, id }: { title: string; id: string }) {
  return (
    <div className="space-y-2" aria-labelledby={id}>
      <h3 id={id} className="text-[18px] font-semibold text-text">{title}</h3>
      <div className="h-px bg-border" />
    </div>
  )
}

function StatusPill({ statusKey, t }: { statusKey: SellerOrderStatusKey; t: (k: string) => string }) {
  const m = STATUS_META[statusKey]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${m.bg} ${m.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden="true" />
      {t(m.labelKey)}
    </span>
  )
}

function SlaIndicator({ order, t }: { order: SellerSubOrder; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const sla = computeShipBy(order)
  if (!sla) return null
  const dateStr = formatDateShort(sla.date.toISOString())
  const text = sla.isOverdue
    ? t('seller.orders.slaOverdue')
    : sla.isDueToday
      ? t('seller.orders.slaDueToday')
      : t('seller.orders.slaShipBy', { date: dateStr })
  const color = sla.isOverdue || sla.isDueToday ? 'text-warning' : 'text-text-muted'
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${color}`} aria-label={text}>
      <Clock size={12} className={color} aria-hidden="true" />
      {text}
    </span>
  )
}

function PaymentChip({ order, t }: { order: SellerSubOrder; t: (k: string) => string }) {
  const isCod = order.paymentType === 'cod'
  const isPaid = !isCod
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${
        isCod ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
      }`}>
        {isCod ? t('seller.orders.paymentCod') : t('seller.orders.paymentPrepaid')}
      </span>
      <span className={`text-[12px] font-medium ${isPaid ? 'text-success' : 'text-text-muted'}`}>
        {isPaid ? t('seller.orders.paid') : t('seller.orders.unpaid')}
      </span>
    </div>
  )
}

function SummaryLine({ label, value, muted, suffix }: { label: string; value: number; muted?: boolean; suffix?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? 'text-text-muted' : 'text-text'}`}>{label}</span>
      <span className="text-sm text-text tabular-nums" style={TABNUM}>
        {formatNPR(Math.abs(value))}{suffix ? ` ${suffix}` : ''}
      </span>
    </div>
  )
}

export default function SellerOrderDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const sellerId = useSellerSessionStore(s => s.sellerId)

  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const { data: order, isLoading, isError } = useSellerOrderById(sellerId ?? null, id || null)

  React.useEffect(() => {
    analytics.screen({ name: 'seller-order-detail' })
  }, [])

  React.useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  const timelineSteps = useMemo(() => {
    if (!order) return []
    return buildTimelineSteps(order, t)
  }, [order, t])

  if (!isLoggedIn) return null

  if (isLoading) {
    return (
      <Screen>
        <Container className="py-6 max-w-[800px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-border-light animate-pulse" />
            <div className="h-6 w-48 rounded bg-border-light animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-32 rounded-xl bg-border-light animate-pulse" />
            <div className="h-24 rounded-xl bg-border-light animate-pulse" />
            <div className="h-48 rounded-xl bg-border-light animate-pulse" />
            <div className="h-32 rounded-xl bg-border-light animate-pulse" />
          </div>
        </Container>
      </Screen>
    )
  }

  if (isError || !order) {
    return (
      <Screen>
        <Container className="py-6 max-w-[800px]">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/orders')}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-background transition-colors"
              aria-label={t('seller.orders.detailBack')}
            >
              <ArrowLeft size={20} className="text-text" />
            </button>
            <h1 className="text-xl font-bold text-text">{t('seller.orders.detail')}</h1>
          </div>
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <span className="text-5xl mb-4">😕</span>
            <h3 className="text-lg font-semibold text-text">{t('seller.orders.detailNotFound')}</h3>
            <p className="text-sm text-text-muted mt-2">{t('seller.orders.detailNotFoundSub')}</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 px-5 py-2.5 rounded-md border border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors"
            >
              {t('seller.orders.detailBack')}
            </button>
          </div>
        </Container>
      </Screen>
    )
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vatAmount = Math.round((subtotal * 0.13) / 1.13)
  const deliveryFee = Math.max(0, order.total - subtotal)
  const discount = subtotal + deliveryFee - order.total > 0 ? subtotal + deliveryFee - order.total : 0
  const maskedPhone = maskPhone(order.buyerPhone)

  return (
    <Screen>
      <Container className="py-6 max-w-[800px] pb-24">
        {/* Back + title */}
        <SectionReveal delay={0}>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/orders')}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-background transition-colors"
              aria-label={t('seller.orders.detailBack')}
            >
              <ArrowLeft size={20} className="text-text" />
            </button>
            <h1 className="text-xl font-bold text-text">{t('seller.orders.detail')}</h1>
          </div>
        </SectionReveal>

        {/* Header card */}
        <SectionReveal delay={0}>
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3 mb-6" aria-labelledby="order-header-heading">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="order-header-heading" className="text-[22px] font-semibold text-text" style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {order.orderId}
                </h2>
                <p className="text-sm text-text-muted mt-0.5">
                  {t('seller.orders.orderDate')}: {formatDateLong(order.createdAt)}
                </p>
              </div>
              <StatusPill statusKey={order.statusKey} t={t} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <PaymentChip order={order} t={t} />
              <SlaIndicator order={order} t={t} />
            </div>

            {order.actionNeeded && (
              <div className="flex items-center gap-2 text-sm font-semibold text-error bg-error/5 rounded-lg px-3 py-2">
                <AlertTriangle size={16} />
                <span>{order.actionReason ?? t('seller.orders.actionNeededLabel')}</span>
              </div>
            )}

            {order.estimatedDelivery && order.statusKey !== 'completed' && order.statusKey !== 'cancelled_returned' && (
              <p className="text-sm text-primary font-medium">
                {t('seller.orders.estimatedDelivery')}: {formatDateShort(order.estimatedDelivery)}
              </p>
            )}
          </div>
        </SectionReveal>

        {/* Items */}
        <SectionReveal delay={50}>
          <div className="space-y-3 mb-6" aria-labelledby="items-heading">
            <SectionHeader title={t('seller.orders.sectionItems')} id="items-heading" />
            <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3">
              {order.items.map((item) => {
                const variantText = item.name.split('—')[1]?.trim() || item.sku
                const lineTotal = item.price * item.quantity
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover bg-shimmer shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-base text-text truncate">{item.name.split('—')[0]?.trim() || item.name}</p>
                      {variantText && (
                        <span className="inline-flex items-center rounded-full bg-background border border-border-light px-2 py-0.5 text-xs font-medium text-text-secondary">
                          {variantText}
                        </span>
                      )}
                      <p className="text-xs text-text-muted">
                        {t('seller.orders.qty')}: {item.quantity} · {formatNPR(item.price)} {t('seller.orders.each')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-text tabular-nums shrink-0" style={TABNUM}>
                      {formatNPR(lineTotal)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </SectionReveal>

        {/* Price breakdown */}
        <SectionReveal delay={100}>
          <div className="space-y-3 mb-6" aria-labelledby="price-heading">
            <SectionHeader title={t('seller.orders.sectionPriceBreakdown')} id="price-heading" />
            <div className="bg-surface rounded-xl border border-border-light p-4 space-y-2">
              <SummaryLine label={t('seller.orders.subtotal')} value={subtotal} />
              <SummaryLine label={t('seller.orders.vatIncl')} value={vatAmount} muted />
              <SummaryLine label={t('seller.orders.deliveryFee')} value={deliveryFee} />
              {discount > 0 && <SummaryLine label={t('seller.orders.discount')} value={-discount} muted />}
              <div className="h-px bg-border-light my-1" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-text">{t('seller.orders.total')}</span>
                <span className="text-base font-bold text-text tabular-nums" style={TABNUM}>
                  {formatNPR(order.total)}
                </span>
              </div>
              <p className="text-[12px] text-text-muted">{t('seller.orders.payoutRelevant')}</p>
            </div>
          </div>
        </SectionReveal>

        {/* Buyer & shipping */}
        <SectionReveal delay={150}>
          <div className="space-y-3 mb-6" aria-labelledby="buyer-heading">
            <SectionHeader title={t('seller.orders.sectionBuyer')} id="buyer-heading" />
            <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3 shadow-sm">
              <div>
                <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">{t('seller.orders.buyerName')}</p>
                <p className="text-base font-medium text-text">{order.buyerName}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">{t('seller.orders.contact')}</p>
                <p className="text-sm text-text tabular-nums" style={TABNUM} aria-label={`${t('seller.orders.contactMasked')}: ${maskedPhone}`}>
                  {maskedPhone}
                </p>
              </div>
              <div className="h-px bg-border-light" />
              <div>
                <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">{t('seller.orders.deliveryAddress')}</p>
                <p className="text-sm text-text">{order.city}, {order.district}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">{t('seller.orders.deliveryMethod')}</p>
                  <p className="text-sm text-text capitalize">{order.shippingMethod}</p>
                </div>
                {order.estimatedDelivery && (
                  <div className="text-right">
                    <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">{t('seller.orders.estimatedDelivery')}</p>
                    <p className="text-sm text-text">{formatDateShort(order.estimatedDelivery)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionReveal>

        {/* Timeline */}
        <SectionReveal delay={200}>
          <div className="space-y-3 mb-6" aria-labelledby="timeline-heading">
            <SectionHeader title={t('seller.orders.sectionTimeline')} id="timeline-heading" />
            <div className="bg-surface rounded-xl border border-border-light p-4">
              <OrderStatusTimeline steps={timelineSteps} isCod={order.paymentType === 'cod'} />
            </div>
          </div>
        </SectionReveal>
      </Container>

      {/* Sticky action bar */}
      <FulfillmentActionBar
        order={order}
        t={t}
        onContact={() => router.push(`/messages?order=${order.orderId}`)}
        onNavigateBack={() => router.push('/orders')}
      />
    </Screen>
  )
}
