'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

interface BrandRevealProps {
  onComplete: () => void
}

export function BrandReveal({ onComplete }: BrandRevealProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(onComplete, reduced ? 300 : 2200)
    return () => clearTimeout(timer)
  }, [onComplete, reduced])

  return (
    <motion.div
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE_OUT } }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={reduced ? {} : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: 'spring', damping: 18, stiffness: 180, mass: 0.9 }
        }
        className="relative mb-8"
      >
        {!reduced && (
          <motion.div
            className="absolute inset-0 rounded-[28px] bg-primary/50 blur-[50px]"
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <Image
          src="/chinooz-logo.png"
          alt={t('common.appName')}
          width={96}
          height={96}
          className="relative h-24 w-24 rounded-[28px] shadow-glow-primary"
        />
      </motion.div>

      <motion.h1
        initial={reduced ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.6, delay: 0.4, ease: EASE_OUT }
        }
        className="text-4xl font-bold text-white tracking-tight mb-3"
      >
        {t('common.appName')}
      </motion.h1>

      <motion.p
        initial={reduced ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.6, delay: 0.65, ease: EASE_OUT }
        }
        className="text-white/60 text-lg font-medium"
      >
        {t('about.tagline')}
      </motion.p>
    </motion.div>
  )
}
