'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useTranslation } from 'react-i18next'
import { Container, useReducedMotion } from '@chinooz/ui-web'
import { PhoneFrame } from './PhoneFrame'

const SCREENS = [
  { id: 'search', src: '/showcase/screen-search.png', alt: 'showcase.screens.search' },
  { id: 'cart', src: '/showcase/screen-cart.png', alt: 'showcase.screens.cart' },
  { id: 'tracking', src: '/showcase/screen-tracking.png', alt: 'showcase.screens.tracking' },
  { id: 'cod', src: '/showcase/screen-cod.png', alt: 'showcase.screens.cod' },
  { id: 'bilingual', src: '/showcase/screen-bilingual.png', alt: 'showcase.screens.bilingual' },
]

const FEATURES = [
  {
    id: 'search',
    icon: '🔍',
    titleKey: 'showcase.features.search.title',
    descKey: 'showcase.features.search.desc',
  },
  {
    id: 'cart',
    icon: '🛒',
    titleKey: 'showcase.features.cart.title',
    descKey: 'showcase.features.cart.desc',
  },
  {
    id: 'tracking',
    icon: '📍',
    titleKey: 'showcase.features.tracking.title',
    descKey: 'showcase.features.tracking.desc',
  },
  {
    id: 'cod',
    icon: '💵',
    titleKey: 'showcase.features.cod.title',
    descKey: 'showcase.features.cod.desc',
  },
  {
    id: 'bilingual',
    icon: '🌐',
    titleKey: 'showcase.features.bilingual.title',
    descKey: 'showcase.features.bilingual.desc',
  },
]

const FLOATING_CARDS = [
  {
    id: 'notification',
    titleKey: 'showcase.floatingCards.notification.title',
    descKey: 'showcase.floatingCards.notification.desc',
    position: 'top-left' as const,
    icon: '🔔',
  },
  {
    id: 'order-tracked',
    titleKey: 'showcase.floatingCards.orderTracked.title',
    descKey: 'showcase.floatingCards.orderTracked.desc',
    position: 'bottom-right' as const,
    icon: '📦',
  },
]

