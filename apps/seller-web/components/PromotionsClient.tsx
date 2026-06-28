'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Plus, X, ChevronDown, Tag, ArrowUpDown, CheckSquare, Zap, AlertTriangle, WifiOff } from 'lucide-react'
import { duration, easing } from '@chinooz/theme'
import { useReducedMotion, SegmentedControl, EmptyState, Screen, Container, Toast } from '@chinooz/ui-web'
import {
  getPromotions,
  getPromotionCounts,
  deletePromotionById,
  duplicatePromotionById,
  togglePromotionActiveById,
  endPromotionNowById,
  PROMOTION_TYPES,
  type Promotion,
  type PromotionStatus,
  type PromotionType,
  type PromotionSort,
} from '@chinooz/mock-data'
import { analytics } from '@chinooz/analytics'
import { PromotionRow, PromotionRowSkeleton, PromotionCardSkeleton } from './PromotionRow'

const STATUS_KEYS: PromotionStatus[] = ['active', 'scheduled', 'expired', 'draft']
const SORT_KEYS: PromotionSort[] = ['newest', 'ending_soon', 'performance']

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatNPR(n: number): string {
  return n.toLocaleString()
}

function typeLabel(t: (k: string, opts?: Record<string, unknown>) => string, type: PromotionType): string {
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

function scopeText(t: (k: string, opts?: Record<string, unknown>) => string, p: Promotion): string {
  if (p.scope === 'all') return t('seller.promotions.scopeAll')
  if (p.scope === 'category') return t('seller.promotions.scopeCategory', { label: p.scopeLabel ?? '' })
  return t('seller.promotions.scopeProducts', { count: p.productsCount })
}

const statusBadge: Record<PromotionStatus, { cls: string; key: string }> = {
  active: { cls: 'bg-success-light text-success', key: 'seller.promotions.statusActive' },
  scheduled: { cls: 'bg-info-light text-info', key: 'seller.promotions.statusScheduled' },
  expired: { cls: 'bg-border text-text-secondary', key: 'seller.promotions.statusExpired' },
  draft: { cls: 'bg-warning-light text-[#92400E]', key: 'seller.promotions.statusDraft' },
}

export default function PromotionsClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  const [status, setStatus] = useState<PromotionStatus>('active')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)
  const [type, setType] = useState<PromotionType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<PromotionSort>('newest')
  const [selectable, setSelectable] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const counts = useMemo(() => getPromotionCounts(), [])
  const queryClient = useQueryClient()

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 2500)
  }, [])

  const handleSelectChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleCopyCode = useCallback((code: string) => {
    showToast(t('seller.promotions.codeCopiedAnnounce', { code }))
  }, [showToast, t])

  const handleEdit = useCallback((promo: Promotion) => {
    analytics.track({ name: 'promotion_edit_tapped', properties: { id: promo.id } })
    router.push(`/promotions/${promo.id}/edit`)
  }, [router])

  const handleDuplicate = useCallback(async (promo: Promotion) => {
    await duplicatePromotionById(promo.id)
    queryClient.invalidateQueries({ queryKey: ['promotions'] })
    showToast(t('seller.promotions.actionDuplicate'))
  }, [queryClient, showToast, t])

  const handleToggleActive = useCallback(async (promo: Promotion) => {
    await togglePromotionActiveById(promo.id)
    queryClient.invalidateQueries({ queryKey: ['promotions'] })
  }, [queryClient])

  const handleEndNow = useCallback(async (promo: Promotion) => {
    await endPromotionNowById(promo.id)
    queryClient.invalidateQueries({ queryKey: ['promotions'] })
  }, [queryClient])

  const handleDelete = useCallback(async (promo: Promotion) => {
    await deletePromotionById(promo.id)
    queryClient.invalidateQueries({ queryKey: ['promotions'] })
    showToast(t('seller.promotions.actionDelete'))
  }, [queryClient, showToast, t])

  useEffect(() => {
    analytics.screen({ name: 'seller-promotions' })
  }, [])

  const segments = useMemo(
    () =>
      STATUS_KEYS.map(key => ({
        key,
        label: t(`seller.promotions.status${key.charAt(0).toUpperCase()}${key.slice(1)}`),
        badge: counts[key],
      })),
    [counts, t],
  )

  const activeFilterChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = []
    if (type !== 'all') {
      chips.push({
        id: 'type',
        label: typeLabel(t, type),
        onRemove: () => setType('all'),
      })
    }
    if (dateFrom) {
      chips.push({
        id: 'dateFrom',
        label: `${t('seller.promotions.dateFrom')} ${formatDate(dateFrom)}`,
        onRemove: () => setDateFrom(''),
      })
    }
    if (dateTo) {
      chips.push({
        id: 'dateTo',
        label: `${t('seller.promotions.dateTo')} ${formatDate(dateTo)}`,
        onRemove: () => setDateTo(''),
      })
    }
    if (search) {
      chips.push({ id: 'search', label: `“${search}”`, onRemove: () => setSearch('') })
    }
    return chips
  }, [type, dateFrom, dateTo, search, t])

  const clearAll = useCallback(() => {
    setType('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
  }, [])

  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promotions', status, debouncedSearch, type, dateFrom, dateTo, sort],
    queryFn: () =>
      getPromotions({
        status,
        search: debouncedSearch || undefined,
        type,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort,
      }),
    retry: false,
  })

  const items = data ?? []
  const hasFilters = type !== 'all' || !!dateFrom || !!dateTo || !!search

  const chipEnter: Transition = reduced
    ? { duration: 0 }
    : { duration: duration.normal / 1000, ease: easing.spring as any }

  return (
    <Screen>
      <Container>
        <div className="py-6 md:py-8">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                {t('seller.promotions.title')}
              </h1>
              <p className="text-text-muted text-sm mt-0.5">{t('seller.promotions.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectable(s => !s); setSelectedIds(new Set()) }}
                aria-label={t('seller.promotions.selectPromotionAria', { name: '' })}
                className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-md border text-sm font-semibold transition-colors min-touch ${
                  selectable ? 'bg-primary text-white border-primary' : 'bg-surface text-text border-border hover:bg-background'
                }`}
              >
                <CheckSquare size={16} />
                <span className="hidden sm:inline">{selectable ? `${selectedIds.size}` : 'Select'}</span>
              </button>
              <button
                onClick={() => router.push('/promotions/campaigns')}
                aria-label={t('seller.promotions.campaigns.tabAria')}
                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-gold/30 bg-gold/10 text-gold text-sm font-semibold hover:bg-gold/15 transition-colors min-touch"
              >
                <Zap size={16} />
                <span className="hidden sm:inline">{t('seller.promotions.campaigns.tab')}</span>
              </button>
              <button
                onClick={() => router.push('/promotions/new')}
                aria-label={t('seller.promotions.createAria')}
                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:opacity-95 transition-opacity active:scale-[0.98] min-touch"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">{t('seller.promotions.create')}</span>
              </button>
            </div>
          </div>

          <div className="sticky top-0 z-sticky -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border-light">
            <div className="flex flex-col gap-3">
              <SegmentedControl
                segments={segments}
                activeKey={status}
                onChange={key => setStatus(key as PromotionStatus)}
                testID="promotions-status-tabs"
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                    <Search size={16} />
                  </span>
                  <input
                    type="search"
                    inputMode="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('seller.promotions.search')}
                    aria-label={t('seller.promotions.searchAria')}
                    className="w-full h-10 rounded-md bg-surface border border-border pl-9 pr-9 text-sm text-text placeholder:text-text-tertiary outline-none focus:border-primary transition-colors"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label={t('seller.promotions.clearAll')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <SlidersHorizontal
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <select
                      aria-label={t('seller.promotions.filterAria')}
                      value={type}
                      onChange={e => setType(e.target.value as PromotionType | 'all')}
                      className="h-10 rounded-md bg-surface border border-border pl-8 pr-8 text-sm text-text outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-touch"
                    >
                      <option value="all">{t('seller.promotions.typeAll')}</option>
                      {PROMOTION_TYPES.map(tt => (
                        <option key={tt.key} value={tt.key}>
                          {typeLabel(t, tt.key)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      aria-label={t('seller.promotions.dateFrom')}
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="h-10 rounded-md bg-surface border border-border px-2.5 text-sm text-text outline-none focus:border-primary transition-colors min-touch"
                    />
                    <span className="text-text-tertiary text-xs">–</span>
                    <input
                      type="date"
                      aria-label={t('seller.promotions.dateTo')}
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="h-10 rounded-md bg-surface border border-border px-2.5 text-sm text-text outline-none focus:border-primary transition-colors min-touch"
                    />
                  </div>

                  <div className="relative">
                    <ArrowUpDown
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <select
                      aria-label={t('seller.promotions.sortAria')}
                      value={sort}
                      onChange={e => setSort(e.target.value as PromotionSort)}
                      className="h-10 rounded-md bg-surface border border-border pl-8 pr-8 text-sm text-text outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-touch"
                    >
                      {SORT_KEYS.map(k => (
                        <option key={k} value={k}>
                          {t(`seller.promotions.sort${k === 'newest' ? 'Newest' : k === 'ending_soon' ? 'EndingSoon' : 'Performance'}`)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence initial={!reduced}>
                {activeFilterChips.length > 0 && (
                  <motion.div
                    layout={!reduced}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <span className="text-xs font-medium text-text-muted">
                      {t('seller.promotions.activeFilters')}:
                    </span>
                    {activeFilterChips.map(chip => (
                      <motion.button
                        key={chip.id}
                        layout={!reduced}
                        initial={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: reduced ? 1 : 0.85 }}
                        transition={chipEnter}
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-xs font-semibold pl-3 pr-2 h-7 hover:opacity-90 transition-opacity"
                        aria-label={`${chip.label} — ${t('seller.promotions.clearAll')}`}
                      >
                        {chip.label}
                        <X size={12} />
                      </motion.button>
                    ))}
                    <button
                      onClick={clearAll}
                      className="text-xs font-semibold text-primary hover:underline ml-1 min-touch h-7 px-1"
                    >
                      {t('seller.promotions.clearAll')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Offline banner */}
          <AnimatePresence>
            {isOffline && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                className="mt-3 rounded-md border border-warning/30 bg-warning-light px-4 py-2.5 flex items-center gap-2"
                role="status"
                aria-live="polite"
              >
                <WifiOff size={16} className="text-warning shrink-0" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-[#92400E]">{t('seller.promotions.offlineBanner')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4">
            {isLoading ? (
              <>
                <div className="hidden md:block rounded-lg border border-border-light overflow-auto bg-surface max-h-[calc(100vh-220px)] scrollbar-none">
                  <table className="w-full">
                    <thead className="sticky top-0 z-base bg-surface">
                      <tr className="border-b border-border">
                        {['colPromotion','colType','colDiscount','colStatus','colSchedule','colRedemptions','colRevenue'].map(col => (
                          <th key={col} scope="col" className="text-left text-xs font-semibold text-text-muted px-4 py-2.5 whitespace-nowrap bg-surface">
                            {t(`seller.promotions.${col}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody aria-busy="true" aria-label={t('seller.promotions.skeletonAria')}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <PromotionRowSkeleton key={i} selectable={selectable} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden flex flex-col gap-3" aria-busy="true" aria-label={t('seller.promotions.skeletonAria')}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PromotionCardSkeleton key={i} />
                  ))}
                </div>
              </>
            ) : isError ? (
              <div role="alert" aria-live="assertive" className="mt-4 p-4 rounded-lg border border-error/30 bg-error/5 flex flex-col items-center gap-3 text-center">
                <AlertTriangle size={28} className="text-error" aria-hidden="true" />
                <p className="text-[15px] font-semibold text-error">{t('seller.promotions.error')}</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  aria-label={t('seller.promotions.retry')}
                  className="h-10 px-5 rounded-md border-2 border-primary text-primary text-[14px] font-semibold hover:bg-primary-50 transition-colors"
                >
                  {t('seller.promotions.retry')}
                </button>
              </div>
            ) : items.length === 0 ? (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col items-center justify-center py-12 px-6 text-center"
                aria-label={hasFilters ? t('seller.promotions.emptyFilteredTitle') : t('seller.promotions.emptyTabTitle', { status: t(`seller.promotions.status${status.charAt(0).toUpperCase()}${status.slice(1)}`) })}
              >
                <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4" aria-hidden="true">
                  <Tag size={32} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-1">
                  {hasFilters ? t('seller.promotions.emptyFilteredTitle') : t('seller.promotions.emptyTabTitle', { status: t(`seller.promotions.status${status.charAt(0).toUpperCase()}${status.slice(1)}`) })}
                </h3>
                <p className="text-sm text-text-muted max-w-sm mb-4">
                  {hasFilters ? t('seller.promotions.emptyFilteredSubtitle') : t('seller.promotions.emptyTabSubtitle', { status: t(`seller.promotions.status${status.charAt(0).toUpperCase()}${status.slice(1)}`) })}
                </p>
                {!hasFilters && (
                  <button
                    type="button"
                    onClick={() => router.push('/promotions/new')}
                    aria-label={t('seller.promotions.createAria')}
                    className="h-10 px-5 rounded-md bg-primary text-white text-[14px] font-semibold hover:opacity-95 transition-opacity active:scale-[0.98]"
                  >
                    {t('seller.promotions.emptyAction')}
                  </button>
                )}
              </motion.div>
            ) : (
              <>
                <p className="text-xs text-text-muted mb-2">
                  {t('seller.promotions.count', { count: items.length })}
                </p>
                <div className="hidden md:block rounded-lg border border-border-light overflow-auto bg-surface max-h-[calc(100vh-220px)] scrollbar-none">
                  <table className="w-full" role="table">
                    <thead className="sticky top-0 z-base bg-surface">
                      <tr className="border-b border-border">
                        {['colPromotion','colType','colDiscount','colStatus','colSchedule','colRedemptions','colRevenue'].map(col => (
                          <th key={col} scope="col" className="text-left text-xs font-semibold text-text-muted px-4 py-2.5 whitespace-nowrap bg-surface">
                            {t(`seller.promotions.${col}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(p => (
                        <PromotionRow
                          key={p.id}
                          promo={p}
                          selected={selectedIds.has(p.id)}
                          selectable={selectable}
                          onSelectChange={handleSelectChange}
                          onEdit={handleEdit}
                          onDuplicate={handleDuplicate}
                          onToggleActive={handleToggleActive}
                          onEndNow={handleEndNow}
                          onDelete={handleDelete}
                          onCopyCode={handleCopyCode}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden flex flex-col gap-3">
                  {items.map(p => (
                    <CompactCard key={p.id} promo={p} t={t} onCopyCode={handleCopyCode} onEdit={handleEdit} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
      <Toast
        message={toast.message}
        variant="success"
        visible={toast.visible}
      />
    </Screen>
  )
}

type T = (key: string, opts?: Record<string, unknown>) => string

function CompactCard({ promo, t, onCopyCode, onEdit }: { promo: Promotion; t: T; onCopyCode: (code: string) => void; onEdit: (p: Promotion) => void }) {
  const [copied, setCopied] = useState(false)
  const sb = statusBadge[promo.status]
  const isSale = promo.type === 'flash_sale' || promo.type === 'percentage'

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(promo.code) } catch {}
    setCopied(true)
    onCopyCode(promo.code)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={() => onEdit(promo)}
      role="button"
      aria-label={t('seller.promotions.rowAria', { name: promo.name, type: typeLabel(t, promo.type), value: discountText(promo), status: t(sb.key) })}
      className="rounded-lg border border-border-light bg-surface shadow-sm p-4 cursor-pointer hover:bg-primary-50/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
            <Tag size={18} color="#8A1B57" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-semibold text-text truncate">{promo.name}</span>
              {isSale && promo.status === 'active' && (
                <span className="shrink-0 text-[10px] font-bold tracking-wide text-white bg-gold rounded-full px-1.5 py-px">
                  {t('seller.promotions.saleBadge')}
                </span>
              )}
            </div>
            <span className="text-[12px] font-medium text-text-muted">{typeLabel(t, promo.type)}</span>
          </div>
        </div>
        <span className={`inline-flex items-center text-[12px] font-semibold rounded-full px-2.5 py-1 shrink-0 ${sb.cls}`}>
          {t(sb.key)}
        </span>
      </div>

      {promo.isCoupon && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleCopy() }}
          className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-mono text-text-muted hover:text-primary transition-colors"
          aria-label={t('seller.promotions.copyCodeAria', { code: promo.code })}
        >
          {promo.code}
          <span className={`text-[11px] font-semibold ${copied ? 'text-success' : 'text-primary'}`}>
            {copied ? `✓ ${t('seller.promotions.codeCopied')}` : t('seller.promotions.copyCode')}
          </span>
        </button>
      )}

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-text-muted">{t('seller.promotions.colDiscount')}</p>
          <p className="text-xl font-bold text-gold tabular-nums leading-tight">{discountText(promo)}</p>
          <p className="text-[12px] text-text-muted mt-0.5">{scopeText(t, promo)}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-text-muted">{t('seller.promotions.revenueInfluenced')}</p>
          <p className="text-sm font-semibold text-text tabular-nums">
            {t('seller.promotions.revenue', { amount: formatNPR(promo.revenue) })}
          </p>
          <p className="text-[12px] text-text-muted tabular-nums">
            {t('seller.promotions.uses', { count: promo.redemptions })}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-between gap-2">
        <span className="text-[12px] text-text-secondary">
          {formatDate(promo.startsAt)} – {formatDate(promo.endsAt)}
        </span>
      </div>
    </div>
  )
}
