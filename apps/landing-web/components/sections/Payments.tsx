'use client'

import { CreditCard, Smartphone, Banknote } from 'lucide-react'
import { Section, SectionHeader } from '@/components/ui/Section'
import { StaggerChildren, staggerItem } from '@/components/motion/FadeUp'
import { motion } from 'framer-motion'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

const paymentIcons = [Smartphone, Smartphone, Banknote]

export function Payments() {
  const { locale } = useLocale()
  const t = landingContent[locale].payments

  return (
    <Section className="bg-white" id="payments">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <StaggerChildren>
            <motion.div variants={staggerItem}>
              <SectionHeader
                eyebrow={t.eyebrow}
                headline={t.headline}
                body={t.body}
              />
            </motion.div>

            <div className="grid grid-cols-3 gap-4">
              {t.methods.map((method, i) => {
                const Icon = paymentIcons[i] ?? CreditCard
                return (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    className="flex flex-col items-center p-6 rounded-2xl border border-border bg-background hover:border-primary/30 hover:bg-primary-50/50 transition-all duration-250 text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-3" aria-hidden="true">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <p
                      className={cn(
                        'font-bold text-text text-sm',
                        locale === 'ne' && 'font-devanagari'
                      )}
                    >
                      {method.name}
                    </p>
                    <p
                      className={cn(
                        'text-caption text-text-muted mt-1',
                        locale === 'ne' && 'font-devanagari'
                      )}
                    >
                      {method.desc}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </StaggerChildren>
        </div>

        {/* Visual */}
        <div className="relative flex items-center justify-center">
          <div className="relative w-72 h-72">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/10" aria-hidden="true" />
            <div className="absolute inset-4 rounded-full border border-primary/5" aria-hidden="true" />
            {/* Center */}
            <div className="absolute inset-8 rounded-full bg-plum-gradient flex items-center justify-center shadow-xl">
              <div className="text-center text-white">
                <p className="text-4xl font-bold font-display">NPR</p>
                <p className="text-white/70 text-sm mt-1">Nepali Rupee</p>
              </div>
            </div>
            {/* Orbiting badges */}
            {['Khalti', 'eSewa', 'COD'].map((label, i) => {
              const angle = (i * 120 - 90) * (Math.PI / 180)
              const r = 120
              const x = Math.cos(angle) * r
              const y = Math.sin(angle) * r
              return (
                <div
                  key={label}
                  className="absolute bg-white rounded-xl shadow-md px-3 py-2 text-xs font-bold text-primary border border-border"
                  style={{
                    left: `calc(50% + ${x}px - 32px)`,
                    top: `calc(50% + ${y}px - 16px)`,
                  }}
                  aria-hidden="true"
                >
                  {label}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}
