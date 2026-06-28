'use client'

import { motion } from 'framer-motion'
import { Apple, Play, Smartphone } from 'lucide-react'
import Image from 'next/image'
import { Section, SectionHeader } from '@/components/ui/Section'
import { FadeUp } from '@/components/motion/FadeUp'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

export function Download() {
  const { locale } = useLocale()
  const t = landingContent[locale].download

  return (
    <Section id="download" className="bg-white overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <FadeUp>
            <SectionHeader
              eyebrow={t.eyebrow}
              headline={t.headline}
              body={t.body}
            />
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* App Store */}
              <button
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-text text-white hover:bg-text/90 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
                aria-label="Download on the App Store — coming soon"
              >
                <Apple size={28} aria-hidden="true" />
                <div className="text-left">
                  <p className="text-[10px] text-white/60 uppercase tracking-wide">{t.comingSoon}</p>
                  <p className={cn('font-semibold text-sm whitespace-pre-line', locale === 'ne' && 'font-devanagari')}>
                    {t.appStore}
                  </p>
                </div>
              </button>

              {/* Google Play */}
              <button
                className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-text text-text hover:bg-text hover:text-white transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
                aria-label="Get it on Google Play — coming soon"
              >
                <Play size={28} aria-hidden="true" />
                <div className="text-left">
                  <p className="text-[10px] text-text-muted uppercase tracking-wide group-hover:text-white/60">{t.comingSoon}</p>
                  <p className={cn('font-semibold text-sm whitespace-pre-line', locale === 'ne' && 'font-devanagari')}>
                    {t.googlePlay}
                  </p>
                </div>
              </button>
            </div>
          </FadeUp>
        </div>

        {/* App mockup visual */}
        <FadeUp delay={0.2} className="relative flex justify-center">
          <div className="relative">
            {/* Phone frame */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-64 h-[500px] rounded-[40px] bg-text border-4 border-text/80 shadow-2xl overflow-hidden"
            >
              {/* Screen */}
              <div className="absolute inset-1 rounded-[36px] bg-background overflow-hidden">
                {/* Status bar */}
                <div className="h-8 bg-primary flex items-center justify-between px-4">
                  <span className="text-white text-[10px]">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-1.5 rounded-sm bg-white/60" />
                    <div className="w-1 h-1.5 rounded-sm bg-white/60" />
                  </div>
                </div>
                {/* App content preview */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Image
                      src="/chinooz-logo.png"
                      alt="Chinooz"
                      width={60}
                      height={18}
                      className="h-4 w-auto"
                    />
                  </div>
                  {/* Mock product cards */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2 p-2 bg-white rounded-xl border border-border">
                      <div className="w-12 h-12 rounded-lg bg-primary-50 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 bg-border rounded w-3/4" />
                        <div className="h-2 bg-border/60 rounded w-1/2" />
                        <div className="h-2.5 bg-primary/20 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-text rounded-full" aria-hidden="true" />
            </motion.div>

            {/* Decorative elements */}
            <div
              className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-primary/10 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gold/10 blur-2xl"
              aria-hidden="true"
            />

            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -right-4 top-1/3 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 border border-border"
              aria-hidden="true"
            >
              <Smartphone size={16} className="text-primary" />
              <div>
                <p className="text-xs font-bold text-text">iOS & Android</p>
                <p className="text-[10px] text-text-muted">Coming soon</p>
              </div>
            </motion.div>
          </div>
        </FadeUp>
      </div>
    </Section>
  )
}
