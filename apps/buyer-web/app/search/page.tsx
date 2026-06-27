'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchProducts } from '@chinooz/hooks'
import { Container } from '@chinooz/ui-web'
import ProductCard from '@chinooz/ui-web/ProductCard'
import type { Product } from '@chinooz/types'

const RECENT_SEARCHES_KEY = 'chinooz_recent_searches'
const MAX_RECENT = 8
const DEBOUNCE_MS = 300
const STAGGER_CAP = 8
const STAGGER_DELAY = 0.05

const POPULAR_TERMS = ['Headphones', 'Shoes', 'T-shirt', 'Backpack', 'Watch', 'Sunglasses']

const POPULAR_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics', icon: '📱' },
  { id: 'cat-fashion', name: 'Fashion', icon: '👗' },
  { id: 'cat-home', name: 'Home', icon: '🏠' },
  { id: 'cat-beauty', name: 'Beauty', icon: '💄' },
  { id: 'cat-grocery', name: 'Grocery', icon: '🛒' },
  { id: 'cat-sports', name: 'Sports', icon: '⚽' },
]

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter(s => s !== query)
    recent.unshift(query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {}
}

function removeRecentSearch(term: string) {
  try {
    const recent = getRecentSearches().filter(s => s !== term)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent))
  } catch {}
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {}
}

