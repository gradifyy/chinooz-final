'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'
import { useSubmitReview } from '@chinooz/hooks'

interface WriteReviewModalProps {
  visible: boolean
  productId: string
  onClose: () => void
  onSuccess: () => void
}

export default function WriteReviewModal({
  visible,
  productId,
  onClose,
  onSuccess,
}: WriteReviewModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const submitReview = useSubmitReview()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (rating === 0 || body.trim().length < 10) return
    setSubmitting(true)
    try {
      await submitReview.mutateAsync({
        productId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      })
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setRating(0)
        setTitle('')
        setBody('')
        onSuccess()
        onClose()
      }, 1200)
    } catch {} finally {
      setSubmitting(false)
    }
  }, [rating, title, body, productId, submitReview, onSuccess, onClose])

  const canSubmit = rating > 0 && body.trim().length >= 10 && !submitting

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 20, scale: 0.97 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-background rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-auto shadow-xl"
          >
            {submitted ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <motion.div
                  initial={reduced ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', damping: 12, stiffness: 400 }}
                  className="w-16 h-16 rounded-full bg-success flex items-center justify-center"
                >
                  <span className="text-white text-3xl">✓</span>
                </motion.div>
                <p className="text-lg font-semibold text-text">{t('product.reviewSubmitted')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">{t('product.writeReview')}</h2>

                {/* Star rating */}
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <motion.button
                      key={star}
                      onClick={() => setRating(star)}
                      whileTap={reduced ? {} : { scale: 1.3 }}
                      className="p-1"
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <span className={`text-3xl ${star <= rating ? 'text-gold' : 'text-border'}`}>
                        ★
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={`${t('product.writeReview')} (optional)`}
                  className="w-full h-12 bg-surface rounded-xl border-[1.5px] border-border px-4 text-base text-text outline-none focus:border-primary transition-colors"
                />

                {/* Body */}
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={t('product.writeReview')}
                  maxLength={2000}
                  className="w-full min-h-[100px] bg-surface rounded-xl border-[1.5px] border-border px-4 py-3 text-base text-text outline-none focus:border-primary transition-colors resize-none"
                />
                <p className="text-xs text-text-muted text-right">{body.length}/2000</p>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full bg-primary text-white h-12 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
                >
                  {submitting ? '...' : t('product.submitReview')}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
