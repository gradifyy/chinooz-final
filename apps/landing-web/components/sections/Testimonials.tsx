'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { Reveal } from '@/components/motion/Reveal'
import { landingContent } from '@/content/landing'
import type { Locale } from '@/content/landing'
import { cn } from '@/lib/utils'

const accentGlows = [
  'rgba(122, 46, 90, 0.25)',
  'rgba(201, 154, 82, 0.2)',
  'rgba(160, 84, 128, 0.22)',
]

export function Testimonials({ locale }: { locale: Locale }) {
  const t = landingContent[locale].testimonials
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const count = t.items.length

  const go = useCallback(
    (dir: number) => setActive((prev) => (prev + dir + count) % count),
    [count]
  )

  useEffect(() => {
    if (reduce || paused) return
    timerRef.current = setInterval(() => go(1), 6000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [reduce, paused, go])

  const item = t.items[active]

  return (
    <Section className="canvas-ink grain relative overflow-hidden" id="testimonials">
      {/* Shifting ambient glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[160px]"
            style={{ background: accentGlows[active % accentGlows.length] }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dot grid texture */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <Reveal>
          <p className="text-caption font-semibold tracking-[0.12em] uppercase text-gold mb-3">
            {t.eyebrow}
          </p>
          <h2
            className={cn(
              'text-h1 font-bold text-white whitespace-pre-line mb-4 text-balance',
              locale === 'ne' ? 'font-devanagari' : 'font-display font-normal'
            )}
          >
            {t.headline}
          </h2>
          <p
            className={cn(
              'text-body-lg text-white/50 max-w-lg mx-auto mb-12 text-pretty',
              locale === 'ne' && 'font-devanagari'
            )}
          >
            {t.subheadline}
          </p>
        </Reveal>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-label="Testimonials carousel"
        >
          {/* Quote mark */}
          <div className="flex justify-center mb-6" aria-hidden="true">
            <motion.div
              animate={{ rotate: reduce ? 0 : [0, -8, 0], scale: reduce ? 1 : [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
            >
              <Quote size={40} className="text-primary-light/40" />
            </motion.div>
          </div>

          {/* Quote text */}
          <div className="relative min-h-[140px] md:min-h-[120px] flex items-center justify-center mb-10">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={active}
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                className={cn(
                  'text-h3 md:text-display-md font-display font-normal text-white leading-tight max-w-2xl mx-auto text-balance',
                  locale === 'ne' && 'font-devanagari font-bold'
                )}
              >
                &ldquo;{item.quote}&rdquo;
              </motion.blockquote>
            </AnimatePresence>
          </div>

          {/* Author */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center justify-center gap-4 mb-10"
            >
              <div className="w-12 h-12 rounded-full glass-ink edge-light edge-light-dark flex items-center justify-center shrink-0">
                <span className="text-gold text-sm font-bold tracking-wide">{item.initials}</span>
              </div>
              <div className="text-left">
                <p className={cn('text-white font-semibold text-base', locale === 'ne' && 'font-devanagari')}>
                  {item.author}
                </p>
                <p className={cn('text-white/40 text-caption', locale === 'ne' && 'font-devanagari')}>
                  {item.role}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => go(-1)}
              className="w-10 h-10 rounded-full glass-ink flex items-center justify-center text-white/60 hover:text-white hover:bg-primary/20 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>

            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {t.items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-400',
                    i === active ? 'w-8 bg-gold' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  )}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-current={i === active}
                />
              ))}
            </div>

            <button
              onClick={() => go(1)}
              className="w-10 h-10 rounded-full glass-ink flex items-center justify-center text-white/60 hover:text-white hover:bg-primary/20 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Next testimonial"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}
