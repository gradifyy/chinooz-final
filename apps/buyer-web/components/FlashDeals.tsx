'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useDeals, useProducts } from '@chinooz/hooks'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
import type { Deal, Product } from '@chinooz/types'

function getTimeRemaining(endsAt: string): { total: number; hours: number; minutes: number; seconds: number } {
  const end = new Date(endsAt).getTime()
  const now = Date.now()
  const total = Math.max(0, end - now)
  const hours = Math.floor(total / 3600000)
  const minutes = Math.floor((total % 3600000) / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  return { total, hours, minutes, seconds }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function CountdownDigit({ value, ended }: { value: string; ended: boolean }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className={`text-xs font-bold px-1.5 py-0.5 rounded min-w-[26px] text-center inline-block tabular-nums ${
        ended
          ? 'text-text-tertiary bg-border'
          : 'text-primary bg-primary-50'
      }`}
    >
      {ended ? '00' : value}
    </motion.span>
  )
}

function DiscountBadge({ deal, reduced }: { deal: Deal; reduced: boolean }) {
  const label = deal.discountType === 'percentage'
    ? `-${deal.discount}%`
    : `-NPR ${deal.discount.toLocaleString('en-IN')}`

  return (
    <motion.span
      animate={reduced ? {} : { scale: [1, 1.05, 1] }}
      transition={reduced ? {} : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-2 left-2 bg-gold text-white text-[11px] font-bold px-2 py-0.5 rounded-full"
    >
      {label}
    </motion.span>
  )
}

function DealCard({
  deal,
  product,
  onExpired,
  reduced,
}: {
  deal: Deal
  product: Product | undefined
  onExpired: (id: string) => void
  reduced: boolean
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const [time, setTime] = useState(() => getTimeRemaining(deal.endsAt))
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(deal.endsAt)
      setTime(remaining)
      if (remaining.total <= 0 && !ended) {
        setEnded(true)
        setTimeout(() => onExpired(deal.id), 3000)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [deal.endsAt, ended, deal.id, onExpired])

  const salePrice = product
    ? deal.discountType === 'percentage'
      ? Math.round(product.price * (1 - deal.discount / 100))
      : product.price - deal.discount
    : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: ended ? 0.5 : 1 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      className="shrink-0 w-[160px]"
    >
      <motion.button
        onClick={() => product && router.push(`/product/${product.id}`)}
        whileHover={reduced ? {} : { scale: 1.02 }}
        whileTap={reduced ? {} : { scale: 0.97 }}
        className="w-full bg-surface rounded-2xl border border-border-light overflow-hidden text-left"
      >
        <div className="relative w-full h-[140px] bg-border">
          <DiscountBadge deal={deal} reduced={reduced} />
        </div>

        <div className="p-3 space-y-1">
          <p className={`text-[13px] font-semibold truncate ${ended ? 'text-text-muted' : 'text-text'}`}>
            {deal.title}
          </p>

          <div className="flex items-baseline gap-1.5">
            <span className={`text-[15px] font-bold ${ended ? 'text-text-muted' : 'text-text'}`}>
              {formatNPR(salePrice)}
            </span>
            {product && (
              <span className="text-xs text-text-muted line-through">
                {formatNPR(product.price)}
              </span>
            )}
          </div>

          {ended ? (
            <p className="text-xs font-semibold text-text-tertiary mt-1">
              {t('common.dealEnded')}
            </p>
          ) : (
            <div className="flex items-center gap-0.5 mt-1">
              <AnimatePresence mode="wait">
                <CountdownDigit key={`h-${time.hours}`} value={pad(time.hours)} ended={ended} />
              </AnimatePresence>
              <span className="text-xs font-bold text-primary">:</span>
              <AnimatePresence mode="wait">
                <CountdownDigit key={`m-${time.minutes}`} value={pad(time.minutes)} ended={ended} />
              </AnimatePresence>
              <span className="text-xs font-bold text-primary">:</span>
              <AnimatePresence mode="wait">
                <CountdownDigit key={`s-${time.seconds}`} value={pad(time.seconds)} ended={ended} />
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.button>
    </motion.div>
  )
}

export default function FlashDeals() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data: deals, isLoading } = useDeals()
  const { data: products } = useProducts()
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set())

  const handleExpired = useCallback((id: string) => {
    setExpiredIds(prev => new Set([...prev, id]))
  }, [])

  const activeDeals = useMemo(() => {
    if (!deals) return []
    return deals.filter(d => !expiredIds.has(d.id))
  }, [deals, expiredIds])

  const productMap = useMemo(() => {
    if (!products?.items) return new Map<string, Product>()
    return new Map(products.items.map(p => [p.id, p]))
  }, [products])

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-text">⚡ {t('home.flashDeals')}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] rounded-2xl border border-border-light overflow-hidden">
              <div className="w-full h-[140px] bg-border animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="w-3/4 h-3 bg-border rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-border rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!activeDeals.length) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-text">⚡ {t('home.flashDeals')}</h2>
        <motion.button
          onClick={() => router.push('/deals')}
          whileHover={reduced ? {} : { x: 2 }}
          whileTap={reduced ? {} : { scale: 0.97 }}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary"
        >
          {t('common.seeAll')}
          <span className="text-base">›</span>
        </motion.button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        <AnimatePresence>
          {activeDeals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              product={productMap.get(deal.productId)}
              onExpired={handleExpired}
              reduced={reduced}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
