'use client'

import { motion, AnimatePresence, type Easing } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { duration, easing } from '@chinooz/theme'
import {
  webMotion,
  POPULAR_TERMS,
  POPULAR_CATEGORIES,
  staggerDelay,
} from '@/components/search/SearchHelpers'

interface SearchLandingProps {
  recentSearches: string[]
  onRecentPress: (term: string) => void
  onRemoveRecent: (term: string) => void
  onClearAll: () => void
  onPopularPress: (term: string) => void
  onCategoryPress: (category: { id: string; name: string }) => void
  t: ReturnType<typeof useTranslation>['t']
  reduced: boolean
  m: ReturnType<typeof webMotion>
  hoveredRow: string | null
  setHoveredRow: (row: string | null) => void
}

export function SearchLanding({
  recentSearches,
  onRecentPress,
  onRemoveRecent,
  onClearAll,
  onPopularPress,
  onCategoryPress,
  t,
  reduced,
  m,
  hoveredRow,
  setHoveredRow,
}: SearchLandingProps) {
  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={m.fadeIn()}
    >
      {recentSearches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              {t('search.recent')}
            </h2>
            <button
              onClick={onClearAll}
              className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
              aria-label={t('search.clearAll')}
            >
              {t('search.clearAll')}
            </button>
          </div>
          <div className="space-y-0.5">
            {recentSearches.map((term, index) => (
              <motion.div
                key={term}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={m.staggerItem(index)}
                layout
              >
                <div
                  className="flex items-center gap-3 w-full group rounded-lg hover:bg-background transition-colors"
                  onMouseEnter={() => setHoveredRow(term)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <button
                    onClick={() => onRecentPress(term)}
                    className="flex items-center gap-3 flex-1 px-0 py-2.5 text-left"
                    aria-label={term}
                  >
                    <span className="text-base text-text-muted w-5 text-center">
                      {'\u{1F552}'}
                    </span>
                    <span className="text-base text-text">{term}</span>
                  </button>
                  <AnimatePresence>
                    {hoveredRow === term && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduced ? 0 : duration.fast / 1000 }}
                        onClick={() => onRemoveRecent(term)}
                        className="shrink-0 p-1.5 rounded-full hover:bg-border-light transition-colors"
                        aria-label={t('search.removeSearch', { term })}
                        type="button"
                      >
                        <X size={14} className="text-text-muted" aria-hidden="true" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: staggerDelay(recentSearches.length),
            duration: reduced ? 0 : duration.normal / 1000,
            ease: reduced ? undefined : (easing.spring as Easing),
          }}
          className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3"
        >
          {t('search.trending')}
        </motion.h2>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_TERMS.map((term, index) => (
            <motion.button
              key={term}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={m.staggerItem(recentSearches.length + 1 + index)}
              whileHover={reduced ? {} : { scale: 1.03 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              onClick={() => onPopularPress(term)}
              className="px-4 py-2 bg-surface border border-primary rounded-full text-sm font-medium text-primary hover:bg-primary-50 transition-colors"
            >
              {term}
            </motion.button>
          ))}
        </div>
      </section>

      <section>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: staggerDelay(recentSearches.length + 1 + POPULAR_TERMS.length),
            duration: reduced ? 0 : duration.normal / 1000,
            ease: reduced ? undefined : (easing.spring as Easing),
          }}
          className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3"
        >
          {t('search.popularCategories')}
        </motion.h2>
        <div className="grid grid-cols-2 gap-3">
          {POPULAR_CATEGORIES.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={m.staggerItem(recentSearches.length + 1 + POPULAR_TERMS.length + 1 + index)}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.97 }}
              onClick={() => onCategoryPress(category)}
              className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-3 hover:border-primary/30 transition-colors text-left"
              aria-label={category.name}
            >
              <span className="text-4xl">{category.icon}</span>
              <span className="text-sm font-semibold text-text truncate">
                {category.name}
              </span>
            </motion.button>
          ))}
        </div>
      </section>
    </motion.div>
  )
}
