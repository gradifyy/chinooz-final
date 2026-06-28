'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  CheckCircle2,
  Flag,
  MessageSquare,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import type { SellerReview } from '@chinooz/types'
import SafeImage from './SafeImage'
import Skeleton from './Skeleton'
import { useReducedMotion } from './hooks/useReducedMotion'

const AVATAR_SIZE = 40
const THUMB_SIZE = 32
const PHOTO_SIZE = 64

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso)
  const day = 24 * 60 * 60 * 1000
  if (diff < 0) return 'just now'
  if (diff < day) {
    const hrs = Math.floor(diff / (60 * 60 * 1000))
    if (hrs < 1) return 'just now'
    return `${hrs}h ago`
  }
  const days = Math.floor(diff / day)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export interface ReviewCardProps {
  review: SellerReview
  onRespond?: () => void
  onEditResponse?: () => void
  onDeleteResponse?: () => void
  onFlag?: () => void
  onContactBuyer?: () => void
  responding?: boolean
  selectable?: boolean
  selected?: boolean
  onSelectToggle?: () => void
  className?: string
  testID?: string
}

export default function ReviewCard({
  review,
  onRespond,
  onEditResponse,
  onDeleteResponse,
  onFlag,
  onContactBuyer,
  responding = false,
  selectable = false,
  selected = false,
  onSelectToggle,
  className = '',
  testID,
}: ReviewCardProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [kebabOpen, setKebabOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)
  const kebabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!kebabOpen) return
    const onClick = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setKebabOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [kebabOpen])

  const lowRating = review.rating <= 2
  const hasResponse = !!review.response
  const photos = review.photos ?? []
  const photoViewerVisible = photoIndex !== null

  const openPhoto = useCallback((index: number) => setPhotoIndex(index), [])
  const closePhoto = useCallback(() => setPhotoIndex(null), [])
  const nextPhoto = useCallback(() => {
    setPhotoIndex(i => (i === null ? null : Math.min(i + 1, photos.length - 1)))
  }, [photos.length])
  const prevPhoto = useCallback(() => {
    setPhotoIndex(i => (i === null ? null : Math.max(i - 1, 0)))
  }, [])

  useEffect(() => {
    if (!photoViewerVisible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhoto()
      if (e.key === 'ArrowRight' && photos.length > 1) nextPhoto()
      if (e.key === 'ArrowLeft' && photos.length > 1) prevPhoto()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [photoViewerVisible, closePhoto, nextPhoto, prevPhoto, photos.length])

  const cardAria = t('reviewCard.cardAria', {
    name: review.userName,
    product: review.productName,
    rating: review.rating,
  })
  const starAria = t('reviewCard.starRatingAria', { rating: review.rating })

  const cardCls = lowRating
    ? 'border-border-light border-l-[3px] border-l-warning bg-surface'
    : 'border-border-light bg-surface'

  return (
    <>
      <article
        data-testid={testID}
        aria-label={cardAria}
        className={`rounded-lg border ${cardCls} p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md active:scale-[0.99] ${selected ? 'ring-2 ring-primary border-primary' : ''} ${className}`}
      >
        {selectable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={cardAria}
            onClick={onSelectToggle}
            className="absolute top-3 right-3 z-10"
          >
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${
              selected ? 'bg-primary border-primary text-white' : 'bg-surface border-border'
            }`}>
              {selected && <CheckCircle2 size={16} aria-hidden="true" />}
            </span>
          </button>
        )}

        {/* Header */}
        <div className="flex items-start gap-2.5">
          <div
            className="shrink-0 rounded-full bg-primary-50 flex items-center justify-center"
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            aria-hidden="true"
          >
            <span className="text-[15px] font-semibold text-primary">
              {review.userName.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[15px] font-semibold text-text truncate">{review.userName}</span>
              {review.verifiedPurchase && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5"
                  aria-label={t('reviewCard.verifiedPurchaseAria')}
                >
                  <CheckCircle2 size={12} className="text-success" aria-hidden="true" />
                  <span className="text-[10px] font-semibold text-success">{t('reviewCard.verifiedPurchase')}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-[1px] mt-0.5" aria-label={starAria} role="img">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < review.rating ? 'text-gold fill-gold' : 'text-border'}
                  aria-hidden="true"
                />
              ))}
              <span className="text-[12px] font-normal text-text-muted ml-1.5">{timeAgo(review.createdAt)}</span>
            </div>
          </div>

          {/* Status pill */}
          <StatusPill review={review} />
        </div>

        {/* Low-rating emphasis */}
        {lowRating && (
          <div className="mt-2 inline-flex items-center gap-1 rounded bg-warning/10 px-2 py-0.5">
            <AlertTriangle size={13} className="text-warning" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-[#92400E]">{t('reviewCard.lowRating')}</span>
          </div>
        )}

        {/* Product context */}
        <div className="flex items-center gap-2 mt-2.5">
          <SafeImage
            src={review.productImage}
            alt={review.productName}
            className="shrink-0 rounded-md object-cover bg-border-light"
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
          />
          <span className="text-[14px] font-medium text-text-secondary truncate">{review.productName}</span>
        </div>

        {/* Review text */}
        {review.title && <p className="text-[16px] font-semibold text-text mt-2">{review.title}</p>}
        <p className="text-[16px] font-normal text-text-secondary leading-[22px] mt-1">{review.body}</p>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => openPhoto(i)}
                aria-label={t('reviewCard.photoAlt', { index: i + 1, name: review.userName })}
                className="rounded-md overflow-hidden bg-border-light shrink-0 transition-transform hover:scale-105 active:scale-95"
                style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
              >
                <SafeImage
                  src={src}
                  alt={t('reviewCard.photoAlt', { index: i + 1, name: review.userName })}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Existing seller response */}
        {hasResponse && review.response && (
          <div className="mt-3 ml-2 rounded-md border border-border-light border-l-[3px] border-l-primary-50 bg-background p-3">
            <p className="text-[12px] font-semibold text-primary mb-0.5">{t('reviewCard.sellerResponse')}</p>
            <p className="text-[14px] text-text-secondary leading-5">{review.response.text}</p>
            {(onEditResponse || onDeleteResponse) && (
              <div className="flex items-center gap-3 mt-2">
                {onEditResponse && (
                  <button
                    type="button"
                    onClick={onEditResponse}
                    aria-label={t('reviewCard.editResponseAria', { name: review.userName })}
                    className="text-[12px] font-semibold text-primary hover:underline transition-colors"
                  >
                    {t('reviewCard.editResponse')}
                  </button>
                )}
                {onDeleteResponse && (
                  <button
                    type="button"
                    onClick={onDeleteResponse}
                    aria-label={t('reviewCard.deleteResponseAria', { name: review.userName })}
                    className="text-[12px] font-semibold text-error hover:underline transition-colors"
                  >
                    {t('reviewCard.deleteResponse')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {!hasResponse && onRespond && (
            <button
              type="button"
              onClick={onRespond}
              disabled={responding}
              aria-label={t('reviewCard.respondAria', { name: review.userName })}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-white px-3 h-[34px] text-[13px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              <MessageSquare size={15} aria-hidden="true" />
              {responding ? t('reviewCard.responding') : t('reviewCard.respond')}
            </button>
          )}

          {/* Flag quick-action (subtle) */}
          {onFlag && (
            <button
              type="button"
              onClick={onFlag}
              aria-label={t('reviewCard.flagAria', { name: review.userName })}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 h-[34px] text-[13px] font-semibold border transition-colors active:scale-[0.98] ${
                review.flagged
                  ? 'bg-error/10 text-error border-error/20'
                  : 'bg-surface text-text-muted border-border hover:text-text hover:border-text-tertiary'
              }`}
            >
              <Flag size={15} aria-hidden="true" />
              {review.flagged ? t('reviewCard.unflag') : t('reviewCard.flag')}
            </button>
          )}

          {/* Kebab → contact buyer + report */}
          {onContactBuyer && (
            <div ref={kebabRef} className="relative">
              <button
                type="button"
                onClick={() => setKebabOpen(o => !o)}
                aria-label={t('reviewCard.moreActionsAria', { name: review.userName })}
                aria-haspopup="menu"
                aria-expanded={kebabOpen}
                className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full text-text-muted hover:text-text hover:bg-background transition-colors active:scale-[0.98]"
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
              <AnimatePresence>
                {kebabOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: reduced ? 0 : 0.15 }}
                    className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-md shadow-lg z-50 overflow-hidden"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={t('reviewCard.contactBuyerAria', { name: review.userName })}
                      onClick={() => {
                        setKebabOpen(false)
                        onContactBuyer()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-text hover:bg-background transition-colors text-left"
                    >
                      <MessageSquare size={16} className="text-primary" aria-hidden="true" />
                      {t('reviewCard.contactBuyer')}
                    </button>
                    {onFlag && (
                      <button
                        type="button"
                        role="menuitem"
                        aria-label={t('reviewCard.flagAria', { name: review.userName })}
                        onClick={() => {
                          setKebabOpen(false)
                          onFlag()
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-text hover:bg-background transition-colors text-left border-t border-border-light"
                      >
                        <Flag size={16} className={review.flagged ? 'text-error' : 'text-text-muted'} aria-hidden="true" />
                        {review.flagged ? t('reviewCard.unflag') : t('reviewCard.reportReview')}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {review.helpful > 0 && (
            <span className="text-[12px] font-normal text-text-tertiary ml-auto">
              {t('reviewCard.helpful', { count: review.helpful })}
            </span>
          )}
        </div>
      </article>

      {/* Photo viewer */}
      <PhotoViewer
        visible={photoViewerVisible}
        photos={photos}
        index={photoIndex ?? 0}
        onClose={closePhoto}
        onNext={nextPhoto}
        onPrev={prevPhoto}
        ariaLabel={t('reviewCard.photoViewerAria', {
          index: (photoIndex ?? 0) + 1,
          total: photos.length,
        })}
        closeAria={t('reviewCard.photoViewerClose')}
        nextAria={t('reviewCard.photoViewerNext')}
        prevAria={t('reviewCard.photoViewerPrev')}
      />
    </>
  )
}

function StatusPill({ review }: { review: SellerReview }) {
  const { t } = useTranslation()
  if (review.flagged) {
    const status = review.moderationStatus ?? 'pending'
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 shrink-0">
          <Flag size={10} className="text-warning" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#92400E]">{t('seller.reviews.statusPending')}</span>
        </span>
      )
    }
    if (status === 'removed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-1.5 py-0.5 shrink-0">
          <Flag size={10} className="text-error" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-error">{t('seller.reviews.statusRemoved')}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-border px-1.5 py-0.5 shrink-0">
        <Flag size={10} className="text-text-muted" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{t('seller.reviews.statusDismissed')}</span>
      </span>
    )
  }
  if (review.response) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 shrink-0">
        <CheckCircle2 size={10} className="text-success" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-success">{t('reviewCard.responded')}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 shrink-0">
      <AlertTriangle size={10} className="text-[#92400E]" aria-hidden="true" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#92400E]">{t('reviewCard.needsResponse')}</span>
    </span>
  )
}

function PhotoViewer({
  visible,
  photos,
  index,
  onClose,
  onNext,
  onPrev,
  ariaLabel,
  closeAria,
  nextAria,
  prevAria,
}: {
  visible: boolean
  photos: string[]
  index: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  ariaLabel: string
  closeAria: string
  nextAria: string
  prevAria: string
}) {
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [visible])

  if (!visible || photos.length === 0) return null
  const hasMultiple = photos.length > 1

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="flex justify-end p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeAria}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 relative">
        <SafeImage
          src={photos[index]}
          alt={ariaLabel}
          className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={onPrev}
              aria-label={prevAria}
              disabled={index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={28} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label={nextAria}
              disabled={index === photos.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={28} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// --- Skeleton ---

export function ReviewCardSkeleton({ className = '', testID }: { className?: string; testID?: string }) {
  return (
    <div
      data-testid={testID}
      aria-busy="true"
      aria-label="Loading review"
      className={`rounded-lg border border-border-light bg-surface p-4 shadow-sm flex flex-col gap-2.5 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} circle />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton width={140} height={14} />
          <Skeleton width={90} height={12} />
        </div>
        <Skeleton width={60} height={16} borderRadius={9999} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={6} />
        <Skeleton width={160} height={14} />
      </div>
      <Skeleton width="100%" height={16} />
      <Skeleton width="85%" height={16} />
      <Skeleton width="60%" height={16} />
      <div className="flex items-center gap-2">
        <Skeleton width={PHOTO_SIZE} height={PHOTO_SIZE} borderRadius={8} />
        <Skeleton width={PHOTO_SIZE} height={PHOTO_SIZE} borderRadius={8} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={100} height={32} borderRadius={9999} />
        <Skeleton width={60} height={32} borderRadius={9999} />
      </div>
    </div>
  )
}
