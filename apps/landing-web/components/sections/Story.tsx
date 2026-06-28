'use client'

import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { Section } from '@/components/ui/Section'
import { FadeUp } from '@/components/motion/FadeUp'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

export function Story() {
  const { locale } = useLocale()
  const t = landingContent[locale].story

  return (
    <Section className="bg-background overflow-hidden" id="story">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Text */}
        <div>
          <FadeUp>
            <p className="text-caption font-semibold tracking-[0.12em] uppercase text-primary mb-3">
              {t.eyebrow}
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className={cn(
                'text-h1 font-display font-bold text-text whitespace-pre-line mb-6',
                locale === 'ne' && 'font-devanagari'
              )}
            >
              {t.headline}
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p
              className={cn(
                'text-body-lg text-text-muted mb-8 leading-relaxed',
                locale === 'ne' && 'font-devanagari'
              )}
            >
              {t.body}
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-primary-50 border border-primary/20">
              <MapPin size={18} className="text-primary shrink-0" aria-hidden="true" />
              <span
                className={cn(
                  'text-sm font-semibold text-primary',
                  locale === 'ne' && 'font-devanagari'
                )}
              >
                {t.highlight}
              </span>
            </div>
          </FadeUp>
        </div>

        {/* Visual */}
        <FadeUp delay={0.15} className="relative">
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Decorative rings */}
            <div
              className="absolute inset-0 rounded-full border-2 border-primary/10 scale-110"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 rounded-full border border-primary/5 scale-125"
              aria-hidden="true"
            />
            {/* Central card */}
            <div className="absolute inset-8 rounded-3xl bg-plum-gradient flex flex-col items-center justify-center p-8 text-center shadow-xl">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                  <span className="text-4xl" role="img" aria-label="Nepal flag">🇳🇵</span>
                </div>
              </motion.div>
              <p className="text-white font-display font-bold text-xl mb-1">Chinooz</p>
              <p className="text-white/70 text-sm">Nepal&apos;s Marketplace</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold" aria-hidden="true" />
                <span className="text-white/60 text-xs">Kathmandu Valley</span>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute top-4 right-0 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2"
              aria-hidden="true"
            >
              <span className="text-lg">💳</span>
              <div>
                <p className="text-xs font-bold text-text">COD + Khalti</p>
                <p className="text-[10px] text-text-muted">3 payment methods</p>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-8 left-0 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2"
              aria-hidden="true"
            >
              <span className="text-lg">🛵</span>
              <div>
                <p className="text-xs font-bold text-text">Fast Delivery</p>
                <p className="text-[10px] text-text-muted">Same day</p>
              </div>
            </motion.div>
          </div>
        </FadeUp>
      </div>
    </Section>
  )
}
