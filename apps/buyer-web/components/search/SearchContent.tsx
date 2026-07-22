'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import { useSearchProducts, useSearchSuggestions, useInfiniteSearch } from '@chinooz/hooks'
import type { SuggestionItem } from '@chinooz/hooks'
import { Container, useReducedMotion } from '@chinooz/ui-web'
import { formatNPR } from '@chinooz/utils'
import type { Product } from '@chinooz/types'
import OfflineBanner from '@/components/OfflineBanner'
import {
  webMotion,
  DEBOUNCE_MS,
  type FilterState,
  DEFAULT_FILTERS,
  useCountUp,
  getDidYouMean,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  useDebounce,
  HighlightText,
} from '@/components/search/SearchHelpers'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchLanding } from '@/components/search/SearchLanding'
import { SearchSuggestions } from '@/components/search/SearchSuggestions'
import { SearchResults } from '@/components/search/SearchResults'

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

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
  const [dismissedSuggestion, setDismissedSuggestion] = useState<string | null>(null)
  const reduced = useReducedMotion()
  const m = useMemo(() => webMotion(reduced), [reduced])

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS)

  const { items: suggestionItems, isFetching: suggestionsFetching } =
    useSearchSuggestions(debouncedQuery)

  const searchEnabled = debouncedQuery.length >= 2
  const { data: searchResults } = useSearchProducts(
    submitted ? debouncedQuery : '',
  )

  const isTyping = searchEnabled && !submitted
  const isResults = submitted && searchEnabled
  const isEmpty = !searchEnabled

  const showSpinner = suggestionsFetching && isTyping && debouncedQuery.length >= 2

  const filterInput = useMemo(
    () => ({
      inStock: filters.inStock || undefined,
      onSale: filters.onSale || undefined,
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      brands: filters.brands.size > 0 ? Array.from(filters.brands).sort() : undefined,
      priceMin: filters.priceMin > 0 ? filters.priceMin : undefined,
      priceMax: filters.priceMax < 999999 ? filters.priceMax : undefined,
    }),
    [filters],
  )

  const infinite = useInfiniteSearch(
    submitted ? debouncedQuery : '',
    filterInput,
    sortBy as 'relevance' | 'priceLow' | 'priceHigh' | 'rating' | 'newest' | 'popular',
    isResults,
  )

  const displayItems = useMemo(
    () => infinite.data?.pages.flatMap(p => p.items) ?? [],
    [infinite.data],
  )
  const totalResults = infinite.data?.pages[0]?.total ?? 0
  const searchLoading = infinite.isLoading
  const searchError = infinite.isError
  const refetch = infinite.refetch

  const displayCount = useCountUp(totalResults)

  const activeChipCount = useMemo(() => {
    let count = 0
    if (filters.inStock) count++
    if (filters.onSale) count++
    if (filters.minRating > 0) count++
    if (filters.brands.size > 0) count += filters.brands.size
    if (filters.priceMin > 0 || filters.priceMax < 999999) count++
    return count
  }, [filters])

  const hasActiveFilters = activeChipCount > 0

  const didYouMean = useMemo(() => {
    if (!isResults || searchLoading || searchError) return null
    if (totalResults > 0) return null
    const suggestion = getDidYouMean(debouncedQuery)
    if (suggestion && suggestion === dismissedSuggestion) return null
    return suggestion
  }, [isResults, searchLoading, searchError, totalResults, debouncedQuery, dismissedSuggestion])

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (filters.onSale) chips.push({ key: 'onSale', label: t('categories.onSale') })
    if (filters.inStock) chips.push({ key: 'inStock', label: t('categories.inStock') })
    if (filters.minRating > 0) chips.push({ key: 'rating', label: `${filters.minRating}\u2605+` })
    filters.brands.forEach(b => chips.push({ key: `brand-${b}`, label: b }))
    if (filters.priceMin > 0 || filters.priceMax < 999999) {
      chips.push({ key: 'price', label: `${formatNPR(filters.priceMin)}\u2013${formatNPR(filters.priceMax)}` })
    }
    return chips
  }, [filters, t])

  const removeChip = useCallback((key: string) => {
    setFilters(f => {
      const next = { ...f }
      if (key === 'onSale') next.onSale = false
      else if (key === 'inStock') next.inStock = false
      else if (key === 'rating') next.minRating = 0
      else if (key.startsWith('brand-')) {
        const brand = key.replace('brand-', '')
        const b = new Set(f.brands)
        b.delete(brand)
        next.brands = b
      } else if (key === 'price') {
        next.priceMin = 0
        next.priceMax = 999999
      }
      return next
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

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
    const urlFilters: FilterState = { ...DEFAULT_FILTERS }
    if (searchParams.get('onSale') === '1') urlFilters.onSale = true
    if (searchParams.get('inStock') === '1') urlFilters.inStock = true
    if (searchParams.get('minRating')) urlFilters.minRating = Number(searchParams.get('minRating'))
    if (searchParams.get('minPrice')) urlFilters.priceMin = Number(searchParams.get('minPrice'))
    if (searchParams.get('maxPrice')) urlFilters.priceMax = Number(searchParams.get('maxPrice'))
    if (searchParams.get('brands')) {
      urlFilters.brands = new Set(searchParams.get('brands')!.split(','))
    }
    if (searchParams.get('sort')) setSortBy(searchParams.get('sort')!)
    const hasFilters = urlFilters.onSale || urlFilters.inStock || urlFilters.minRating > 0 ||
      urlFilters.priceMin > 0 || urlFilters.priceMax < 999999 || urlFilters.brands.size > 0
    if (hasFilters) setFilters(urlFilters)
  }, [query, searchParams])

  useEffect(() => {
    if (submitted && debouncedQuery.trim().length >= 2) {
      const params = new URLSearchParams()
      params.set('q', debouncedQuery.trim())
      if (filters.onSale) params.set('onSale', '1')
      if (filters.inStock) params.set('inStock', '1')
      if (filters.minRating > 0) params.set('minRating', String(filters.minRating))
      if (filters.priceMin > 0) params.set('minPrice', String(filters.priceMin))
      if (filters.priceMax < 999999) params.set('maxPrice', String(filters.priceMax))
      if (filters.brands.size > 0) params.set('brands', Array.from(filters.brands).join(','))
      if (sortBy !== 'relevance') params.set('sort', sortBy)
      router.replace(`/search?${params.toString()}`, { scroll: false })
    } else if (!submitted && !debouncedQuery) {
      router.replace('/search', { scroll: false })
    }
  }, [submitted, debouncedQuery, filters, sortBy, router])

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

  const handleDidYouMean = useCallback((suggestion: string) => {
    setDismissedSuggestion(suggestion)
    setQuery(suggestion)
    setSubmitted(true)
    saveRecentSearch(suggestion)
    setRecentSearches(getRecentSearches())
  }, [])

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

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = infinite
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, displayItems.length])

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <SearchBar
        query={query}
        onQueryChange={handleQueryChange}
        onKeyDown={handleKeyDown}
        inputFocused={inputFocused}
        onFocusChange={setInputFocused}
        showSpinner={showSpinner}
        onClear={handleClear}
        activeIndex={activeIndex}
        isTyping={isTyping}
        suggestionItems={suggestionItems}
        t={t}
        router={router}
        reduced={reduced}
        inputRef={inputRef}
      />

      <Container className="py-6">
        <AnimatePresence mode="wait">
          {isEmpty && (
            <SearchLanding
              key="suggestions"
              recentSearches={recentSearches}
              onRecentPress={handleRecentPress}
              onRemoveRecent={handleRemoveRecent}
              onClearAll={handleClearAll}
              onPopularPress={handlePopularPress}
              onCategoryPress={handleCategoryPress}
              t={t}
              reduced={reduced}
              m={m}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
            />
          )}

          {isTyping && (
            <SearchSuggestions
              key="typeahead"
              suggestionItems={suggestionItems}
              suggestionsFetching={suggestionsFetching}
              actionableItems={actionableItems}
              onSuggestionPress={handleSuggestionPress}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              debouncedQuery={debouncedQuery}
              t={t}
              m={m}
              reduced={reduced}
              HighlightText={HighlightText}
              listRef={listRef}
            />
          )}

          {isResults && (
            <SearchResults
              key="results"
              searchLoading={searchLoading}
              searchError={searchError}
              refetch={refetch}
              totalResults={totalResults}
              displayCount={displayCount}
              displayItems={displayItems}
              searchResults={searchResults}
              debouncedQuery={debouncedQuery}
              didYouMean={didYouMean}
              hasActiveFilters={hasActiveFilters}
              activeChipCount={activeChipCount}
              activeChips={activeChips}
              showSort={showSort}
              sortBy={sortBy}
              showFilterPanel={showFilterPanel}
              filters={filters}
              setShowSort={setShowSort}
              setSortBy={setSortBy}
              setFilters={setFilters}
              setShowFilterPanel={setShowFilterPanel}
              removeChip={removeChip}
              clearAllFilters={clearAllFilters}
              handleProductPress={handleProductPress}
              handlePopularPress={handlePopularPress}
              handleCategoryPress={handleCategoryPress}
              onDidYouMean={handleDidYouMean}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              sentinelRef={sentinelRef}
              t={t}
              m={m}
              reduced={reduced}
            />
          )}
        </AnimatePresence>
      </Container>
    </div>
  )
}

export default SearchContent
