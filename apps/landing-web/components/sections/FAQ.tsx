'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Section, SectionHeader } from '@/components/ui/Section'
import { StaggerChildren, staggerItem } from '@/components/motion/FadeUp'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'
import { cn } from '@/lib/utils'

export function FAQ() {
  const { locale } = useLocale()
  const t = landingContent[locale].faq
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <Section id="faq" className="bg-background">
      <div className="max-w-3xl mx-auto">
        <StaggerChildren>
          <motion.div variants={staggerItem}>
            <SectionHeader
              eyebrow={t.eyebrow}
              headline={t.headline}
              centered
            />
          </motion.div>

          <div className="space-y-3" role="list">
            {t.items.map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="border border-border rounded-2xl bg-white overflow-hidden"
                role="listitem"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  aria-expanded={openIndex === i}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-question-${i}`}
                >
                  <span
                    className={cn(
                      'font-semibold text-text',
                      locale === 'ne' && 'font-devanagari'
                    )}
                  >
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <ChevronDown size={18} className="text-text-muted" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      role="region"
                      aria-labelledby={`faq-question-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                    >
                      <div className="px-6 pb-5">
                        <div className="h-px bg-border mb-4" aria-hidden="true" />
                        <p
                          className={cn(
                            'text-body text-text-muted',
                            locale === 'ne' && 'font-devanagari'
                          )}
                        >
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </StaggerChildren>
      </div>
    </Section>
  )
}
