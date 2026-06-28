'use client'

import { motion } from 'framer-motion'
import { Search, ShoppingCart, Truck } from 'lucide-react'
import { Section, SectionHeader } from '@/components/ui/Section'
import { StaggerChildren, staggerItem } from '@/components/motion/FadeUp'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

const stepIcons = [Search, ShoppingCart, Truck]

export function HowItWorks() {
  const { locale } = useLocale()
  const t = landingContent[locale].howItWorks

  return (
    <Section id="how-it-works" className="bg-background">
      <StaggerChildren>
        <motion.div variants={staggerItem}>
          <SectionHeader
            eyebrow={t.eyebrow}
            headline={t.headline}
            centered
          />
        </motion.div>

        <div className="relative grid md:grid-cols-3 gap-8 mt-4">
          {/* Connecting line (desktop) */}
          <div
            className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"
            aria-hidden="true"
          />

          {t.steps.map((step, i) => {
            const Icon = stepIcons[i] ?? Search
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                className="flex flex-col items-center text-center"
              >
                {/* Step number + icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 border-2 border-primary/20 flex items-center justify-center">
                    <Icon size={26} className="text-primary" aria-hidden="true" />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                </div>

                <p className="text-caption font-bold text-primary tracking-wide mb-2">
                  {step.step}
                </p>
                <h3
                  className={cn(
                    'text-h3 font-display font-bold text-text mb-3',
                    locale === 'ne' && 'font-devanagari'
                  )}
                >
                  {step.title}
                </h3>
                <p
                  className={cn(
                    'text-body text-text-muted',
                    locale === 'ne' && 'font-devanagari'
                  )}
                >
                  {step.body}
                </p>
              </motion.div>
            )
          })}
        </div>
      </StaggerChildren>
    </Section>
  )
}
