'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, useReducedMotion } from '@chinooz/ui-web'

interface BentoTile {
  id: string
  titleKey: string
  descKey: string
  icon: React.ReactNode
  size: 'large' | 'small'
  color: string
  hoverColor: string
}

const TILES: BentoTile[] = [
  {
    id: 'delivery',
    titleKey: 'bento.delivery.title',
    descKey: 'bento.delivery.desc',
    icon: <DeliveryIcon />,
    size: 'large',
    color: 'bg-gradient-to-br from-primary-50 to-white',
    hoverColor: 'hover:shadow-lg',
  },
  {
    id: 'payment',
    titleKey: 'bento.payment.title',
    descKey: 'bento.payment.desc',
    icon: <PaymentIcon />,
    size: 'small',
    color: 'bg-gradient-to-br from-[#FEF3C7] to-white',
    hoverColor: 'hover:shadow-lg',
  },
  {
    id: 'bilingual',
    titleKey: 'bento.bilingual.title',
    descKey: 'bento.bilingual.desc',
    icon: <BilingualIcon />,
    size: 'small',
    color: 'bg-gradient-to-br from-[#DBEAFE] to-white',
    hoverColor: 'hover:shadow-lg',
  },
  {
    id: 'verified',
    titleKey: 'bento.verified.title',
    descKey: 'bento.verified.desc',
    icon: <VerifiedIcon />,
    size: 'small',
    color: 'bg-gradient-to-br from-[#DCFCE7] to-white',
    hoverColor: 'hover:shadow-lg',
  },
  {
    id: 'tracking',
    titleKey: 'bento.tracking.title',
    descKey: 'bento.tracking.desc',
    icon: <TrackingIcon />,
    size: 'small',
    color: 'bg-gradient-to-br from-[#F3E8FF] to-white',
    hoverColor: 'hover:shadow-lg',
  },
  {
    id: 'secure',
    titleKey: 'bento.secure.title',
    descKey: 'bento.secure.desc',
    icon: <SecureIcon />,
    size: 'large',
    color: 'bg-gradient-to-br from-[#FEE2E2]/50 to-white',
    hoverColor: 'hover:shadow-lg',
  },
]

export function BentoFeaturesGrid() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  return (
    <section
      className="py-16 md:py-24 bg-background"
      aria-labelledby="features-grid-heading"
    >
      <Container>
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: reduced ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: reduced ? 0 : 0.6 }}
        >
          <h2
            id="features-grid-heading"
            className="text-3xl md:text-4xl font-bold text-text mb-3"
          >
            {t('bento.title')}
          </h2>
          <p className="text-base md:text-lg text-text-muted max-w-lg mx-auto">
            {t('bento.subtitle')}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 auto-rows-[180px] md:auto-rows-[200px]">
          {TILES.map((tile, i) => (
            <BentoTileCard key={tile.id} tile={tile} index={i} reduced={reduced} />
          ))}
        </div>
      </Container>
    </section>
  )
}

function BentoTileCard({
  tile,
  index,
  reduced,
}: {
  tile: BentoTile
  index: number
  reduced: boolean
}) {
  const { t } = useTranslation()

  const sizeClasses =
    tile.size === 'large'
      ? 'sm:col-span-2 sm:row-span-1'
      : 'col-span-1 row-span-1'

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 30, scale: reduced ? 1 : 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: reduced ? 0 : 0.5,
        delay: reduced ? 0 : index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={
        reduced
          ? {}
          : { y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
      }
      className={`group relative rounded-2xl md:rounded-3xl border border-border-light p-5 md:p-6 overflow-hidden transition-shadow duration-300 ${sizeClasses} ${tile.color} ${tile.hoverColor}`}
    >
      {/* Background decorative element */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500">
        <div className="w-full h-full rounded-full bg-primary transform translate-x-8 -translate-y-8" />
      </div>

      {/* Icon with micro-interaction */}
      <motion.div
        className="mb-3 md:mb-4"
        whileHover={reduced ? {} : { rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white shadow-sm border border-border-light flex items-center justify-center group-hover:shadow-md transition-shadow duration-300">
          {tile.icon}
        </div>
      </motion.div>

      {/* Content */}
      <h3 className="text-base md:text-lg font-semibold text-text mb-1 md:mb-2">
        {t(tile.titleKey)}
      </h3>
      <p className="text-xs md:text-sm text-text-muted leading-relaxed line-clamp-3">
        {t(tile.descKey)}
      </p>

      {/* Hover reveal line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'left' }}
      />
    </motion.div>
  )
}

/* Icon components */
function DeliveryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PaymentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#D97706]">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
      <path d="M6 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function BilingualIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#2563EB]">
      <path d="M5 8l6 6M4 14l6-6M12.5 18h7M14 12l2.5 6L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4h8M7 4v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function VerifiedIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#16A34A]">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrackingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#7C3AED]">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
    </svg>
  )
}

function SecureIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#DC2626]">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  )
}
