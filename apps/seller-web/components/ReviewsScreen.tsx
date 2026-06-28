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
  Flag,
  Send,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  Screen,
  Container,
  EmptyState,
  SafeImage,
  useReducedMotion,
} from '@chinooz/ui-web'
import {
  useSellerReviews,
  useSellerProducts,
  useRespondToSellerReview,
  useToggleSellerReviewFlag,
} from '@chinooz/hooks'
import { analytics } from '@chinooz/analytics'
import { useSellerSessionStore } from '@chinooz/state'
import type {
  SellerReviewFilter,
  SellerReviewSort,
  SellerReviewStatus,
  SellerReviewResponseFilter,
} from '@chinooz/mock-data'
import type { SellerReview } from '@chinooz/mock-data'

type RatingFilter = number | 'all'

const STARS = [5, 4, 3, 2, 1] as const

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

export default function ReviewsScreen() {
  const { t } = useTranslation()
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
  const sortRef = useRef<HTMLDivElement>(null)

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

  const { data, isLoading, isFetching, refetch } = useSellerReviews(filter)
  const { data: productsData } = useSellerProducts({ status: 'all', sort: 'best_selling' })

  const respond = useRespondToSellerReview()
  const toggleFlag = useToggleSellerReviewFlag()

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
          <section
            aria-label={t('seller.reviews.summaryAria', { average: average.toFixed(1), total: totalReviews })}
            className="rounded-lg border border-border-light bg-surface p-5 md:p-6 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Average + stars */}
              <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-1 md:min-w-[180px]">
                <span
                  className="text-[32px] leading-[42px] font-bold text-text tabular-nums"
                  aria-hidden="true"
                >
                  {average.toFixed(1)}
                </span>
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
                            transition: reduced ? 'none' : 'width 700ms cubic-bezier(0.22,1,0.36,1)',
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
                  {trendUp ? `↑ ${trendPct}%` : trendDown ? `↓ ${Math.abs(trendPct)}%` : '—'}
                </span>
                <span className="text-[12px] font-normal text-text-muted">
                  {t('seller.reviews.trend')}
                </span>
              </div>
            </div>
          </section>

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
                      transition={{ duration: reduced ? 0 : 0.15 }}
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

          {/* List slot (SV2) */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <ReviewsSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={40} className="text-text-tertiary" aria-hidden="true" />}
                title={hasActiveFilters ? t('seller.reviews.noFilteredTitle') : t('seller.reviews.noReviewsTitle')}
                subtitle={hasActiveFilters ? t('seller.reviews.noFilteredSubtitle') : t('seller.reviews.noReviewsSubtitle')}
                action={
                  hasActiveFilters
                    ? { label: t('seller.products.clearAll'), onPress: clearAll }
                    : undefined
                }
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {items.map((review, i) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    index={i}
                    reduced={reduced}
                    responding={respond.isPending}
                    onRespond={(text) => respond.mutate({ reviewId: review.id, text })}
                    onFlag={() => toggleFlag.mutate(review.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </Container>
    </Screen>
  )
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

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso)
  const day = 24 * 60 * 60 * 1000
  if (diff < day) return 'today'
  const days = Math.floor(diff / day)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function ReviewCard({
  review,
  index,
  reduced,
  responding,
  onRespond,
  onFlag,
}: {
  review: SellerReview
  index: number
  reduced: boolean
  responding: boolean
  onRespond: (text: string) => void
  onFlag: () => void
}) {
  const { t } = useTranslation()
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')

  const needsResponse = !review.response && !review.flagged

  const send = () => {
    const text = draft.trim()
    if (!text) return
    onRespond(text)
    setDraft('')
    setComposing(false)
  }

  return (
    <motion.article
      layout
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
      className={`rounded-lg border bg-surface p-4 md:p-5 transition-colors ${
        needsResponse
          ? 'border-warning/40 border-l-[3px] border-l-warning'
          : review.flagged
            ? 'border-error/30 border-l-[3px] border-l-error'
            : 'border-border-light'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="text-[14px] font-semibold text-primary">
            {review.userName.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-text truncate">{review.userName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-[1px]" aria-label={`${review.rating} stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < review.rating ? 'text-gold fill-gold' : 'text-border'}
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span className="text-[12px] text-text-muted">· {timeAgo(review.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {review.flagged ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-error/15 text-error px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                  <Flag size={11} aria-hidden="true" />
                  {t('seller.reviews.statusFlagged')}
                </span>
              ) : review.response ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                  <CheckCircle2 size={11} aria-hidden="true" />
                  {t('seller.reviews.statusResponded')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-[#92400E] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                  <AlertTriangle size={11} aria-hidden="true" />
                  {t('seller.reviews.statusNeedsResponse')}
                </span>
              )}
            </div>
          </div>

          {/* Product context */}
          <div className="flex items-center gap-2 mt-2">
            <SafeImage
              src={review.productImage}
              alt={review.productName}
              className="w-6 h-6 rounded-md object-cover bg-border-light shrink-0"
            />
            <span className="text-[12px] text-text-secondary truncate">{review.productName}</span>
          </div>

          {review.title && (
            <p className="text-[14px] font-semibold text-text mt-2">{review.title}</p>
          )}
          <p className="text-[14px] text-text-secondary mt-1 leading-5">{review.body}</p>

          {review.photos && review.photos.length > 0 && (
            <div className="flex items-center gap-2 mt-2" aria-label={t('seller.reviews.photosAria', { count: review.photos.length })}>
              {review.photos.map((src, i) => (
                <SafeImage
                  key={i}
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="w-14 h-14 rounded-md object-cover bg-border-light shrink-0"
                />
              ))}
            </div>
          )}

          {/* Existing response */}
          {review.response && (
            <div className="mt-3 rounded-md bg-background border border-border-light p-3">
              <p className="text-[12px] font-semibold text-primary mb-0.5">
                {t('seller.reviews.statusResponded')}
              </p>
              <p className="text-[13px] text-text-secondary leading-5">{review.response.text}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {!review.response && (
              <button
                type="button"
                onClick={() => setComposing(v => !v)}
                aria-label={t('seller.reviews.respondAria', { name: review.userName })}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary text-white px-3 h-8 text-[13px] font-semibold hover:bg-primary-dark transition-colors"
              >
                <MessageSquare size={14} aria-hidden="true" />
                {t('seller.reviews.respond')}
              </button>
            )}
            <button
              type="button"
              onClick={onFlag}
              aria-label={t('seller.reviews.flagAria', { name: review.userName })}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[13px] font-semibold border transition-colors ${
                review.flagged
                  ? 'bg-error/10 text-error border-error/30'
                  : 'bg-surface text-text-muted border-border hover:text-text hover:border-text-tertiary'
              }`}
            >
              <Flag size={14} aria-hidden="true" />
              {review.flagged ? t('seller.reviews.unflag') : t('seller.reviews.flag')}
            </button>
            {review.helpful > 0 && (
              <span className="text-[12px] text-text-tertiary ml-auto">
                {t('seller.reviews.helpful', { count: review.helpful })}
              </span>
            )}
          </div>

          {/* Compose response */}
          <AnimatePresence>
            {composing && !review.response && (
              <motion.div
                initial={reduced ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-md border border-border bg-background p-3">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={t('seller.reviews.responsePlaceholder')}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-primary transition-colors"
                    aria-label={t('seller.reviews.responsePlaceholder')}
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setComposing(false)
                        setDraft('')
                      }}
                      className="h-8 px-3 rounded-md text-[13px] font-semibold text-text-muted hover:text-text transition-colors"
                    >
                      {t('seller.reviews.back')}
                    </button>
                    <button
                      type="button"
                      onClick={send}
                      disabled={!draft.trim() || responding}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-primary-dark transition-colors"
                    >
                      <Send size={14} aria-hidden="true" />
                      {responding ? t('seller.reviews.responding') : t('seller.reviews.responseSend')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border-light bg-surface p-4 md:p-5 flex gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-shimmer animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/4 rounded bg-shimmer animate-pulse" />
            <div className="h-2.5 w-1/3 rounded bg-shimmer animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-shimmer animate-pulse mt-3" />
            <div className="h-2.5 w-1/2 rounded bg-shimmer animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
