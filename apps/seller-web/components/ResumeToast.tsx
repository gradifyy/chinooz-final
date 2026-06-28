'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

export default function ResumeToast() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -20 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
          className="fixed top-16 left-4 right-4 z-[100] bg-text rounded-lg px-4 py-3"
          role="alert"
          aria-label={t('seller.setup.resumeToast')}
        >
          <p className="text-sm font-semibold text-white text-center">{t('seller.setup.resumeToast')}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
