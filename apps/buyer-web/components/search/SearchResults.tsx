'use client'

import { lazy, type Dispatch, type SetStateAction, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ProductCard from '@chinooz/ui-web/ProductCard'
import { ProductCardSkeleton } from '@chinooz/ui-web/ProductCard'
import { duration } from '@chinooz/theme'
import type { Product } from '@chinooz/types'
import {
  webMotion,
  SORT_OPTIONS,
  QUICK_FILTERS,
  DEFAULT_FILTERS,
  POPULAR_TERMS,
  POPULAR_CATEGORIES,
  type FilterState,
} from '@/components/search/SearchHelpers'

const FilterPanel = lazy(() => import('@/components/FilterPanel'))
const SortDropdown = lazy(() => import('@/components/SortDropdown'))

interface SearchResultsProps {
  searchLoading: boolean
  searchError: boolean
  refetch: () => void
  totalResults: number
  displayCount: number
  displayItems: Product[]
  searchResults: Product[] | undefined
  debouncedQuery: string
  didYouMean: string | null
  hasActiveFilters: boolean
  activeChipCount: number
  activeChips: { key: string; label: string }[]
  showSort: boolean
  sortBy: string
  showFilterPanel: boolean
  filters: FilterState
  setShowSort: (show: boolean) => void
  setSortBy: (key: string) => void
  setFilters: Dispatch<SetStateAction<FilterState>>
  setShowFilterPanel: (show: boolean) => void
  removeChip: (key: string) => void
  clearAllFilters: () => void
  handleProductPress: (product: Product) => void
  handlePopularPress: (term: string) => void
  handleCategoryPress: (category: { id: string; name: string }) => void
  onDidYouMean: (suggestion: string) => void
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  sentinelRef: RefObject<HTMLDivElement | null>
  t: ReturnType<typeof useTranslation>['t']
  m: ReturnType<typeof webMotion>
  reduced: boolean
}

export function SearchResults({
  searchLoading,
  searchError,
  refetch,
  totalResults,
  displayCount,
  displayItems,
  searchResults,
  debouncedQuery,
  didYouMean,
  hasActiveFilters,
  activeChipCount,
  activeChips,
  showSort,
  sortBy,
  showFilterPanel,
  filters,
  setShowSort,
  setSortBy,
  setFilters,
  setShowFilterPanel,
  removeChip,
  clearAllFilters,
  handleProductPress,
  handlePopularPress,
  handleCategoryPress,
  onDidYouMean,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  sentinelRef,
  t,
  m,
  reduced,
}: SearchResultsProps) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={m.fadeIn()}
    >
      {searchLoading ? (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          aria-busy="true"
          aria-label={t('search.loadingResults')}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl overflow-hidden">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : searchError ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: duration.slower / 1000, type: 'spring', damping: 18, stiffness: 120 }}
          className="flex flex-col items-center py-16 gap-3"
        >
          <span className="text-6xl">{'\u{1F615}'}</span>
          <p className="text-lg font-semibold text-text">{t('search.errorTitle')}</p>
          <p className="text-sm text-text-muted text-center max-w-sm">
            {t('search.errorSubtitle')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-5 py-2.5 rounded-md border-medium border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            aria-label={t('search.retry')}
          >
            {t('search.retry')}
          </button>
        </motion.div>
      ) : totalResults > 0 ? (
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
                <span className="bg-primary text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
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

          {activeChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap py-2">
              {activeChips.map(chip => (
                <motion.button
                  key={chip.key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={m.spring()}
                  layout
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <span>{chip.label}</span>
                  <span className="text-primary font-semibold">{'\u00D7'}</span>
                </motion.button>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-text-muted hover:text-text transition-colors ml-1"
              >
                {t('categories.clearAll')}
              </button>
            </div>
          )}

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
            {displayItems.map((product, i) => (
              <motion.div
                key={product.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={m.staggerItem(i)}
                layout={reduced ? false : true}
                layoutId={`search-product-${product.id}`}
              >
                <ProductCard
                  product={product}
                  onPress={handleProductPress}
                />
              </motion.div>
            ))}
          </div>

          {isFetchingNextPage && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-5 py-2.5 rounded-md border-medium border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {isFetchingNextPage ? t('common.loading') : t('home.loadMore')}
              </button>
            </div>
          )}

          {!hasNextPage && displayItems.length > 0 && (
            <p className="text-center text-xs text-text-muted py-6">
              {t('search.endOfResults')}
            </p>
          )}
        </div>
      ) : (
        <div>
          {didYouMean && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={m.fadeIn()}
              className="flex items-center gap-1 px-0 py-3 bg-background rounded-lg mb-4"
            >
              <span className="text-sm font-medium text-text-muted">
                {t('search.didYouMean')}:{' '}
              </span>
              <button
                onClick={() => onDidYouMean(didYouMean)}
                className="text-sm font-medium text-primary underline hover:text-primary-dark transition-colors"
                role="link"
                aria-label={`${t('search.didYouMean')} ${didYouMean}`}
              >
                {didYouMean}
              </button>
            </motion.div>
          )}
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? { duration: 0 } : { duration: duration.slower / 1000, type: 'spring', damping: 15, stiffness: 80 }}
            className="flex flex-col items-center py-12 gap-3"
          >
            <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-2">
              <span className="text-5xl">{'\u{1F50D}'}</span>
            </div>
            <h3 className="text-base font-semibold text-text text-center">
              {t('search.noResultsFor', { term: debouncedQuery })}
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-2 px-5 py-2.5 rounded-md border-medium border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                aria-label={t('search.clearFilters')}
              >
                {t('search.clearFilters')}
              </button>
            )}
          </motion.div>
          <div className="mt-4">
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={m.staggerItem(0)}
              className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3"
            >
              {t('search.tryTrending')}
            </motion.p>
            <div className="flex flex-wrap gap-2 mb-6">
              {POPULAR_TERMS.slice(0, 4).map((term, i) => (
                <motion.button
                  key={term}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={m.staggerItem(i + 6)}
                  whileHover={reduced ? {} : { scale: 1.02 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  onClick={() => handlePopularPress(term)}
                  className="px-4 py-2 bg-surface border border-primary rounded-full text-sm font-medium text-primary hover:bg-primary-50 transition-colors"
                >
                  {term}
                </motion.button>
              ))}
            </div>
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={m.staggerItem(5)}
              className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3"
            >
              {t('search.browseCategories')}
            </motion.p>
            <div className="grid grid-cols-2 gap-3">
              {POPULAR_CATEGORIES.slice(0, 4).map((cat, i) => (
                <motion.button
                  key={cat.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={m.staggerItem(i + 6)}
                  whileHover={reduced ? {} : { scale: 1.02 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  onClick={() => handleCategoryPress(cat)}
                  className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-3 hover:border-primary/30 transition-colors text-left"
                  aria-label={cat.name}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-semibold text-text truncate">
                    {cat.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
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
  )
}
