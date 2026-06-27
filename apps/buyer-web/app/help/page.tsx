'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'

interface FAQ { id: string; q: string; a: string; topic: string }
const TOPICS = ['topicOrders', 'topicPayments', 'topicAccount', 'topicGeneral']

function FAQItem({ faq, reduced }: { faq: FAQ; reduced: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-[#E5E5E5] last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] text-left hover:bg-background transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex-1 text-base font-semibold text-text mr-3">{faq.q}</span>
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-base text-text-muted"
        >
          ›
        </motion.span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-3 text-base text-text-muted leading-6">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HelpPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const [search, setSearch] = useState('')

  const faqs: FAQ[] = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: `faq-${i + 1}`,
      q: t(`help.faq${i + 1}Q`),
      a: t(`help.faq${i + 1}A`),
      topic: i < 2 ? 'topicOrders' : i < 4 ? 'topicPayments' : i < 6 ? 'topicAccount' : 'topicGeneral',
    })), [t])

  const filtered = useMemo(() => {
    if (!search.trim()) return faqs
    const q = search.toLowerCase()
    return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }, [faqs, search])

  const grouped = useMemo(() => {
    const map = new Map<string, FAQ[]>()
    for (const faq of filtered) {
      const arr = map.get(faq.topic) || []
      arr.push(faq)
      map.set(faq.topic, arr)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors" aria-label={t('common.back')}>
            <span className="text-xl text-text">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">{t('help.title')}</h1>
        </div>

        <div className="relative mb-5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">⌕</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            className="w-full h-10 pl-10 pr-10 bg-background border border-border rounded-lg text-sm text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label={t('help.searchPlaceholder')}
          />
          {search.length > 0 && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1">✕</button>
          )}
        </div>

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <p className="text-base font-semibold text-text">{t('help.noResults')}</p>
            <p className="text-sm text-text-muted mt-1">{t('help.noResultsSubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([topic, items]) => (
              <div key={topic}>
                <p className="text-xs font-semibold text-text-muted uppercase pl-4 mb-2">{t(`help.${topic}`)}</p>
                <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
                  {items.map(faq => <FAQItem key={faq.id} faq={faq} reduced={reduced} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </Screen>
  )
}
