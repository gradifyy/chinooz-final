'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Store, AlertCircle, WifiOff, RefreshCw, Info } from 'lucide-react'
import { Skeleton, useReducedMotion } from '@chinooz/ui-web'
import { useCountUp } from './useCountUp'

export type AnalyticsStatus =
  | 'loading'
  | 'ready'
  | 'empty-insufficient'
  | 'empty-no-results'
  | 'error'
  | 'offline'

export function AnalyticsStateWrapper({
  status,
  children,
  onRetry,
  onClearFilters,
  hasFilters,
  partialData,
}: {
  status: AnalyticsStatus
  children: React.ReactNode
  onRetry?: () => void
  onClearFilters?: () => void
  hasFilters?: boolean
  partialData?: boolean
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  if (status === 'loading') {
    return <SectionSkeletons ariaLabel={t('seller.analytics.states.skeletonAria')} />
  }

  if (status === 'empty-insufficient') {
    return <EmptyInsufficient onAddProduct={() => {}} reduced={reduced} t={t} />
  }

  if (status === 'empty-no-results') {
    return (
      <EmptyNoResults
        onClear={onClearFilters ?? (() => {})}
        hasFilters={hasFilters ?? false}
        reduced={reduced}
        t={t}
      />
    )
  }

  if (status === 'error') {
    return <ErrorState onRetry={onRetry ?? (() => {})} t={t} />
  }

  return (
    <>
      {partialData && <PartialDataChip t={t} reduced={reduced} />}
      {status === 'offline' && <OfflineNotice t={t} onRetry={onRetry} />}
      {children}
    </>
  )
}

export function SectionSkeletons({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div aria-busy="true" aria-label={ariaLabel} role="status">
      {/* KPI skeleton row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border-light bg-surface p-4 flex flex-col gap-2"
          >
            <Skeleton width={80} height={12} />
            <Skeleton width={120} height={22} />
            <Skeleton width={60} height={12} />
          </div>
        ))}
      </div>

      {/* Chart + side card skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-lg border border-border-light bg-surface p-5">
          <Skeleton width={100} height={14} className="mb-4" />
          <div className="flex items-end gap-2 h-40">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton width="100%" height={Math.random() * 80 + 40} borderRadius={4} />
                <Skeleton width={24} height={10} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border-light bg-surface p-5">
          <Skeleton width={80} height={14} className="mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <Skeleton width={60} height={12} />
              <Skeleton width={40} height={12} />
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
        <div className="h-11 border-b border-border bg-background" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-border last:border-b-0 flex items-center px-4 gap-3"
          >
            <Skeleton width={32} height={32} borderRadius={6} />
            <div className="flex-1 space-y-2">
              <Skeleton width="40%" height={12} />
              <Skeleton width="20%" height={10} />
            </div>
            <Skeleton width={60} height={12} />
            <Skeleton width={48} height={20} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyInsufficient({
  onAddProduct,
  reduced,
  t,
}: {
  onAddProduct: () => void
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center px-8 py-16 gap-4 text-center"
      role="status"
      aria-label={t('seller.analytics.states.emptyAria')}
    >
      <div className="w-[120px] h-[120px] rounded-3xl bg-primary-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center shadow-md shadow-primary/10">
          <Store size={28} className="text-primary" aria-hidden="true" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-text">
          {t('seller.analytics.states.emptyInsufficientTitle')}
        </h3>
        <p className="text-sm text-text-muted leading-5 max-w-sm mt-1">
          {t('seller.analytics.states.emptyInsufficientSubtitle')}
        </p>
        <p className="text-sm text-text-tertiary mt-0.5" lang="ne">
          {t('seller.analytics.states.emptyInsufficientSubtitleNe')}
        </p>
      </div>
      <button
        type="button"
        onClick={onAddProduct}
        className="rounded-md bg-primary text-white px-4 py-2.5 text-[14px] font-semibold hover:opacity-90 transition-opacity min-touch"
      >
        {t('seller.analytics.states.emptyInsufficientAction')}
      </button>
    </motion.div>
  )
}

export function EmptyNoResults({
  onClear,
  hasFilters,
  reduced,
  t,
}: {
  onClear: () => void
  hasFilters: boolean
  reduced: boolean
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      className="flex flex-col items-center justify-center px-8 py-12 gap-3 text-center"
      role="status"
      aria-label={t('seller.analytics.states.emptyAria')}
    >
      <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center">
        <Info size={24} className="text-text-tertiary" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-text">
        {t('seller.analytics.states.emptyNoResultsTitle')}
      </h3>
      <p className="text-sm text-text-muted max-w-sm">
        {t('seller.analytics.states.emptyNoResultsSubtitle')}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-primary text-primary px-4 py-2 text-[13px] font-semibold hover:bg-primary-50 transition-colors min-touch"
        >
          {t('seller.analytics.states.emptyNoResultsAction')}
        </button>
      )}
    </motion.div>
  )
}

export function ErrorState({
  onRetry,
  t,
}: {
  onRetry: () => void
  t: (k: string, o?: Record<string, unknown>) => string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-8 py-12 gap-3 text-center"
      role="alert"
      aria-label={t('seller.analytics.states.errorAria')}
    >
      <div className="w-12 h-12 rounded-full bg-error-light flex items-center justify-center">
        <AlertCircle size={24} className="text-error" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-text">
        {t('seller.analytics.states.errorLoadTitle')}
      </h3>
      <p className="text-sm text-text-muted max-w-sm">
        {t('seller.analytics.states.errorLoadSubtitle')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        aria-label={t('seller.analytics.states.errorRetryAria')}
        className="inline-flex items-center gap-2 rounded-md border border-primary text-primary px-4 py-2 text-[13px] font-semibold hover:bg-primary-50 transition-colors min-touch"
      >
        <RefreshCw size={14} aria-hidden="true" />
        {t('seller.analytics.states.errorRetry')}
      </button>
    </div>
  )
}

export function OfflineNotice({
  t,
  onRetry,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  onRetry?: () => void
}) {
  return (
    <div
      className="rounded-lg bg-warning-light border border-warning/30 px-4 py-3 mb-4 flex items-center gap-2"
      role="status"
    >
      <WifiOff size={16} className="text-warning shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#92400E]">
          {t('seller.analytics.states.offlineTitle')}
        </p>
        <p className="text-[12px] text-[#92400E]/80">
          {t('seller.analytics.states.offlineSubtitle')}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] font-semibold text-[#92400E] hover:underline shrink-0"
        >
          {t('seller.analytics.states.offlineRetry')}
        </button>
      )}
    </div>
  )
}

export function PartialDataChip({
  t,
  reduced,
}: {
  t: (k: string, o?: Record<string, unknown>) => string
  reduced: boolean
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 mb-4"
      role="status"
      aria-label={t('seller.analytics.states.partialDataAria')}
    >
      <Info size={12} className="text-info" aria-hidden="true" />
      <span className="text-[11px] font-semibold text-info">
        {t('seller.analytics.states.partialDataTitle')}
      </span>
      <span className="text-[11px] text-info/70 hidden sm:inline">
        — {t('seller.analytics.states.partialDataSubtitle')}
      </span>
    </motion.div>
  )
}

export function KpiValue({
  rawValue,
  displayValue: _displayValue,
  isMoney,
  isPct,
  isConvRate,
}: {
  rawValue: number
  displayValue: string
  isMoney?: boolean
  isPct?: boolean
  isConvRate?: boolean
}) {
  const animated = useCountUp(rawValue, 300)
  if (isConvRate) {
    return <>{`${animated.toFixed(1)}%`}</>
  }
  if (isMoney) {
    return <>{`NPR ${animated.toLocaleString()}`}</>
  }
  if (isPct) {
    return <>{`${animated}%`}</>
  }
  return <>{animated.toLocaleString()}</>
}
