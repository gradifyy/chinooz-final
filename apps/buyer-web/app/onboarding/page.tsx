'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import OnboardingIllustration from '@/components/OnboardingIllustration'

const SLIDES = [
  { key: 'slide1', variant: 'shop' as const, titleKey: 'onboarding.slide1Title', subtitleKey: 'onboarding.slide1Subtitle' },
  { key: 'slide2', variant: 'delivery' as const, titleKey: 'onboarding.slide2Title', subtitleKey: 'onboarding.slide2Subtitle' },
  { key: 'slide3', variant: 'payment' as const, titleKey: 'onboarding.slide3Title', subtitleKey: 'onboarding.slide3Subtitle' },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

export default function OnboardingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)
  const [currentPage, setCurrentPage] = useState(0)
  const [direction, setDirection] = useState(1)

  const isLast = currentPage === SLIDES.length - 1

  const goToPage = useCallback((page: number) => {
    setDirection(page > currentPage ? 1 : -1)
    setCurrentPage(page)
  }, [currentPage])

  const handleNext = useCallback(() => {
    if (currentPage < SLIDES.length - 1) {
      goToPage(currentPage + 1)
    }
  }, [currentPage, goToPage])

  const handleSkip = useCallback(() => {
    markOnboardingSeen()
    document.cookie = 'chinooz-onboarding-seen=1; path=/; max-age=31536000'
    router.push('/phone-entry')
  }, [markOnboardingSeen, router])

  const handleGetStarted = useCallback(() => {
    markOnboardingSeen()
    document.cookie = 'chinooz-onboarding-seen=1; path=/; max-age=31536000'
    router.push('/phone-entry')
  }, [markOnboardingSeen, router])

  const slide = SLIDES[currentPage]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-end px-6 pt-4">
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-sm font-medium text-text-muted hover:text-text transition-colors py-2 px-3"
          >
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="w-full max-w-[400px] flex flex-col items-center gap-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.key}
              custom={direction}
              variants={reduced ? undefined : slideVariants}
              initial={reduced ? false : 'enter'}
              animate="center"
              exit={reduced ? undefined : 'exit'}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }
              }
              className="flex flex-col items-center gap-8 w-full"
            >
              <OnboardingIllustration variant={slide.variant} />
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.15 }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <h1 className="text-[26px] font-bold text-text tracking-tight">
                  {t(slide.titleKey)}
                </h1>
                <p className="text-[15px] text-text-muted leading-relaxed max-w-[320px]">
                  {t(slide.subtitleKey)}
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 pb-8 px-6">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goToPage(i)}
              className="h-2 rounded-full transition-colors"
              animate={{
                width: i === currentPage ? 24 : 8,
                backgroundColor: i === currentPage ? '#8A1B57' : '#E5E5E5',
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.5 }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isLast ? (
            <>
              <button
                onClick={handleSkip}
                className="py-3 px-5 text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                {t('onboarding.skip')}
              </button>
              <motion.button
                onClick={handleNext}
                whileHover={reduced ? {} : { scale: 1.03 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
                className="bg-primary text-white py-3 px-6 rounded-xl font-semibold text-sm min-w-[120px] hover:bg-primary-dark transition-colors"
              >
                {t('onboarding.next')}
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={handleGetStarted}
              whileHover={reduced ? {} : { scale: 1.03 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              className="bg-primary text-white py-3.5 px-8 rounded-xl font-bold text-base min-w-[200px] hover:bg-primary-dark transition-colors"
            >
              {t('onboarding.getStarted')}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
