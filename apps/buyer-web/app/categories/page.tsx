'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Container, Screen } from '@chinooz/ui-web'
import { useReducedMotion } from '@chinooz/ui-web'
import { useCategories } from '@chinooz/hooks'
import type { Category } from '@chinooz/types'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const reduced = useReducedMotion()
  const { data: categories, isLoading } = useCategories()

  const topCategories = useMemo(() => {
    if (!categories) return []
    return categories.filter(c => c.parentId === null)
  }, [categories])

  const handlePress = (cat: Category) => {
    router.push(`/search?category=${cat.id}`)
  }

  if (isLoading) {
    return (
      <Screen>
        <Container className="py-6">
          <div className="h-11 bg-surface rounded-xl border border-border mb-6" />
          <div className="h-7 w-32 bg-border rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-light">
                <div className="w-12 h-12 rounded-full bg-border animate-pulse" />
                <div className="w-20 h-3 bg-border rounded animate-pulse" />
                <div className="w-14 h-2.5 bg-border rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Container>
      </Screen>
    )
  }

  return (
    <Screen>
      <Container className="py-6">
        {/* Search bar */}
        <button
          onClick={() => router.push('/search')}
          className="w-full h-11 bg-surface rounded-xl border border-border flex items-center px-3 text-sm text-text-muted hover:border-primary/30 transition-colors mb-6"
        >
          🔍 {t('common.searchPlaceholder')}
        </button>

        <h1 className="text-2xl font-bold text-text mb-4">{t('categories.title')}</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {topCategories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.25,
                delay: reduced ? 0 : Math.min(i, 9) * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              onClick={() => handlePress(cat)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-light shadow-sm hover:shadow-md transition-shadow"
              aria-label={cat.name}
            >
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                <span className="text-2xl">{cat.icon}</span>
              </div>
              <span className="text-sm font-semibold text-text text-center">{cat.name}</span>
              <span className="text-xs text-text-muted">{cat.productCount} items</span>
            </motion.button>
          ))}
        </div>
      </Container>
    </Screen>
  )
}
