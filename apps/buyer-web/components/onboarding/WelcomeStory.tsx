'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@chinooz/state'
import { useReducedMotion } from '@chinooz/ui-web'
import { MagneticButton } from './MagneticButton'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

const SLIDES = [
  {
    key: 'slide1',
    titleKey: 'onboarding.slide1Title',
    subtitleKey: 'onboarding.slide1Subtitle',
    image: '/onboarding-shop.png',
  },
  {
    key: 'slide2',
    titleKey: 'onboarding.slide2Title',
    subtitleKey: 'onboarding.slide2Subtitle',
    image: '/onboarding-delivery.png',
  },
  {
    key: 'slide3',
    titleKey: 'onboarding.slide3Title',
    subtitleKey: 'onboarding.slide3Subtitle',
    image: '/onboarding-payment.png',
  },
] as const

interface WelcomeStoryProps {
  onComplete: () => void
}

export function WelcomeStory({ onComplete }: WelcomeStoryProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)
  const [currentPage, setCurrentPage] = useState(0)
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const isLast = currentPage === SLIDES.length - 1

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, SLIDES.length - 1)))
  }, [])

  const handleNext = useCallback(() => {
    if (currentPage < SLIDES.length - 1) {
      goToPage(currentPage + 1)
    }
  }, [currentPage, goToPage])

  const finishOnboarding = useCallback(() => {
    markOnboardingSeen()
    document.cookie = 'chinooz-onboarding-seen=1; path=/; max-age=31536000'
    onComplete()
  }, [markOnboardingSeen, onComplete])

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number } }) => {
      const threshold = 80
      if (info.offset.x < -threshold && currentPage < SLIDES.length - 1) {
        goToPage(currentPage + 1)
      } else if (info.offset.x > threshold && currentPage > 0) {
        goToPage(currentPage - 1)
      }
    },
    [currentPage, goToPage]
  )

  return (
    <motion.div
      className="relative z-10 min-h-screen flex flex-col"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.35, ease: EASE_OUT } }}
      transition={
        reduced ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }
      }
    >
      {!isLast && (
        <div className="flex justify-end p-6">
          <button
            onClick={finishOnboarding}
            className="text-white/60 hover:text-white text-sm font-medium transition-colors"
          >
            {t('onboarding.skip')}
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 flex flex-col justify-center overflow-hidden"
      >
        <motion.div
          className="flex"
          drag={reduced ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          animate={{ x: -currentPage * width }}
          transition={
            reduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }
          }
        >
          {SLIDES.map((slide) => (
            <div
              key={slide.key}
              className="flex-shrink-0 w-full flex flex-col items-center justify-center px-6"
              style={{ width: width || '100%' }}
            >
              <motion.div
                initial={reduced ? {} : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.5, ease: EASE_OUT, delay: 0.1 }
                }
                className="mb-10"
              >
                <Image
                  src={slide.image}
                  alt={t(slide.titleKey)}
                  width={300}
                  height={300}
                  className="w-[300px] h-[300px] max-w-[70vw] max-h-[50vh] object-contain rounded-3xl"
                />
              </motion.div>

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: {
                      staggerChildren: reduced ? 0 : 0.1,
                      delayChildren: reduced ? 0 : 0.2,
                    },
                  },
                }}
                className="text-center max-w-md"
              >
                <motion.h2
                  variants={{
                    hidden: reduced ? {} : { opacity: 0, scale: 0.9, y: 10 },
                    show: {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { type: 'spring', damping: 20, stiffness: 300 },
                    },
                  }}
                  className="text-3xl font-bold text-white tracking-tight mb-3"
                >
                  {t(slide.titleKey)}
                </motion.h2>
                <motion.p
                  variants={{
                    hidden: reduced ? {} : { opacity: 0, y: 15 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, ease: EASE_OUT },
                    },
                  }}
                  className="text-white/60 text-base leading-relaxed"
                >
                  {t(slide.subtitleKey)}
                </motion.p>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-6 pb-10 px-6">
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === currentPage ? 24 : 8,
                backgroundColor:
                  i === currentPage ? 'color-mix(in srgb, var(--color-white) 90%, transparent)' : 'color-mix(in srgb, var(--color-white) 30%, transparent)',
              }}
              aria-label={t('onboarding.slideLabel', { number: i + 1 })}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          {!isLast ? (
            <>
              <button
                onClick={finishOnboarding}
                className="text-white/50 hover:text-white text-sm font-medium transition-colors py-3 px-4"
              >
                {t('onboarding.skip')}
              </button>
              <MagneticButton
                onClick={handleNext}
                className="bg-white text-primary px-8 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
              >
                {t('onboarding.next')}
              </MagneticButton>
            </>
          ) : (
            <MagneticButton
              onClick={finishOnboarding}
              className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-shadow min-w-[200px]"
            >
              {t('onboarding.getStarted')}
            </MagneticButton>
          )}
        </div>
      </div>
    </motion.div>
  )
}
