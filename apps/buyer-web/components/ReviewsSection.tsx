'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import type { Review } from '@chinooz/types'

type SortMode = 'recent' | 'highest' | 'photos'

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: size }} className={i < Math.round(rating) ? 'text-gold' : 'text-border'}>
          ★
        </span>
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
}

interface ReviewsSectionProps {
  reviews: Review[] | undefined
  isLoading?: boolean
  onWriteReview?: () => void
  showWriteButton?: boolean
}

export default function ReviewsSection({
  reviews,
  isLoading,
  onWriteReview,
  showWriteButton = true,
}: ReviewsSectionProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [sort, setSort] = useState<SortMode>('recent')
  const [expanded, setExpanded] = useState(false)

  const distribution = useMemo(() => {
    if (!reviews?.length) return Array(5).fill(0)
    const dist = Array(5).fill(0)
    reviews.forEach(r => { dist[Math.min(4, Math.max(0, Math.round(r.rating) - 1))]++ })
    return dist
  }, [reviews])

  const avgRating = useMemo(() => {
    if (!reviews?.length) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews])

  const sorted = useMemo(() => {
    if (!reviews) return []
    const copy = [...reviews]
    if (sort === 'recent') copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (sort === 'highest') copy.sort((a, b) => b.rating - a.rating)
    if (sort === 'photos') copy.sort((a, b) => (b.photos?.length || 0) - (a.photos?.length || 0))
    return expanded ? copy : copy.slice(0, 3)
  }, [reviews, sort, expanded])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="w-32 h-5 bg-border rounded animate-pulse" />
        <div className="w-full h-16 bg-border rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!reviews?.length) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <span className="text-4xl">💬</span>
        <p className="text-base font-semibold text-text">{t('product.noReviews')}</p>
        <p className="text-sm text-text-muted">{t('product.noReviewsSubtitle')}</p>
        {showWriteButton && onWriteReview && (
          <button
            onClick={onWriteReview}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm mt-2 hover:bg-primary-dark transition-colors"
          >
            {t('product.writeReview')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.25 }}
        className="flex gap-6 p-4"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-bold text-text">{avgRating.toFixed(1)}</span>
          <StarRating rating={avgRating} size={16} />
          <span className="text-xs text-text-muted">{reviews.length} {t('product.reviews').toLowerCase()}</span>
        </div>

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star, i) => {
            const count = distribution[star - 1]
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
            return (
              <motion.div
                key={star}
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.1 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-text-muted w-3">{star}</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.1, ease: 'easeOut' }}
                    className="h-full bg-gold rounded-full"
                  />
                </div>
                <span className="text-[11px] text-text-muted w-5 text-right">{count}</span>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Write review button */}
      {showWriteButton && onWriteReview && (
        <button
          onClick={onWriteReview}
          className="w-full bg-primary-50 text-primary py-3 rounded-xl font-semibold text-sm hover:bg-primary/10 transition-colors"
        >
          {t('product.writeReview')}
        </button>
      )}

      {/* Sort tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {([
          { key: 'recent', label: t('product.mostRecent') },
          { key: 'highest', label: t('product.highestRated') },
          { key: 'photos', label: t('product.withPhotos') },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSort(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              sort === tab.key
                ? 'bg-primary border-primary text-white'
                : 'bg-background border-border text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review list */}
      <div className="space-y-0">
        {sorted.map((review, i) => (
          <motion.div
            key={review.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.05 }}
            className="py-3 border-b border-border-light space-y-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">{getInitials(review.userName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{review.userName}</p>
                <div className="flex items-center gap-1">
                  <StarRating rating={review.rating} size={10} />
                  <span className="text-[11px] text-text-muted">{formatDate(review.createdAt)}</span>
                </div>
              </div>
            </div>
            {review.title && <p className="text-sm font-semibold text-text">{review.title}</p>}
            <p className="text-sm text-text-secondary leading-relaxed">{review.body}</p>
            {review.photos && review.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {review.photos.map((photo, pi) => (
                  <div key={pi} className="w-16 h-16 rounded-lg overflow-hidden bg-border shrink-0">
                    <img src={photo} alt={`Review photo ${pi + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}
            <button className="text-xs text-text-muted hover:text-text transition-colors">
              👍 {t('product.helpful')} ({review.helpful})
            </button>
          </motion.div>
        ))}
      </div>

      {/* See all */}
      {!expanded && reviews.length > 3 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-center py-3 text-sm font-semibold text-primary hover:underline"
        >
          {t('product.seeAllReviews')} ({reviews.length})
        </button>
      )}
    </div>
  )
}
