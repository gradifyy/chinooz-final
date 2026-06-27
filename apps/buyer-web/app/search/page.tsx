'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchProducts, useSearchSuggestions } from '@chinooz/hooks'
import type { SuggestionItem } from '@chinooz/hooks'
import { Container, useReducedMotion } from '@chinooz/ui-web'
import ProductCard from '@chinooz/ui-web/ProductCard'
import { ProductCardSkeleton } from '@chinooz/ui-web/ProductCard'
import SafeImage from '@chinooz/ui-web/SafeImage'
import { formatNPR } from '@chinooz/utils'
import type { Product } from '@chinooz/types'

const FilterPanel = lazy(() => import('@/components/FilterPanel'))
const SortDropdown = lazy(() => import('@/components/SortDropdown'))

const RECENT_SEARCHES_KEY = 'chinooz_recent_searches'
const MAX_RECENT = 8
const DEBOUNCE_MS = 250
const STAGGER_CAP = 10
const STAGGER_DELAY = 0.05

const SORT_OPTIONS = [
  { key: 'relevance', labelKey: 'categories.relevance' },
  { key: 'priceLow', labelKey: 'categories.priceLowHigh' },
  { key: 'priceHigh', labelKey: 'categories.priceHighLow' },
  { key: 'rating', labelKey: 'categories.rating' },
  { key: 'newest', labelKey: 'categories.newest' },
  { key: 'popular', labelKey: 'categories.mostPopular' },
]

const QUICK_FILTERS = [
  { key: 'onSale', labelKey: 'categories.onSale' },
  { key: 'topRated', labelKey: 'categories.topRated' },
  { key: 'inStock', labelKey: 'categories.inStock' },
]

interface FilterState {
  priceMin: number
  priceMax: number
  minRating: number
  brands: Set<string>
  inStock: boolean
  onSale: boolean
}

const DEFAULT_FILTERS: FilterState = {
  priceMin: 0,
  priceMax: 999999,
  minRating: 0,
  brands: new Set(),
  inStock: false,
  onSale: false,
}

