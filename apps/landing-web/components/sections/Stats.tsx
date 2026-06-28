'use client'

import { motion } from 'framer-motion'
import { Section, SectionHeader } from '@/components/ui/Section'
import { StaggerChildren, staggerItem } from '@/components/motion/FadeUp'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

export function Stats() {
  const { locale } = useLocale()
  const t = landingContent[locale].stats

  return (
    <Section className="bg-white">
      <StaggerChildren className="text-center">
        <motion.div variants={staggerItem}>
          <SectionHeader
            headline={t.headline}
            centered
          />
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {t.items.map((stat, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="flex flex-col items-center p-8 rounded-2xl bg-primary-50 border border-primary/10 hover:border-primary/30 transition-colors duration-250"
            >
              <span
                className={cn(
                  'text-display-md font-display font-bold text-primary tabular-nums',
                  locale === 'ne' && 'font-devanagari'
                )}
              >
                {stat.value}
              </span>
              <span
                className={cn(
                  'text-body text-text-muted mt-2 font-medium',
                  locale === 'ne' && 'font-devanagari'
                )}
              >
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </StaggerChildren>
    </Section>
  )
}
