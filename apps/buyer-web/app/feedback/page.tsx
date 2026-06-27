'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'

const CATEGORIES = ['categoryBug', 'categoryFeature', 'categoryOrder', 'categoryOther']

export default function FeedbackPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('categoryBug')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(() => {
    const e: Record<string, string> = {}
    if (!subject.trim()) e.subject = t('feedback.subjectRequired')
    if (message.trim().length < 10) e.message = t('feedback.messageRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSuccess(true)
    }, 1000)
  }, [subject, message, t])

  if (success) {
    return (
      <Screen>
        <Container className="py-6 max-w-[600px]">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors">
              <span className="text-xl text-text">←</span>
            </button>
            <h1 className="text-xl font-bold text-text">{t('feedback.title')}</h1>
          </div>
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300 }}
            className="flex flex-col items-center justify-center py-20 gap-3"
          >
            <motion.div
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-success flex items-center justify-center"
            >
              <span className="text-2xl text-white font-bold">✓</span>
            </motion.div>
            <h3 className="text-lg font-semibold text-text">{t('feedback.successTitle')}</h3>
            <p className="text-sm text-text-muted">{t('feedback.successSubtitle')}</p>
          </motion.div>
        </Container>
      </Screen>
    )
  }

  return (
    <Screen>
      <Container className="py-6 max-w-[600px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('feedback.title')}</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('feedback.subject')} *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('feedback.subjectPlaceholder')}
              className={`w-full h-12 bg-surface rounded-lg border-[1.5px] px-3 text-base text-text outline-none focus:border-primary transition-colors ${errors.subject ? 'border-error' : 'border-border'}`}
              aria-label={t('feedback.subject')} />
            {errors.subject && <p className="text-xs text-error mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('feedback.category')}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-[1.5px] transition-colors ${category === cat ? 'border-primary bg-primary-50 text-primary' : 'border-border bg-surface text-text-muted'}`}>
                  {t(`feedback.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('feedback.message')} *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('feedback.messagePlaceholder')} rows={5}
              className={`w-full bg-surface rounded-xl border-[1.5px] px-3 py-3 text-base text-text outline-none focus:border-primary transition-colors resize-none ${errors.message ? 'border-error' : 'border-border'}`}
              aria-label={t('feedback.message')} />
            {errors.message && <p className="text-xs text-error mt-1">{errors.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('feedback.screenshot')}</label>
            <button className="w-full h-12 rounded-lg border-[1.5px] border-dashed border-border flex items-center gap-2 px-3 hover:border-primary/30 transition-colors" aria-label={t('feedback.addScreenshot')}>
              <span className="text-xl">📷</span>
              <span className="text-sm text-text-muted">{t('feedback.addScreenshot')}</span>
            </button>
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-12 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-70 mt-2"
            aria-label={submitting ? t('feedback.submitting') : t('feedback.submit')}>
            {submitting ? t('feedback.submitting') : t('feedback.submit')}
          </button>
        </div>
      </Container>
    </Screen>
  )
}