function useCountUp(target: number, duration = 200): number {
  const [display, setDisplay] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (target === 0) { setDisplay(0); return }
    const start = display
    const diff = target - start
    if (diff === 0) return
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(Math.round(start + diff * progress))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return display
}

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

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [inputFocused, setInputFocused] = useState(false)
  const [submitted, setSubmitted] = useState(!!initialQuery)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('relevance')
  const [showSort, setShowSort] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const reduced = useReducedMotion()

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS)

  const { items: suggestionItems, isFetching: suggestionsFetching } =
    useSearchSuggestions(debouncedQuery)

  const searchEnabled = debouncedQuery.length >= 2
  const { data: searchResults, isLoading: searchLoading } = useSearchProducts(
    submitted ? debouncedQuery : '',
  )

  const isTyping = searchEnabled && !submitted
  const isResults = submitted && searchEnabled
  const isEmpty = !searchEnabled

  const showSpinner = suggestionsFetching && isTyping && debouncedQuery.length >= 2

  const filteredProducts = useMemo(() => {
    if (!searchResults) return []
    let items = [...searchResults]
    if (filters.inStock) items = items.filter(p => p.stock !== 'out_of_stock')
    if (filters.onSale) items = items.filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
    if (filters.minRating > 0) items = items.filter(p => p.rating >= filters.minRating)
    if (filters.brands.size > 0) items = items.filter(p => filters.brands.has(p.sellerName))
    items = items.filter(p => p.price >= filters.priceMin && p.price <= filters.priceMax)
    if (sortBy === 'priceLow') items.sort((a, b) => a.price - b.price)
    if (sortBy === 'priceHigh') items.sort((a, b) => b.price - a.price)
    if (sortBy === 'popular') items.sort((a, b) => b.reviewCount - a.reviewCount)
    if (sortBy === 'newest') items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return items
  }, [searchResults, filters, sortBy])

  const displayCount = useCountUp(filteredProducts.length)

  const activeChipCount = useMemo(() => {
    let count = 0
    if (filters.inStock) count++
    if (filters.onSale) count++
    if (filters.minRating > 0) count++
    if (filters.brands.size > 0) count += filters.brands.size
    if (filters.priceMin > 0 || filters.priceMax < 999999) count++
    return count
  }, [filters])

  const actionableItems = useMemo(
    () => suggestionItems.filter(i => i.type !== 'label'),
    [suggestionItems],
  )

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

  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setSubmitted(false)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    setSubmitted(false)
    setActiveIndex(-1)
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

  const handleSuggestionPress = useCallback(
    (item: SuggestionItem) => {
      if (item.type === 'product') {
        router.push(`/product/${item.product.id}`)
      } else if (item.type === 'category') {
        router.push(`/category/${item.category.id}`)
      } else if (item.type === 'brand') {
        setQuery(item.brand.name)
        setSubmitted(true)
        saveRecentSearch(item.brand.name)
        setRecentSearches(getRecentSearches())
      } else if (item.type === 'term') {
        setQuery(item.term)
        setSubmitted(true)
        saveRecentSearch(item.term)
        setRecentSearches(getRecentSearches())
      }
    },
    [router],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isTyping || actionableItems.length === 0) {
        if (e.key === 'Enter') handleSubmit()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev < actionableItems.length - 1 ? prev + 1 : 0
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => {
          const next = prev > 0 ? prev - 1 : actionableItems.length - 1
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < actionableItems.length) {
          handleSuggestionPress(actionableItems[activeIndex])
        } else {
          handleSubmit()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClear()
      }
    },
    [isTyping, actionableItems, activeIndex, handleSuggestionPress, handleSubmit, handleClear],
  )

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-suggestion-index="${activeIndex}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const renderSuggestionRow = (item: SuggestionItem, index: number, actionIndex: number) => {
    if (item.type === 'label') {
      return (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: staggerDelay(index),
            duration: 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="px-4 pt-4 pb-2"
        >
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {t(`search.suggestionLabel_${item.label}`, { defaultValue: item.label.toUpperCase() })}
          </span>
        </motion.div>
      )
    }

    const isActive = actionIndex === activeIndex
    const rowId = `suggestion-${actionIndex}`

    if (item.type === 'product') {
      const p = item.product
      return (
        <motion.div
          key={item.key}
          data-suggestion-index={actionIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: staggerDelay(index),
            duration: 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <button
            id={rowId}
            onClick={() => handleSuggestionPress(item)}
            onMouseEnter={() => {
              setHoveredRow(item.key)
              setActiveIndex(actionIndex)
            }}
            onMouseLeave={() => setHoveredRow(null)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary-50' : 'hover:bg-background'
            }`}
            aria-label={`${p.name}, ${formatNPR(p.price)}`}
          >
            <SafeImage
              src={p.images?.[0]?.uri}
              alt={p.name}
              className="w-10 h-10 rounded-lg object-cover bg-shimmer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-base font-normal text-text truncate">
                <HighlightText text={p.name} query={debouncedQuery} />
              </p>
              <p className="text-sm font-semibold text-muted tabular-nums">
                {formatNPR(p.price)}
              </p>
            </div>
          </button>
        </motion.div>
      )
    }

    if (item.type === 'category') {
      const c = item.category
      return (
        <motion.div
          key={item.key}
          data-suggestion-index={actionIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: staggerDelay(index),
            duration: 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <button
            id={rowId}
            onClick={() => handleSuggestionPress(item)}
            onMouseEnter={() => {
              setHoveredRow(item.key)
              setActiveIndex(actionIndex)
            }}
            onMouseLeave={() => setHoveredRow(null)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary-50' : 'hover:bg-background'
            }`}
            aria-label={c.name}
          >
            <span className="text-base text-text-muted w-10 text-center shrink-0">{c.icon}</span>
            <p className="text-base font-normal text-text truncate">
              <HighlightText text={c.name} query={debouncedQuery} />
            </p>
          </button>
        </motion.div>
      )
    }

    if (item.type === 'brand') {
      const b = item.brand
      return (
        <motion.div
          key={item.key}
          data-suggestion-index={actionIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: staggerDelay(index),
            duration: 0.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <button
            id={rowId}
            onClick={() => handleSuggestionPress(item)}
            onMouseEnter={() => {
              setHoveredRow(item.key)
              setActiveIndex(actionIndex)
            }}
            onMouseLeave={() => setHoveredRow(null)}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary-50' : 'hover:bg-background'
            }`}
            aria-label={b.name}
          >
            <span className="text-base w-10 text-center shrink-0">{'\u{1F3EA}'}</span>
            <p className="text-base font-normal text-text truncate">
              <HighlightText text={b.name} query={debouncedQuery} />
            </p>
          </button>
        </motion.div>
      )
    }

    return null
  }

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
                aria-activedescendant={
                  activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
                }
                role="combobox"
                aria-expanded={isTyping && suggestionItems.length > 0}
                aria-controls="search-suggestions-list"
                className="flex-1 text-base font-normal text-text bg-transparent outline-none placeholder:text-text-muted h-full"
              />
              {showSpinner && (
                <svg
                  className="animate-spin ml-2 shrink-0 text-primary"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="opacity-25"
                  />
                  <path
                    d="M14 8a6 6 0 01-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>
              )}
              <AnimatePresence>
                {query.length > 0 && !showSpinner && (
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
              {suggestionItems.length > 0 ? (
                <div
                  ref={listRef}
                  id="search-suggestions-list"
                  role="listbox"
                  aria-label={t('search.suggestionsFor', { query: debouncedQuery })}
                >
                  {suggestionItems.map((item, index) => {
                    const actionIndex =
                      item.type !== 'label'
                        ? actionableItems.indexOf(item)
                        : -1
                    return renderSuggestionRow(item, index, actionIndex)
                  })}
                </div>
              ) : !suggestionsFetching ? (
                <p className="text-sm text-text-muted py-6">{t('search.noResults')}</p>
              ) : null}
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
              {searchLoading ? (
                <div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                  aria-busy="true"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-text">{debouncedQuery}</h2>
                    <p className="text-xs text-text-muted mt-0.5" aria-live="polite">
                      {t('categories.results', { count: displayCount })}
                    </p>
                  </div>

                  <div className="sticky top-16 z-20 bg-surface border-b border-border-light py-2 flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setShowFilterPanel(true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
                        activeChipCount > 0
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border bg-surface text-text'
                      } hover:border-primary/30`}
                      aria-haspopup="dialog"
                    >
                      <span>{'\u{1F527}'}</span>
                      <span>{t('categories.filters')}</span>
                      {activeChipCount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {activeChipCount}
                        </span>
                      )}
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowSort(!showSort)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-surface text-sm font-medium text-text hover:border-primary/30 transition-colors"
                        aria-haspopup="listbox"
                        aria-expanded={showSort}
                      >
                        <span>{'\u2195'}</span>
                        <span>
                          {t('categories.sortBy')}:{' '}
                          {t(SORT_OPTIONS.find(o => o.key === sortBy)?.labelKey || 'categories.relevance')}
                        </span>
                      </button>
                      <SortDropdown
                        visible={showSort}
                        onClose={() => setShowSort(false)}
                        options={SORT_OPTIONS}
                        activeKey={sortBy}
                        onSelect={setSortBy}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto scrollbar-none py-1 mb-4">
                    {QUICK_FILTERS.map(f => {
                      const active =
                        f.key === 'onSale'
                          ? filters.onSale
                          : f.key === 'topRated'
                            ? filters.minRating >= 4
                            : f.key === 'inStock'
                              ? filters.inStock
                              : false
                      return (
                        <button
                          key={f.key}
                          onClick={() => {
                            if (f.key === 'onSale')
                              setFilters(prev => ({ ...prev, onSale: !prev.onSale }))
                            else if (f.key === 'topRated')
                              setFilters(prev => ({
                                ...prev,
                                minRating: prev.minRating >= 4 ? 0 : 4,
                              }))
                            else if (f.key === 'inStock')
                              setFilters(prev => ({ ...prev, inStock: !prev.inStock }))
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-primary border-primary text-white'
                              : 'bg-surface border-border text-text'
                          }`}
                          aria-pressed={active}
                        >
                          {t(f.labelKey)}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredProducts.map((product, i) => (
                      <motion.div
                        key={product.id}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: reduced ? 0 : 0.25,
                          delay: reduced ? 0 : Math.min(i, 9) * 0.05,
                        }}
                      >
                        <ProductCard
                          product={product}
                          onPress={handleProductPress}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
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

              {searchResults && searchResults.length > 0 && (
                <FilterPanel
                  visible={showFilterPanel}
                  onClose={() => setShowFilterPanel(false)}
                  products={searchResults}
                  filters={filters}
                  onApply={f => { setFilters(f); setShowFilterPanel(false) }}
                  onReset={() => { setFilters(DEFAULT_FILTERS); setShowFilterPanel(false) }}
                />
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
