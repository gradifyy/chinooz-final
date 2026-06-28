'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, useReducedMotion } from '@chinooz/ui-web'
import { useCountUp } from './useCountUp'

interface Stat {
  id: string
  value: number
  suffix: string
  prefix: string
  labelKey: string
}

const STATS: Stat[] = [
  { id: 'sellers', value: 500, suffix: '+', prefix: '', labelKey: 'nepal.stats.sellers' },
  { id: 'products', value: 25000, suffix: '+', prefix: '', labelKey: 'nepal.stats.products' },
  { id: 'delivery', value: 45, suffix: ' min', prefix: '', labelKey: 'nepal.stats.delivery' },
  { id: 'zones', value: 12, suffix: '', prefix: '', labelKey: 'nepal.stats.zones' },
]

const PILLARS = [
  {
    id: 'kathmandu',
    iconKey: 'map',
    titleKey: 'nepal.pillars.kathmandu.title',
    descKey: 'nepal.pillars.kathmandu.desc',
  },
  {
    id: 'payments',
    iconKey: 'wallet',
    titleKey: 'nepal.pillars.payments.title',
    descKey: 'nepal.pillars.payments.desc',
  },
  {
    id: 'language',
    iconKey: 'language',
    titleKey: 'nepal.pillars.language.title',
    descKey: 'nepal.pillars.language.desc',
  },
  {
    id: 'riders',
    iconKey: 'bike',
    titleKey: 'nepal.pillars.riders.title',
    descKey: 'nepal.pillars.riders.desc',
  },
]

export function BuiltForNepal() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <section
      className="py-16 md:py-24 bg-white relative overflow-hidden"
      aria-labelledby="nepal-section-heading"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <Container className="relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: reduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: reduced ? 0 : 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary/10 mb-4"
            initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 0.4, delay: 0.1 }}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {t('nepal.badge')}
            </span>
          </motion.div>

          <h2
            id="nepal-section-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-4"
          >
            {t('nepal.title')}
          </h2>
          <p className="text-base md:text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
            {t('nepal.subtitle')}
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-20">
          {STATS.map((stat, i) => (
            <StatCard key={stat.id} stat={stat} index={i} reduced={reduced} />
          ))}
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {PILLARS.map((pillar, i) => (
            <PillarCard key={pillar.id} pillar={pillar} index={i} reduced={reduced} />
          ))}
        </div>

        {/* Vision statement */}
        <motion.div
          className="mt-12 md:mt-16 text-center"
          initial={{ opacity: 0, y: reduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reduced ? 0 : 0.6, delay: 0.2 }}
        >
          <div className="inline-block max-w-2xl">
            <p className="text-lg md:text-xl text-text-secondary italic leading-relaxed">
              &ldquo;{t('nepal.vision')}&rdquo;
            </p>
            <div className="mt-4 w-12 h-[2px] bg-primary mx-auto rounded-full" />
          </div>
        </motion.div>
      </Container>
    </section>
  )
}

function StatCard({ stat, index, reduced }: { stat: Stat; index: number; reduced: boolean }) {
  const { t } = useTranslation()
  const { ref, display } = useCountUp({
    end: stat.value,
    suffix: stat.suffix,
    prefix: stat.prefix,
    duration: 2000,
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduced ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : index * 0.1 }}
      className="text-center p-4 md:p-6 rounded-2xl bg-background border border-border-light"
    >
      <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-1">
        {display}
      </div>
      <div className="text-xs md:text-sm text-text-muted font-medium">
        {t(stat.labelKey)}
      </div>
    </motion.div>
  )
}

function PillarCard({
  pillar,
  index,
  reduced,
}: {
  pillar: (typeof PILLARS)[number]
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: reduced ? 0 : 0.5,
        delay: reduced ? 0 : index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={reduced ? {} : { y: -2, transition: { duration: 0.2 } }}
      className="group p-5 md:p-6 rounded-2xl border border-border-light bg-background hover:bg-white hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors duration-300">
          <PillarIcon iconKey={pillar.iconKey} />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-semibold text-text mb-1">
            {t(pillar.titleKey)}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            {t(pillar.descKey)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function PillarIcon({ iconKey }: { iconKey: string }) {
  switch (iconKey) {
    case 'map':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'wallet':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
          <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M16 13h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'language':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M2 12h20M12 2c2.5 2.5 4 5.5 4 10s-1.5 7.5-4 10c-2.5-2.5-4-5.5-4-10s1.5-7.5 4-10z" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'bike':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
          <circle cx="5.5" cy="17.5" r="3.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="18.5" cy="17.5" r="3.5" stroke="currentColor" strokeWidth="2" />
          <path d="M15 6h3l2 11.5M5.5 17.5L8 9h6l2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    default:
      return null
  }
}
