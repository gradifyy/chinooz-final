'use client'

import { ShoppingBag, Store, Bike, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { Section, SectionHeader } from '@/components/ui/Section'
import { StaggerChildren, staggerItem } from '@/components/motion/FadeUp'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ElementType> = {
  ShoppingBag,
  Store,
  Bike,
}

const colorMap: Record<string, string> = {
  primary: 'bg-primary text-white',
  gold: 'bg-gold text-white',
  'primary-light': 'bg-primary-light text-white',
}

const cardBorderMap: Record<string, string> = {
  primary: 'hover:border-primary/40 hover:shadow-[0_8px_40px_rgba(138,27,87,0.12)]',
  gold: 'hover:border-gold/40 hover:shadow-[0_8px_40px_rgba(224,169,59,0.12)]',
  'primary-light': 'hover:border-primary-light/40 hover:shadow-[0_8px_40px_rgba(178,60,126,0.12)]',
}

export function Ecosystem() {
  const { locale } = useLocale()
  const t = landingContent[locale].ecosystem

  return (
    <Section id="ecosystem" className="bg-background">
      <StaggerChildren>
        <motion.div variants={staggerItem}>
          <SectionHeader
            eyebrow={t.eyebrow}
            headline={t.headline}
            centered
          />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mt-4">
          {t.cards.map((card, i) => {
            const Icon = iconMap[card.icon] ?? ShoppingBag
            const iconClass = colorMap[card.color] ?? colorMap.primary
            const cardClass = cardBorderMap[card.color] ?? cardBorderMap.primary

            return (
              <motion.article
                key={i}
                variants={staggerItem}
                className={cn(
                  'group relative flex flex-col p-8 rounded-2xl bg-white border border-border transition-all duration-400 cursor-default',
                  cardClass
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-6 shrink-0',
                    iconClass
                  )}
                  aria-hidden="true"
                >
                  <Icon size={22} />
                </div>

                {/* Role badge */}
                <p className="text-caption font-semibold tracking-wide uppercase text-text-muted mb-2">
                  {card.role}
                </p>

                {/* Headline */}
                <h3
                  className={cn(
                    'text-h3 font-display font-bold text-text whitespace-pre-line mb-4',
                    locale === 'ne' && 'font-devanagari'
                  )}
                >
                  {card.headline}
                </h3>

                {/* Body */}
                <p
                  className={cn(
                    'text-body text-text-muted mb-6 flex-1',
                    locale === 'ne' && 'font-devanagari'
                  )}
                >
                  {card.body}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-8" aria-label={`${card.role} features`}>
                  {card.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-text-muted">
                      <Check size={14} className="text-primary shrink-0" aria-hidden="true" />
                      <span className={locale === 'ne' ? 'font-devanagari' : ''}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  <span className={locale === 'ne' ? 'font-devanagari' : ''}>{card.cta}</span>
                </Button>
              </motion.article>
            )
          })}
        </div>
      </StaggerChildren>
    </Section>
  )
}
