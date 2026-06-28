'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  Star,
  MessageSquare,
  Send,
  RefreshCw,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import {
  Screen,
  Container,
  EmptyState,
  ReviewCard,
  ReviewCardSkeleton,
  useReducedMotion,
} from '@chinooz/ui-web'
import {
  useSellerReviews,
  useSellerProducts,
  useRespondToSellerReview,
  useEditSellerReviewResponse,
  useDeleteSellerReviewResponse,
  useToggleSellerReviewFlag,
} from '@chinooz/hooks'
import { analytics } from '@chinooz/analytics'
import { useSellerSessionStore } from '@chinooz/state'
import { reviewResponseSchema } from '@chinooz/validation'
import { REVIEW_RESPONSE_TEMPLATES } from '@chinooz/mock-data'
import { duration, easing } from '@chinooz/theme'
import type {
  SellerReviewFilter,
  SellerReviewSort,
  SellerReviewStatus,
  SellerReviewResponseFilter,
} from '@chinooz/mock-data'
import type { SellerReview } from '@chinooz/types'

type RatingFilter = number | 'all'

const STARS = [5, 4, 3, 2, 1] as const

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

export default function ReviewsScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  const [status, setStatus] = useState<SellerReviewStatus>('all')
  const [rating, setRating] = useState<RatingFilter>('all')
  const [hasResponse, setHasResponse] = useState<SellerReviewResponseFilter>('all')
  const [hasPhotos, setHasPhotos] = useState(false)
  const [productId, setProductId] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<SellerReviewSort>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeReviewId, setComposeReviewId] = useState<string | null>(null)
  const [composeDraft, setComposeDraft] = useState('')
  const [composeMode, setComposeMode] = useState<'create' | 'edit'>('create')
  const [composeError, setComposeError] = useState<string | null>(null)
  const [composeSuccess, setComposeSuccess] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    analytics.screen({ name: 'seller-reviews' })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) router.replace('/onboarding')
  }, [isLoggedIn, router])

  // Distribution bars fill on load (SV6).
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!sortOpen) return
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [sortOpen])

  const filter: SellerReviewFilter = useMemo(
    () => ({
      status,
      rating,
      hasResponse,
      hasPhotos,
      productId,
      sort,
    }),
    [status, rating, hasResponse, hasPhotos, productId, sort],
  )

  const { data, isLoading, isFetching, isError, refetch } = useSellerReviews(filter)
  const { data: productsData } = useSellerProducts({ status: 'all', sort: 'best_selling' })

  const respond = useRespondToSellerReview()
  const editResponse = useEditSellerReviewResponse()
  const deleteResponse = useDeleteSellerReviewResponse()
  const toggleFlag = useToggleSellerReviewFlag()

  const activeMutation = composeMode === 'edit' ? editResponse : respond

  const summary = data?.summary
  const counts = data?.counts
  const items = data?.items ?? []
  const productOptions = productsData?.items ?? []

  const average = summary?.average ?? 0
  const totalReviews = summary?.total ?? 0
  const distribution = summary?.distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const trendPct = summary?.trendPct ?? 0
  const trendUp = trendPct > 0
  const trendDown = trendPct < 0

  const sortOptions: { key: SellerReviewSort; label: string }[] = [
    { key: 'newest', label: t('seller.reviews.sortNewest') },
    { key: 'oldest', label: t('seller.reviews.sortOldest') },
    { key: 'lowest', label: t('seller.reviews.sortLowest') },
    { key: 'highest', label: t('seller.reviews.sortHighest') },
  ]
  const activeSortLabel = sortOptions.find(s => s.key === sort)?.label ?? sortOptions[0].label

  const tabs: { key: SellerReviewStatus; label: string; count: number; warning?: boolean }[] = [
    { key: 'all', label: t('seller.reviews.tabAll'), count: counts?.all ?? 0 },
    { key: 'needs_response', label: t('seller.reviews.tabNeedsResponse'), count: counts?.needs_response ?? 0, warning: true },
    { key: 'responded', label: t('seller.reviews.tabResponded'), count: counts?.responded ?? 0 },
    { key: 'flagged', label: t('seller.reviews.tabFlagged'), count: counts?.flagged ?? 0 },
  ]

  const ratingChips: { key: RatingFilter; label: string }[] = [
    { key: 'all', label: t('seller.reviews.filterRatingAll') },
    { key: 5, label: '5 ★' },
    { key: 4, label: '4 ★' },
    { key: 3, label: '3 ★' },
    { key: 2, label: '2 ★' },
    { key: 1, label: '1 ★' },
  ]

  const responseChips: { key: SellerReviewResponseFilter; label: string }[] = [
    { key: 'all', label: t('seller.reviews.filterResponseAll') },
    { key: 'with', label: t('seller.reviews.filterResponseWith') },
    { key: 'without', label: t('seller.reviews.filterResponseWithout') },
  ]

  const hasActiveFilters =
    rating !== 'all' ||
    hasResponse !== 'all' ||
    hasPhotos ||
    !!productId ||
    status !== 'all'

  const clearAll = () => {
    setRating('all')
    setHasResponse('all')
    setHasPhotos(false)
    setProductId(undefined)
    setStatus('all')
  }

  const openCompose = (reviewId: string) => {
    setComposeReviewId(reviewId)
    setComposeDraft('')
    setComposeMode('create')
    setComposeError(null)
    setComposeSuccess(false)
    setComposeOpen(true)
  }

  const openEdit = (reviewId: string) => {
    const review = items.find(r => r.id === reviewId)
    setComposeReviewId(reviewId)
    setComposeDraft(review?.response?.text ?? '')
    setComposeMode('edit')
    setComposeError(null)
    setComposeSuccess(false)
    setComposeOpen(true)
  }

  const closeCompose = () => {
    setComposeOpen(false)
    setComposeReviewId(null)
    setComposeDraft('')
    setComposeError(null)
  }

  const submitResponse = () => {
    if (!composeReviewId) return
    const trimmed = composeDraft.trim()
    const result = reviewResponseSchema.safeParse({ text: trimmed })
    if (!result.success) {
      setComposeError(result.error.errors[0]?.message ?? 'Validation error')
      return
    }
    setComposeError(null)
    const mutation = composeMode === 'edit' ? editResponse : respond
    mutation.mutate(
      { reviewId: composeReviewId, text: trimmed },
      {
        onSuccess: () => {
          if (!reduced) {
            setComposeSuccess(true)
            setTimeout(() => closeCompose(), reduced ? 0 : 1200)
          } else {
            closeCompose()
          }
        },
        onError: () => {
          setComposeError(t('seller.reviews.responseError'))
        },
      },
    )
  }

  const openDeleteConfirm = (reviewId: string) => {
    setDeleteReviewId(reviewId)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteReviewId) return
    deleteResponse.mutate(deleteReviewId, {
      onSuccess: () => {
        setDeleteConfirmOpen(false)
        setDeleteReviewId(null)
      },
    })
  }

  return (
    <Screen>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-sticky bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 border-b border-border-light">
        <Container className="max-w-[1000px]">
          <div className="py-4 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-background transition-colors min-touch"
              aria-label={t('seller.reviews.back')}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-text leading-tight truncate">
                {t('seller.reviews.title')}
              </h1>
              <p className="text-[12px] text-text-muted truncate">{t('seller.reviews.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              aria-label={t('seller.reviews.refreshAria')}
              className="inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-background transition-colors min-touch"
            >
              <RefreshCw
                size={18}
                className={isFetching ? 'animate-spin' : ''}
                aria-hidden="true"
              />
            </button>
          </div>
        </Container>
      </div>

      <Container className="max-w-[1000px]">
        <div className="py-6 flex flex-col gap-5">
          {/* Summary card (e1) */}
          {isLoading ? (
            <SummarySkeleton />
          ) : (
          <section
            aria-label={t('seller.reviews.summaryAria', { average: average.toFixed(1), total: totalReviews })}
            className="rounded-lg border border-border-light bg-surface p-5 md:p-6 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Average + stars */}
              <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-1 md:min-w-[180px]">
                <CountUp
                  value={average}
                  display={(v) => v.toFixed(1)}
                  duration={duration.slow}
                  reduced={reduced}
                  className="text-[32px] leading-[42px] font-bold text-text tabular-nums"
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-[2px]" aria-hidden="true">
                    {STARS.slice()
                      .sort((a, b) => a - b)
                      .map(s => (
                        <Star
                          key={s}
                          size={18}
                          className={s <= Math.round(average) ? 'text-gold fill-gold' : 'text-border'}
                        />
                      ))}
                  </div>
                  <span className="text-[12px] font-normal text-text-muted tabular-nums">
                    {totalReviews.toLocaleString()} {t('seller.reviews.totalReviews')}
                  </span>
                </div>
              </div>

              {/* Distribution */}
              <div
                className="flex-1 flex flex-col gap-1.5"
                role="img"
                aria-label={t('seller.reviews.distributionAria')}
              >
                {STARS.map(stars => {
                  const count = distribution[stars]
                  const p = pct(count, totalReviews)
                  return (
                    <div
                      key={stars}
                      className="flex items-center gap-3"
                      aria-label={t('seller.reviews.rowAria', { stars, count, pct: p })}
                    >
                      <span className="w-6 text-[13px] font-semibold text-text-secondary tabular-nums text-right">
                        {stars}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-border-light overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{
                            width: mounted ? `${p}%` : '0%',
                            transition: reduced ? 'none' : `width ${duration.slower}ms cubic-bezier(${easing.easeOut.join(',')})`,
                            transitionDelay: reduced ? '0ms' : `${stars * 60}ms`,
                          }}
                        />
                      </div>
                      <span className="w-14 text-right text-[12px] font-semibold text-text tabular-nums">
                        {count}
                      </span>
                      <span className="w-10 text-right text-[12px] font-normal text-text-muted tabular-nums">
                        {p}%
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Trend */}
              <div className="flex md:flex-col items-center md:items-end gap-2 md:min-w-[140px] md:border-l md:border-border-light md:pl-6">
                <span
                  className={`inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${
                    trendUp ? 'text-success' : trendDown ? 'text-error' : 'text-text-muted'
                  }`}
                >
                  {trendUp ? <span>↑ <CountUp value={trendPct} display={(v) => `${Math.round(v)}%`} duration={duration.slow} reduced={reduced} /></span> : trendDown ? <span>↓ <CountUp value={Math.abs(trendPct)} display={(v) => `${Math.round(v)}%`} duration={duration.slow} reduced={reduced} /></span> : '—'}
                </span>
                <span className="text-[12px] font-normal text-text-muted">
                  {t('seller.reviews.trend')}
                </span>
              </div>
            </div>
          </section>

          )}

          {/* Filter / sort bar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 flex-wrap">
              {/* Rating chips */}
              <span className="sr-only">{t('seller.reviews.filterRating')}</span>
              {ratingChips.map(c => (
                <FilterChip
                  key={String(c.key)}
                  label={c.label}
                  pressed={rating === c.key}
                  onClick={() => setRating(c.key)}
                />
              ))}

              <span className="w-px h-6 bg-border-light mx-1 self-center" aria-hidden="true" />

              {/* Response chips */}
              <span className="sr-only">{t('seller.reviews.filterResponse')}</span>
              {responseChips.map(c => (
                <FilterChip
                  key={c.key}
                  label={c.label}
                  pressed={hasResponse === c.key}
                  onClick={() => setHasResponse(c.key)}
                />
              ))}

              <span className="w-px h-6 bg-border-light mx-1 self-center" aria-hidden="true" />

              {/* Photos chip */}
              <FilterChip
                label={t('seller.reviews.filterPhotos')}
                pressed={hasPhotos}
                onClick={() => setHasPhotos(v => !v)}
                icon={<ImageIcon size={14} aria-hidden="true" />}
              />

              {/* Product select */}
              <select
                aria-label={t('seller.reviews.filterProduct')}
                value={productId ?? ''}
                onChange={e => setProductId(e.target.value || undefined)}
                className="h-9 rounded-full border border-border bg-background px-3 text-[13px] font-medium text-text outline-none focus:border-primary transition-colors min-h-[36px]"
              >
                <option value="">{t('seller.reviews.filterProductAll')}</option>
                {productOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[13px] font-medium text-primary hover:text-primary-dark transition-colors ml-1 self-center"
                >
                  {t('seller.products.clearAll')}
                </button>
              )}

              {/* Sort dropdown */}
              <div ref={sortRef} className="relative ml-auto self-center">
                <button
                  type="button"
                  onClick={() => setSortOpen(o => !o)}
                  aria-label={t('seller.reviews.sortAria')}
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  className="h-9 px-3 rounded-full border border-border bg-background text-[13px] font-medium text-text flex items-center gap-1.5 hover:border-text-tertiary transition-colors"
                >
                  <ArrowUpDown size={15} className="text-text-muted" aria-hidden="true" />
                  <span>{activeSortLabel}</span>
                  <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.ul
                      role="listbox"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: reduced ? 0 : 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-1 w-52 bg-surface border border-border rounded-md shadow-lg z-dropdown overflow-hidden"
                    >
                      {sortOptions.map(opt => (
                        <li key={opt.key}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={sort === opt.key}
                            onClick={() => {
                              setSort(opt.key)
                              setSortOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-[14px] flex items-center justify-between transition-colors hover:bg-background ${
                              sort === opt.key ? 'text-primary font-semibold' : 'text-text'
                            }`}
                          >
                            {opt.label}
                            {sort === opt.key && <span className="text-primary" aria-hidden="true">•</span>}
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Status tabs (segment control) */}
          <div
            role="tablist"
            aria-label={t('seller.reviews.title')}
            className="flex items-center gap-1 p-1 bg-surface rounded-full h-10 w-full md:w-auto md:inline-flex overflow-x-auto scrollbar-none border border-border-light"
          >
            {tabs.map(tab => {
              const isActive = tab.key === status
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setStatus(tab.key)}
                  className={`relative z-10 flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 shrink-0 ${
                    isActive ? 'text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="reviews-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary"
                      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                    />
                  )}
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center text-[12px] font-semibold rounded-full px-1.5 min-w-[20px] h-5 transition-colors ${
                      tab.warning && tab.count > 0
                        ? isActive
                          ? 'bg-warning text-white'
                          : 'bg-warning/15 text-[#92400E]'
                        : isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-border text-text-secondary'
                    }`}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Result count */}
          <p className="text-[13px] text-text-muted -mt-1">
            {t('seller.reviews.count', { count: data?.total ?? 0 })}
          </p>

          {/* Offline banner */}
          {isOffline && !isLoading && !isError && items.length > 0 && (
            <div role="status" aria-label={t('seller.reviews.offlineAria')} className="rounded-md bg-warning/10 border border-warning/20 px-4 py-2.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning shrink-0" aria-hidden="true" />
              <span className="text-[13px] text-[#92400E]">{t('seller.reviews.offlineSubtitle')}</span>
            </div>
          )}

          {/* List slot (SV2) */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ReviewCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title={t('seller.reviews.errorTitle')}
                subtitle={t('seller.reviews.errorSubtitle')}
                retryLabel={t('seller.reviews.errorRetry')}
                retryAria={t('seller.reviews.errorRetryAria')}
                onRetry={() => refetch()}
              />
            ) : items.length === 0 ? (
              <ReviewsEmptyState
                status={status}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearAll}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {items.map((review, i) => (
                  <motion.div
                    key={review.id}
                    layout
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.25, delay: Math.min(i * 0.03, 0.2), ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ReviewCard
                      review={review}
                      responding={composeReviewId === review.id && activeMutation.isPending}
                      onRespond={() => openCompose(review.id)}
                      onEditResponse={() => openEdit(review.id)}
                      onDeleteResponse={() => openDeleteConfirm(review.id)}
                      onFlag={() => toggleFlag.mutate(review.id)}
                      onContactBuyer={() => router.push('/messages')}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </Container>

      {/* Compose / edit response modal */}
      <RespondComposer
        visible={composeOpen}
        mode={composeMode}
        review={items.find(r => r.id === composeReviewId) ?? null}
        draft={composeDraft}
        onDraftChange={setComposeDraft}
        onClose={closeCompose}
        onSubmit={submitResponse}
        pending={activeMutation.isPending}
        error={composeError}
        success={composeSuccess}
        reduced={reduced}
        language={i18n.language as 'en' | 'ne'}
      />

      {/* Delete confirm */}
      <DeleteConfirm
        open={deleteConfirmOpen}
        pending={deleteResponse.isPending}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false)
          setDeleteReviewId(null)
        }}
        reduced={reduced}
      />
    </Screen>
  )
}

function CountUp({ value, display, duration: dur, reduced, className }: { value: number; display: (v: number) => string; duration: number; reduced: boolean; className?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (reduced) {
      setDisplayed(value)
      return
    }
    const start = performance.now()
    const animate = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(value * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, dur, reduced])

  return <span className={className}>{display(displayed)}</span>
}

function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading review summary" className="rounded-lg border border-border-light bg-surface p-5 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:min-w-[180px]">
          <div className="w-20 h-8 rounded-md bg-shimmer animate-pulse" />
          <div className="flex flex-col gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="w-4 h-4 rounded-full bg-shimmer animate-pulse" />))}
            </div>
            <div className="w-24 h-3 rounded bg-shimmer animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-3 rounded bg-shimmer animate-pulse" />
              <div className="flex-1 h-2 rounded-full bg-shimmer animate-pulse" />
              <div className="w-14 h-3 rounded bg-shimmer animate-pulse" />
              <div className="w-10 h-3 rounded bg-shimmer animate-pulse" />
            </div>
          ))}
        </div>
        <div className="md:min-w-[140px] md:border-l md:border-border-light md:pl-6 flex md:flex-col items-center md:items-end gap-2">
          <div className="w-16 h-3 rounded bg-shimmer animate-pulse" />
          <div className="w-20 h-3 rounded bg-shimmer animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function ErrorState({ title, subtitle, retryLabel, retryAria, onRetry }: { title: string; subtitle: string; retryLabel: string; retryAria: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-8 py-12 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
        <AlertTriangle size={24} className="text-error" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="text-sm text-text-muted leading-5 max-w-sm">{subtitle}</p>
      <button type="button" onClick={onRetry} aria-label={retryAria} className="mt-2 inline-flex items-center gap-1.5 rounded-md border-2 border-primary text-primary px-4 py-2 text-sm font-semibold hover:bg-primary-50 transition-colors">
        <RefreshCw size={15} aria-hidden="true" />
        {retryLabel}
      </button>
    </div>
  )
}

function ReviewsEmptyState({ status, hasActiveFilters, onClearFilters }: { status: SellerReviewStatus; hasActiveFilters: boolean; onClearFilters: () => void }) {
  const { t } = useTranslation()
  if (hasActiveFilters) {
    return (<EmptyState icon={<MessageSquare size={40} className="text-text-tertiary" aria-hidden="true" />} title={t('seller.reviews.noResultsTitle')} subtitle={t('seller.reviews.noResultsSubtitle')} action={{ label: t('seller.reviews.noResultsClearFilters'), onPress: onClearFilters }} />)
  }
  if (status === 'needs_response') {
    return (<EmptyState icon={<CheckCircle2 size={40} className="text-success" aria-hidden="true" />} title={t('seller.reviews.allCaughtUpTitle')} subtitle={t('seller.reviews.allCaughtUpSubtitle')} />)
  }
  if (status === 'responded') {
    return (<EmptyState icon={<CheckCircle2 size={40} className="text-success" aria-hidden="true" />} title={t('seller.reviews.allCaughtUpRespondedTitle')} subtitle={t('seller.reviews.allCaughtUpRespondedSubtitle')} />)
  }
  if (status === 'flagged') {
    return (<EmptyState icon={<AlertTriangle size={40} className="text-text-tertiary" aria-hidden="true" />} title={t('seller.reviews.allCaughtUpFlaggedTitle')} subtitle={t('seller.reviews.allCaughtUpFlaggedSubtitle')} />)
  }
  return (<EmptyState icon={<MessageSquare size={40} className="text-text-tertiary" aria-hidden="true" />} title={t('seller.reviews.noReviewsTitle')} subtitle={t('seller.reviews.noReviewsSubtitle')} />)
}

function FilterChip({
  label,
  pressed,
  onClick,
  icon,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[13px] font-medium border min-h-[36px] transition-colors duration-150 ${
        pressed ? 'bg-primary text-white border-primary' : 'bg-background text-text border-border hover:border-text-tertiary'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function RespondComposer({
  visible,
  mode,
  review,
  draft,
  onDraftChange,
  onClose,
  onSubmit,
  pending,
  error,
  success,
  reduced,
  language,
}: {
  visible: boolean
  mode: 'create' | 'edit'
  review: SellerReview | null
  draft: string
  onDraftChange: (text: string) => void
  onClose: () => void
  onSubmit: () => void
  pending: boolean
  error: string | null
  success: boolean
  reduced: boolean
  language: 'en' | 'ne'
}) {
  const { t } = useTranslation()
  const MAX = 1000
  const isLowRating = review ? review.rating <= 2 : false
  const trimmed = draft.trim()
  const charCount = draft.length

  useEffect(() => {
    if (!visible) onDraftChange('')
  }, [visible, onDraftChange])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const templates = REVIEW_RESPONSE_TEMPLATES.map(tpl => ({
    id: tpl.id,
    label: language === 'ne' ? tpl.labelNe : t(tpl.labelKey),
    body: language === 'ne' ? tpl.bodyNe : tpl.body,
  }))

  const submitLabel = mode === 'edit'
    ? (pending ? t('seller.reviews.responseEditing') : t('seller.reviews.responseEdit'))
    : (pending ? t('seller.reviews.responding') : t('seller.reviews.responseSend'))

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="relative bg-background rounded-2xl p-5 w-full max-w-[520px] shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-text">
                {mode === 'edit' ? t('reviewCard.editResponse') : t('seller.reviews.respond')}
              </h2>
              <button onClick={onClose} className="text-text-muted p-1 hover:text-text" aria-label={t('seller.reviews.back')}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Tone hint for low ratings */}
            {isLowRating && (
              <div className="mb-3 rounded-md bg-warning/10 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[12px] text-[#92400E] leading-4">{t('seller.reviews.responseToneHint')}</p>
              </div>
            )}

            {/* Templates */}
            <div className="mb-3">
              <p className="text-[12px] font-semibold text-text-muted mb-1.5">{t('seller.reviews.responseTemplates')}</p>
              <div className="flex flex-wrap gap-1.5">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onDraftChange(tpl.body)}
                    aria-label={`${t('seller.reviews.responseTemplatesAria')}: ${tpl.label}`}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-text hover:border-primary hover:text-primary transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={draft}
              onChange={e => onDraftChange(e.target.value.slice(0, MAX))}
              placeholder={t('seller.reviews.responsePlaceholder')}
              rows={4}
              className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-primary transition-colors"
              aria-label={t('seller.reviews.responsePlaceholder')}
              aria-describedby="char-count"
            />

            {/* Character counter */}
            <div id="char-count" className="mt-1 text-right" role="status" aria-live="polite">
              <span className={`text-[12px] ${charCount > MAX * 0.9 ? 'text-warning' : 'text-text-muted'}`}>
                {t('seller.reviews.responseCounter', { count: charCount, max: MAX })}
              </span>
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="mt-2 text-[13px] text-error">{error}</p>
            )}

            {/* Success state */}
            <AnimatePresence>
              {success && !reduced && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  className="mt-3 flex items-center justify-center gap-2 py-3 rounded-md bg-success/10"
                  role="status"
                >
                  <CheckCircle2 size={20} className="text-success" aria-hidden="true" />
                  <span className="text-[14px] font-semibold text-success">
                    {mode === 'edit' ? t('seller.reviews.responseUpdated') : t('seller.reviews.responsePosted')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-md text-[13px] font-semibold text-text-muted hover:text-text transition-colors"
              >
                {t('seller.reviews.back')}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!trimmed || pending || success}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-primary-dark transition-colors active:scale-[0.98]"
              >
                {success ? <CheckCircle2 size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
                {success
                  ? (mode === 'edit' ? t('seller.reviews.responseUpdated') : t('seller.reviews.responsePosted'))
                  : submitLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function DeleteConfirm({
  open,
  pending,
  onConfirm,
  onCancel,
  reduced,
}: {
  open: boolean
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
  reduced: boolean
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
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
            className="relative bg-background rounded-2xl p-5 w-full max-w-[400px] shadow-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-error/10">
                <Trash2 size={20} className="text-error" aria-hidden="true" />
              </span>
              <h2 className="text-[18px] font-semibold text-text">{t('seller.reviews.responseDeleteConfirmTitle')}</h2>
            </div>
            <p className="text-[14px] text-text-muted leading-5 mb-5">{t('seller.reviews.responseDeleteConfirm')}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="h-9 px-4 rounded-md text-[13px] font-semibold text-text-muted hover:text-text transition-colors"
              >
                {t('seller.reviews.responseDeleteConfirmCancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-error text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-error/90 transition-colors active:scale-[0.98]"
              >
                <Trash2 size={14} aria-hidden="true" />
                {t('seller.reviews.responseDeleteConfirmAction')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
