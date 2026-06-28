'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '@chinooz/ui-web'

interface FAQItem {
  id: string
  question: string
  answer: string
}

export function FAQ() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [openId, setOpenId] = useState<string | null>(null)

  const faqItems: FAQItem[] = [
    {
      id: 'launch',
      question: t('faq.launchQuestion'),
      answer: t('faq.launchAnswer'),
    },
    {
      id: 'areas',
      question: t('faq.areasQuestion'),
      answer: t('faq.areasAnswer'),
    },
    {
      id: 'payment',
      question: t('faq.paymentQuestion'),
      answer: t('faq.paymentAnswer'),
    },
    {
      id: 'sell',
      question: t('faq.sellQuestion'),
      answer: t('faq.sellAnswer'),
    },
    {
      id: 'rider',
      question: t('faq.riderQuestion'),
      answer: t('faq.riderAnswer'),
    },
    {
      id: 'cod',
      question: t('faq.codQuestion'),
      answer: t('faq.codAnswer'),
    },
  ]

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  // JSON-LD FAQ Schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('faq.headline')}</h2>
            <p className="text-lg text-gray-600">{t('faq.subheadline')}</p>
          </motion.div>

          {/* FAQ Accordion */}
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-magenta-300 transition-colors"
              >
                <button
                  onClick={() => toggleAccordion(item.id)}
                  aria-expanded={openId === item.id}
                  aria-controls={`faq-answer-${item.id}`}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-magenta-500 focus:ring-inset"
                >
                  <h3 className="text-left font-semibold text-gray-900">{item.question}</h3>
                  <motion.div
                    animate={{ rotate: openId === item.id ? 180 : 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                    className="flex-shrink-0 ml-4"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence>
                  {openId === item.id && (
                    <motion.div
                      id={`faq-answer-${item.id}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.3,
                        ease: 'easeInOut',
                      }}
                      className="border-t border-gray-200 bg-gray-50"
                    >
                      <div className="px-6 py-4">
                        <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-12 p-8 bg-gradient-to-r from-magenta-50 to-pink-50 border border-magenta-200 rounded-2xl text-center"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('faq.stillHaveQuestions')}</h3>
            <p className="text-gray-600 mb-4">{t('faq.contactUs')}</p>
            <motion.a
              href="mailto:hello@chinooz.com"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block px-6 py-2 bg-magenta-600 hover:bg-magenta-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-magenta-500 focus:ring-offset-2"
            >
              {t('faq.emailUs')}
            </motion.a>
          </motion.div>
        </div>
      </section>
    </>
  )
}
