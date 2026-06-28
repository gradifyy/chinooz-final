'use client'

import { motion } from 'framer-motion'
import { ArrowDown, Apple, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

export function Hero() {
  const { locale } = useLocale()
  const t = landingContent[locale].hero

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-hero-aurora"
      aria-label="Hero"
    >
      {/* Aurora blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/30 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-primary-light/20 blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-gold/10 blur-[80px]"
        />
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-[1280px] pt-32 pb-24 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0, 0, 1] }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/90 text-caption font-semibold tracking-wide mb-8">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" aria-hidden="true" />
            {t.badge}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0, 0, 1] }}
          className={cn(
            'text-display-xl font-display font-bold text-white whitespace-pre-line mb-6',
            locale === 'ne' && 'font-devanagari'
          )}
        >
          {t.headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.2, 0, 0, 1] }}
          className={cn(
            'text-body-lg text-white/70 max-w-xl mb-10',
            locale === 'ne' && 'font-devanagari'
          )}
        >
          {t.subheadline}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-6"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={scrollToWaitlist}
            className="min-w-[200px] bg-primary hover:bg-primary-dark shadow-[0_0_40px_rgba(138,27,87,0.4)]"
          >
            {t.cta}
          </Button>
          <p className="text-white/50 text-caption">{t.ctaSub}</p>
        </motion.div>

        {/* App download CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <p className="text-white/40 text-caption">{t.comingSoon}</p>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Download on the App Store"
            >
              <Apple size={18} aria-hidden="true" />
              <span className="text-sm font-semibold">{t.appStore}</span>
            </button>
            <button
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Get it on Google Play"
            >
              <Play size={18} aria-hidden="true" />
              <span className="text-sm font-semibold">{t.googlePlay}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span className="text-white/40 text-caption">{t.scrollHint}</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown size={16} className="text-white/40" />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 bg-hero-overlay pointer-events-none"
        aria-hidden="true"
      />
    </section>
  )
}
