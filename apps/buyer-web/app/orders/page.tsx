'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen, EmptyState } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import { getOrders } from '@chinooz/mock-data'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSessionStore } from '@chinooz/state'
import { duration, easing } from '@chinooz/theme'
import { OrderCardSkeleton } from '../../components/skeletons/ProfileSkeletons'
import type { Order, OrderStatus } from '@chinooz/types'

type TabKey = 'all' | 'to_pay' | 'processing' | 'shipped' | 'delivered' | 'cancelled_returned'

interface TabDef {
  key: TabKey
  labelKey: string
  statuses: OrderStatus[]
}

const TABS: TabDef[] = [
  { key: 'all', labelKey: 'orders.tabAll', statuses: [] },
  { key: 'to_pay', labelKey: 'orders.tabToPay', statuses: ['pending', 'confirmed'] },
  { key: 'processing', labelKey: 'orders.tabProcessing', statuses: ['processing'] },
  { key: 'shipped', labelKey: 'orders.tabShipped', statuses: ['shipped'] },
  { key: 'delivered', labelKey: 'orders.tabDelivered', statuses: ['delivered'] },
  { key: 'cancelled_returned', labelKey: 'orders.tabCancelledReturned', statuses: ['cancelled', 'returned'] },
]

const VALID_TABS: TabKey[] = TABS.map(t => t.key)

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-warning-light', text: 'text-warning' },
  confirmed: { bg: 'bg-info-light', text: 'text-info' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-600' },
  shipped: { bg: 'bg-sky-100', text: 'text-sky-600' },
  delivered: { bg: 'bg-success-light', text: 'text-success' },
  cancelled: { bg: 'bg-error-light', text: 'text-error' },
  returned: { bg: 'bg-amber-100', text: 'text-amber-600' },
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  const reduced = useReducedMotion()

  if (count === 0) return null

  return (
    <motion.span
      key={count}
      initial={reduced ? false : { scale: 1 }}
      animate={reduced ? {} : { scale: [1, 1.3, 1] }}
      transition={{ duration: 0.3, type: 'spring', damping: 12, stiffness: 300 }}
      className={`
        inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
        ${active
          ? 'bg-white/25 text-white border border-white/30'
          : 'bg-surface text-text-muted border border-border'
        }
      `}
      aria-label={`${count} orders`}
    >
      {count}
    </motion.span>
  )
}