function staggerDelay(index: number): number {
  return index < STAGGER_CAP ? index * STAGGER_DELAY : 0
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [inputFocused, setInputFocused] = useState(false)
  const [submitted, setSubmitted] = useState(!!initialQuery)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS)
  const searchEnabled = debouncedQuery.length >= 2
  const { data: searchResults, isLoading: searchLoading } = useSearchProducts(
    searchEnabled ? debouncedQuery : '',
  )

  const typeaheadResults = searchEnabled && !submitted ? searchResults : undefined
  const typeaheadLoading = searchEnabled && !submitted ? searchLoading : false

  const resultsData = submitted && searchEnabled ? searchResults : undefined
  const resultsLoading = submitted && searchEnabled ? searchLoading : false

  const isTyping = searchEnabled && !submitted
  const isResults = submitted && searchEnabled
  const isEmpty = !searchEnabled

  useEffect(() => {
    setRecentSearches(getRecentSearches())
    const timer = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q && q !== query) {
      setQuery(q)
      setSubmitted(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (submitted && debouncedQuery.trim().length >= 2) {
      const params = new URLSearchParams()
      params.set('q', debouncedQuery.trim())
      router.replace(`/search?${params.toString()}`, { scroll: false })
    } else if (!submitted && !debouncedQuery) {
      router.replace('/search', { scroll: false })
    }
  }, [submitted, debouncedQuery, router])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setSubmitted(false)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    setSubmitted(false)
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    if (debouncedQuery.trim().length >= 2) {
      setSubmitted(true)
      saveRecentSearch(debouncedQuery.trim())
      setRecentSearches(getRecentSearches())
      inputRef.current?.blur()
    }
  }, [debouncedQuery])

  const handleRecentPress = useCallback((term: string) => {
    setQuery(term)
    setSubmitted(true)
    saveRecentSearch(term)
    setRecentSearches(getRecentSearches())
  }, [])

  const handleRemoveRecent = useCallback((term: string) => {
    removeRecentSearch(term)
    setRecentSearches(getRecentSearches())
  }, [])

  const handleClearAll = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  const handlePopularPress = useCallback((term: string) => {
    setQuery(term)
    setSubmitted(true)
    saveRecentSearch(term)
    setRecentSearches(getRecentSearches())
  }, [])

  const handleCategoryPress = useCallback(
    (category: { id: string; name: string }) => {
      router.push(`/category/${category.id}`)
    },
    [router],
  )

  const handleProductPress = useCallback(
    (product: Product) => {
      router.push(`/product/${product.id}`)
    },
    [router],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit()
    },
    [handleSubmit],
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-16 z-sticky bg-white border-b border-border">
        <Container className="py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
              aria-label={t('common.back')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text">
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div
              className={`flex-1 flex items-center bg-surface rounded-lg border h-12 px-3 transition-all duration-200 ${
                inputFocused
                  ? 'border-primary border-2 shadow-sm'
                  : 'border-border'
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-text-muted mr-2 shrink-0"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M13.5 13.5L17 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={t('search.inputPlaceholder')}
                aria-label={t('common.search')}
                className="flex-1 text-base font-normal text-text bg-transparent outline-none placeholder:text-text-muted h-full"
              />
              <AnimatePresence>
                {query.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleClear}
                    className="shrink-0 p-1 ml-1 rounded-full hover:bg-background transition-colors"
                    aria-label={t('search.clearSearch')}
                    type="button"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="text-text-muted"
                    >
                      <path
                        d="M5 5L13 13M13 5L5 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleClear}
              className="shrink-0 text-base font-semibold text-primary hover:text-primary-dark transition-colors hidden sm:block"
              aria-label={t('common.cancel')}
            >
              {t('common.cancel')}
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        <AnimatePresence mode="wait">
          {isEmpty && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {recentSearches.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      {t('search.recent')}
                    </h2>
                    <button
                      onClick={handleClearAll}
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
                        transition={{
                          delay: staggerDelay(index),
                          duration: 0.25,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        layout
                      >
                        <div
                          className="flex items-center gap-3 w-full group rounded-lg hover:bg-background transition-colors"
                          onMouseEnter={() => setHoveredRow(term)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <button
                            onClick={() => handleRecentPress(term)}
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
                                transition={{ duration: 0.15 }}
                                onClick={() => handleRemoveRecent(term)}
                                className="shrink-0 p-1.5 rounded-full hover:bg-border-light transition-colors"
                                aria-label={t('search.removeSearch', { term })}
                                type="button"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  className="text-text-muted"
                                >
                                  <path
                                    d="M4 4L10 10M10 4L4 10"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
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
                    duration: 0.25,
                    ease: [0.34, 1.56, 0.64, 1],
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
                      transition={{
                        delay: staggerDelay(recentSearches.length + 1 + index),
                        duration: 0.25,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handlePopularPress(term)}
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
                    duration: 0.25,
                    ease: [0.34, 1.56, 0.64, 1],
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
                      transition={{
                        delay: staggerDelay(
                          recentSearches.length + 1 + POPULAR_TERMS.length + 1 + index,
                        ),
                        duration: 0.25,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleCategoryPress(category)}
                      className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-3 hover:border-primary/30 transition-colors text-left"
                      aria-label={category.name}
                    >
                      <span className="text-[32px]">{category.icon}</span>
                      <span className="text-sm font-semibold text-text truncate">
                        {category.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {isTyping && (
            <motion.div
              key="typeahead"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-base font-semibold text-text mb-3">
                {t('search.suggestionsFor', { query: debouncedQuery })}
              </h2>
              {typeaheadLoading ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-muted">{t('common.loading')}</p>
                </div>
              ) : typeaheadResults && typeaheadResults.length > 0 ? (
                <div className="space-y-1">
                  {typeaheadResults.slice(0, 8).map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setQuery(product.name)
                        setSubmitted(true)
                        saveRecentSearch(product.name)
                        setRecentSearches(getRecentSearches())
                      }}
                      className="flex items-center gap-3 w-full px-0 py-2.5 text-left hover:bg-background rounded-lg transition-colors"
                    >
                      <span className="text-base text-text-muted">{'\u2315'}</span>
                      <span className="text-base text-text truncate">{product.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted py-6">{t('search.noResults')}</p>
              )}
            </motion.div>
          )}

          {isResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {resultsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-surface rounded-xl overflow-hidden shadow-sm animate-pulse"
                    >
                      <div className="aspect-square bg-shimmer" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-shimmer rounded w-3/4" />
                        <div className="h-3 bg-shimmer rounded w-1/2" />
                        <div className="h-5 bg-shimmer rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : resultsData && resultsData.length > 0 ? (
                <>
                  <p className="text-sm text-text-muted mb-4">
                    {t('categories.results', { count: resultsData.length })}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {resultsData.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onPress={handleProductPress}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <span className="text-5xl mb-4">{'\u{1F50D}'}</span>
                  <h3 className="text-lg font-semibold text-text mb-2">
                    {t('search.noResults')}
                  </h3>
                  <p className="text-sm text-text-muted text-center max-w-xs">
                    {t('search.noResultsSubtitle')}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
