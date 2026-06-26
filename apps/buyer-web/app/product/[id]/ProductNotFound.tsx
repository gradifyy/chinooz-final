'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

export default function ProductNotFound() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      className="flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <span className="text-6xl">📭</span>
      <h2 className="text-xl font-bold text-text">{t('product.productUnavailable')}</h2>
      <p className="text-sm text-text-muted max-w-sm leading-relaxed">
        {t('product.productUnavailableSubtitle')}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => router.push('/search')}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          {t('product.browseSimilar')}
        </button>
        <button
          onClick={() => router.push('/')}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t('product.backToHome')}
        </button>
      </div>
    </motion.div>
  )
}