function SegmentControl({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: TabKey
  onTabChange: (key: TabKey) => void
  counts: Record<TabKey, number>
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <div
      className="flex overflow-x-auto md:overflow-visible scrollbar-none"
      role="tablist"
    >
      <div className="relative flex bg-background rounded-full h-10 min-w-max md:min-w-0">
        {TABS.map(tab => {
          const isActive = tab.key === activeTab
          const count = counts[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              role="tab"
              aria-selected={isActive}
              className={`
                relative z-10 flex items-center gap-1 px-4 h-10 rounded-full text-sm font-semibold
                whitespace-nowrap transition-colors duration-250
                ${isActive ? 'text-white' : 'text-text-muted hover:text-text'}
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="segment-indicator"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={reduced ? { duration: 0 } : {
                    type: 'spring',
                    damping: 20,
                    stiffness: 300,
                    mass: 0.8,
                  }}
                />
              )}
              <span className="relative z-10">{t(tab.labelKey)}</span>
              <span className="relative z-10">
                <CountBadge count={count} active={isActive} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SellerBreakdown({ order }: { order: Order }) {
  const { t } = useTranslation()
  const sellers = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const item of order.items) {
      const name = item.name.split(' — ')[0] || item.name
      const existing = map.get(name)
      if (existing) {
        existing.count += item.quantity
      } else {
        map.set(name, { name, count: item.quantity })
      }
    }
    return [...map.values()]
  }, [order.items])

  if (sellers.length <= 1) return null

  return (
    <div className="mb-3 px-3 py-2 bg-background rounded-lg">
      <p className="text-xs font-semibold text-text-secondary mb-1">{t('orders.subOrders')}</p>
      {sellers.map(seller => (
        <p key={seller.name} className="text-xs text-text-muted">
          {t('orders.soldBy')}: {seller.name} ({seller.count} {seller.count === 1 ? t('orders.item') : t('orders.items')})
        </p>
      ))}
    </div>
  )
}

function OrderCard({ order, index }: { order: Order; index: number }) {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const statusStyle = STATUS_COLORS[order.status]
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const firstItem = order.items[0]
  const statusLabel = t(`orders.${order.status}`)

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : {
        duration: duration.slow / 1000,
        ease: easing.easeOut as any,
        delay: index * 0.06,
      }}
    >
      <button
        onClick={() => router.push(`/orders/${order.id}`)}
        className="w-full text-left bg-surface rounded-2xl border border-border-light p-4 md:p-5 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
        aria-label={`Order ${order.id}, ${statusLabel}`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-text-secondary tabular-nums">
            {order.id.toUpperCase()}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-primary">
              {firstItem.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{firstItem.name}</p>
            {order.items.length > 1 && (
              <p className="text-xs text-text-muted mt-0.5">
                +{order.items.length - 1} {order.items.length - 1 === 1 ? t('orders.item') : t('orders.items')}
              </p>
            )}
          </div>
        </div>

        <SellerBreakdown order={order} />

        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          <span className="text-sm text-text-muted">
            {itemCount} {itemCount === 1 ? t('orders.item') : t('orders.items')}
          </span>
          <span className="text-base font-bold text-text tabular-nums">
            {formatNPR(order.total)}
          </span>
        </div>

        {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned' && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-text-muted">{t('orders.estimatedDelivery')}</span>
            <span className="text-xs font-semibold text-primary">
              {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
      </button>
    </motion.div>
  )
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduced = useReducedMotion()
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)

  const initialTab: TabKey = (() => {
    const s = searchParams.get('status')
    if (s && VALID_TABS.includes(s as TabKey)) return s as TabKey
    return 'all'
  })()

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
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

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setHasError(false)
    try {
      const statusParam = activeTab === 'all' ? undefined : activeTab
      const searchParam = searchQuery.trim() || undefined
      const data = await getOrders({ status: statusParam, search: searchParam })
      setOrders(data)
    } catch {
      setOrders([])
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: 0,
      to_pay: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled_returned: 0,
    }
    for (const order of orders) {
      c.all++
      if (order.status === 'pending' || order.status === 'confirmed') c.to_pay++
      if (order.status === 'processing') c.processing++
      if (order.status === 'shipped') c.shipped++
      if (order.status === 'delivered') c.delivered++
      if (order.status === 'cancelled' || order.status === 'returned') c.cancelled_returned++
    }
    return c
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders
    const tab = TABS.find(t => t.key === activeTab)
    if (!tab) return orders
    return orders.filter(o => tab.statuses.includes(o.status))
  }, [orders, activeTab])

  const getTabEmptyMessage = useCallback(() => {
    switch (activeTab) {
      case 'to_pay': return { title: t('orders.noToPayOrders'), subtitle: t('orders.noToPayOrdersNe') }
      case 'processing': return { title: t('orders.noProcessingOrders'), subtitle: t('orders.noProcessingOrdersNe') }
      case 'shipped': return { title: t('orders.noShippedOrders'), subtitle: t('orders.noShippedOrdersNe') }
      case 'delivered': return { title: t('orders.noDeliveredOrders'), subtitle: t('orders.noDeliveredOrdersNe') }
      case 'cancelled_returned': return { title: t('orders.noCancelledReturnedOrders'), subtitle: t('orders.noCancelledReturnedOrdersNe') }
      default: return { title: t('orders.noOrders'), subtitle: t('orders.noOrdersSubtitle') }
    }
  }, [activeTab, t])

  // Logged-out state
  if (!isLoggedIn) {
    return (
      <Screen>
        <Container className="py-6 max-w-[800px]">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
              aria-label={t('common.back')}
            >
              <span className="text-xl text-text">←</span>
            </button>
            <h1 className="text-xl font-bold text-text">{t('orders.myOrders')}</h1>
          </div>
          <EmptyState
            icon={<span className="text-5xl">🔒</span>}
            title={t('orders.signInPrompt')}
            action={{ label: t('orders.signIn'), onPress: () => router.push('/phone-entry') }}
          />
        </Container>
      </Screen>
    )
  }

  return (
    <Screen>
      {/* Offline banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={reduced ? false : { y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: -48, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
            className="sticky top-16 z-40 bg-warning-light border-b border-warning px-4 py-2"
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

      <Container className="py-6 max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label={t('common.back')}
          >
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('orders.myOrders')}</h1>
        </div>

        <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        <div className="mt-4 mb-5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">⌕</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              className="w-full h-10 pl-10 pr-10 bg-background border border-border rounded-lg text-sm text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label={t('orders.searchPlaceholder')}
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                aria-label={t('orders.clearSearch')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('common.loadingOrders')}>
            {[0, 1, 2, 3].map(i => <OrderCardSkeleton key={i} />)}
          </div>
        ) : hasError ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-8"
          >
            <span className="text-5xl mb-4">⚠️</span>
            <h3 className="text-lg font-semibold text-text text-center">{t('orders.errorTitle')}</h3>
            <p className="text-sm text-text-muted text-center mt-2">{t('orders.errorSubtitle')}</p>
            <button
              onClick={fetchOrders}
              className="mt-4 px-5 py-2.5 rounded-xl border-[1.5px] border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors"
              aria-label={t('common.retry')}
            >
              {t('common.retry')}
            </button>
          </motion.div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-8"
          >
            <span className="text-5xl mb-4">📦</span>
            <h3 className="text-lg font-semibold text-text text-center">{getTabEmptyMessage().title}</h3>
            <p className="text-sm text-text-muted text-center mt-2">{getTabEmptyMessage().subtitle}</p>
            {activeTab !== 'all' ? (
              <button
                onClick={() => setActiveTab('all')}
                className="mt-4 px-5 py-2.5 rounded-xl border-[1.5px] border-primary text-primary font-semibold text-sm hover:bg-primary-50 transition-colors"
                aria-label={t('orders.clearTab')}
              >
                {t('orders.clearTab')}
              </button>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-colors"
                aria-label={t('cart.startShopping')}
              >
                {t('cart.startShopping')}
              </button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, index) => (
                <OrderCard key={order.id} order={order} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Container>
    </Screen>
  )
}
