'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

export default function SellerOfflineBanner() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
          className="sticky top-0 z-50 bg-warning-light border-b border-warning px-4 py-2 flex items-center gap-2"
          role="alert"
          aria-label={t('seller.setup.offlineBanner')}
        >
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-sm font-semibold text-[#92400E]">
            {t('seller.setup.offlineBanner')}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