export function AppShowcase() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center', skipSnaps: false },
    [Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setActiveIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // Parallax transforms for floating cards
  const floatX = useTransform(mouseX, [-400, 400], [-8, 8])
  const floatY = useTransform(mouseY, [-300, 300], [-6, 6])
  const floatXReverse = useTransform(mouseX, [-400, 400], [6, -6])
  const floatYReverse = useTransform(mouseY, [-300, 300], [4, -4])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (reduced) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      mouseX.set(x)
      mouseY.set(y)
    },
    [mouseX, mouseY, reduced]
  )

  const activeFeature = FEATURES[activeIndex]

  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-primary-50/40 via-background to-background"
      onMouseMove={handleMouseMove}
      aria-labelledby="app-showcase-heading"
    >
      <Container>
        {/* Section header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: reduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: reduced ? 0 : 0.6 }}
        >
          <h2
            id="app-showcase-heading"
            className="text-3xl md:text-4xl font-bold text-text mb-3"
          >
            {t('showcase.title')}
          </h2>
          <p className="text-base md:text-lg text-text-muted max-w-md mx-auto">
            {t('showcase.subtitle')}
          </p>
        </motion.div>

        {/* Main showcase area */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Feature callouts - left side (desktop) */}
          <div className="hidden lg:flex flex-col gap-4 w-[260px]">
            {FEATURES.slice(0, 3).map((feature, i) => (
              <FeatureCallout
                key={feature.id}
                feature={feature}
                isActive={feature.id === activeFeature?.id}
                index={i}
                reduced={reduced}
              />
            ))}
          </div>

          {/* Device carousel */}
          <div className="relative">
            {/* Floating card - top left */}
            <motion.div
              className="absolute -top-4 -left-8 md:-left-16 z-20 hidden md:block"
              style={reduced ? {} : { x: floatX, y: floatY }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.8, delay: 0.3 }}
            >
              <FloatingCard card={FLOATING_CARDS[0]} />
            </motion.div>

            {/* Floating card - bottom right */}
            <motion.div
              className="absolute -bottom-4 -right-8 md:-right-16 z-20 hidden md:block"
              style={reduced ? {} : { x: floatXReverse, y: floatYReverse }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.8, delay: 0.5 }}
            >
              <FloatingCard card={FLOATING_CARDS[1]} />
            </motion.div>

            {/* Carousel */}
            <div
              className="overflow-hidden w-[320px] md:w-[340px]"
              ref={emblaRef}
              role="region"
              aria-roledescription="carousel"
              aria-label={t('showcase.carouselLabel')}
            >
              <div className="flex">
                {SCREENS.map((screen, i) => (
                  <div
                    key={screen.id}
                    className="flex-[0_0_100%] min-w-0 flex justify-center"
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} / ${SCREENS.length}: ${t(screen.alt)}`}
                  >
                    <PhoneFrame
                      src={screen.src}
                      alt={t(screen.alt)}
                      priority={i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={scrollPrev}
                className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center hover:bg-primary-50 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={t('showcase.prevSlide')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dots */}
              <div className="flex gap-2" role="tablist" aria-label={t('showcase.slideIndicators')}>
                {SCREENS.map((screen, i) => (
                  <button
                    key={screen.id}
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={`${t('showcase.goToSlide')} ${i + 1}`}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      i === activeIndex
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-border hover:bg-text-tertiary'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={scrollNext}
                className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center hover:bg-primary-50 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={t('showcase.nextSlide')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Feature callouts - right side (desktop) */}
          <div className="hidden lg:flex flex-col gap-4 w-[260px]">
            {FEATURES.slice(3).map((feature, i) => (
              <FeatureCallout
                key={feature.id}
                feature={feature}
                isActive={feature.id === activeFeature?.id}
                index={i + 3}
                reduced={reduced}
              />
            ))}
          </div>

          {/* Feature callouts - mobile (below carousel) */}
          <div className="lg:hidden w-full max-w-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature?.id}
                initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -10 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                className="bg-white rounded-2xl p-4 shadow-md border border-border-light text-center"
              >
                <span className="text-2xl mb-2 block">{activeFeature?.icon}</span>
                <h3 className="text-base font-semibold text-text mb-1">
                  {t(activeFeature?.titleKey || '')}
                </h3>
                <p className="text-sm text-text-muted">
                  {t(activeFeature?.descKey || '')}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  )
}

/* Feature callout card */
function FeatureCallout({
  feature,
  isActive,
  index,
  reduced,
}: {
  feature: (typeof FEATURES)[number]
  isActive: boolean
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, x: reduced ? 0 : index < 3 ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : index * 0.1 }}
      className={`p-4 rounded-xl border transition-all duration-300 ${
        isActive
          ? 'bg-white border-primary/20 shadow-lg scale-[1.02]'
          : 'bg-white/60 border-border-light shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`text-xl shrink-0 transition-transform duration-300 ${
            isActive ? 'scale-110' : ''
          }`}
        >
          {feature.icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-text mb-0.5">
            {t(feature.titleKey)}
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {t(feature.descKey)}
          </p>
        </div>
      </div>
      {/* Active indicator line */}
      <motion.div
        className="h-[2px] bg-primary rounded-full mt-3"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.4 }}
        style={{ transformOrigin: 'left' }}
      />
    </motion.div>
  )
}

/* Floating UI snippet card */
function FloatingCard({ card }: { card: (typeof FLOATING_CARDS)[number] }) {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border border-border-light w-[180px] backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{card.icon}</span>
        <span className="text-xs font-semibold text-text truncate">
          {t(card.titleKey)}
        </span>
      </div>
      <p className="text-[10px] text-text-muted leading-snug">
        {t(card.descKey)}
      </p>
      <div className="mt-2 h-1 bg-primary-50 rounded-full overflow-hidden">
        <div className="h-full w-3/4 bg-primary rounded-full" />
      </div>
    </div>
  )
}
