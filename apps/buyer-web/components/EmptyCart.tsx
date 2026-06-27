'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatNPR } from '@chinooz/utils'
import { useReducedMotion } from '@chinooz/ui-web'
import { useRecommendedProducts } from '@chinooz/hooks'
import type { Product } from '@chinooz/types'

export default function EmptyCart() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data: recommended } = useRecommendedProducts()

  return (
    <div className="flex flex-col items-center">
      {/* Illustration */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 18, stiffness: 120, mass: 1, delay: 0.1 }}
        className="relative w-40 h-40 mb-6"
      >
        <div className="w-36 h-36 rounded-full bg-primary-50 flex items-center justify-center mx-auto">
          <div className="w-24 h-24 rounded-full bg-primary/8 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/12 flex items-center justify-center">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
        </div>
        <div className="absolute top-2 left-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
          <span className="text-sm">📦</span>
        </div>
        <div className="absolute top-6 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
          <span className="text-xs">✨</span>
        </div>
        <div className="absolute bottom-4 left-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
          <span className="text-xs">🛍️</span>
        </div>
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.2 }}
        className="text-center space-y-2 mb-6"
      >
        <h2 className="text-xl font-bold text-text">{t('cart.empty')}</h2>
        <p className="text-sm text-text-muted leading-relaxed">{t('cart.emptySubtitle')}</p>
      </motion.div>

      <motion.button
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.3 }}
        whileHover={reduced ? {} : { scale: 1.03 }}
        whileTap={reduced ? {} : { scale: 0.97 }}
        onClick={() => router.push('/')}
        className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
      >
        {t('cart.startShopping')}
      </motion.button>

      {/* Recommended rail */}
      {recommended && recommended.length > 0 && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.4 }}
          className="w-full max-w-4xl mt-10"
        >
          <h3 className="text-lg font-semibold text-text mb-3">{t('cart.recentlyViewed')}</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {recommended.slice(0, 8).map((product, i) => (
              <motion.div
                key={product.id}
                initial={reduced ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : i * 0.04 }}
                className="shrink-0 w-[160px] snap-start"
              >
                <button
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="w-full bg-surface rounded-xl overflow-hidden shadow-sm text-left hover:shadow-md transition-shadow"
                >
                  <div className="w-full h-[160px] bg-border flex items-center justify-center">
                    <span className="text-3xl">📦</span>
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-[13px] font-medium text-text truncate">{product.name}</p>
                    <p className="text-sm font-semibold text-text">{formatNPR(product.price)}</p>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
