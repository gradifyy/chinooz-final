'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useReducedMotion } from '@chinooz/ui-web'

export default function OfflineBanner() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
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

  useEffect(() => {
    if (!isOffline) {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    }
  }, [isOffline, queryClient])

  const handleRetry = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] })
    await queryClient.invalidateQueries({ queryKey: ['deals'] })
  }, [queryClient])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
          className="sticky top-16 z-40 bg-warning-light border-b border-warning px-4 py-2"
        >
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-sm font-semibold text-[#92400E]">
              {t('home.connectionLost')}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
