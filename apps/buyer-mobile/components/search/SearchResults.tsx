import React, { useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native'
import Animated from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { radii, spacing, duration } from '@chinooz/theme'
import { ProductCard, Skeleton, SafeImage, useReducedMotion } from '@chinooz/ui'
import { formatNPR } from '@chinooz/utils'
import type { SuggestionItem } from '@chinooz/hooks'
import type { Product } from '@chinooz/types'
import { useAppTheme } from '../ThemeProvider'
import Icon from '../Icon'
import {
  type FilterState,
  motion,
  makeStyles,
  highlightMatch,
  SORT_OPTIONS,
  QUICK_FILTERS,
  POPULAR_TERMS,
  POPULAR_CATEGORIES,
  AnimatedTouchable,
  EDGE_PADDING,
  GAP,
} from './SearchHelpers'

interface SearchLandingProps {
  recentSearches: string[]
  clearingAll: boolean
  onClearAll: () => void
  onRecentPress: (term: string) => void
  onRemoveRecent: (term: string) => void
  onPopularPress: (term: string) => void
  onCategoryPress: (category: { id: string; name: string }) => void
}

export function SearchLanding({
  recentSearches,
  clearingAll,
  onClearAll,
  onRecentPress,
  onRemoveRecent,
  onPopularPress,
  onCategoryPress,
}: SearchLandingProps) {
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const m = useMemo(() => motion(reduced), [reduced])
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <ScrollView
      style={styles.suggestionsContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {recentSearches.length > 0 && !clearingAll && (
        <Animated.View
          entering={m.fadeIn()}
          exiting={m.fadeOut()}
          style={styles.section}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleInline}>
              <Icon name="time-outline" size={15} color={colors.textMuted} />
              <Text style={styles.sectionLabel}>{t('search.recent')}</Text>
            </View>
            <TouchableOpacity
              onPress={onClearAll}
              accessibilityRole="button"
              accessibilityLabel={t('search.clearAll')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearAllText}>{t('search.clearAll')}</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((term, index) => (
            <Animated.View
              key={term}
              entering={m.staggerItem(index)}
              exiting={m.fadeOut()}
            >
              <TouchableOpacity
                style={styles.recentRow}
                onPress={() => onRecentPress(term)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={term}
              >
                <Icon name="time-outline" size={18} color={colors.textTertiary} />
                <Text style={styles.recentText} numberOfLines={1}>
                  {term}
                </Text>
                <TouchableOpacity
                  onPress={() => onRemoveRecent(term)}
                  style={styles.removeButton}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel={t('search.removeSearch', { term })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      <View style={styles.section}>
        <Animated.View
          entering={m.staggerItem(recentSearches.length)}
        >
          <View style={styles.sectionTitleRow}>
            <Icon name="trending-up" size={16} color={colors.primary} />
            <Text style={styles.sectionLabel}>{t('search.trending')}</Text>
          </View>
        </Animated.View>
        <View style={styles.chipsWrap}>
          {POPULAR_TERMS.map((term, index) => (
            <Animated.View
              key={term}
              entering={m.staggerItem(recentSearches.length + 1 + index)}
            >
              <AnimatedTouchable
                style={styles.chip}
                onPress={() => onPopularPress(term)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={term}
              >
                <Text style={styles.chipText}>{term}</Text>
              </AnimatedTouchable>
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Animated.View
          entering={m.staggerItem(recentSearches.length + 1 + POPULAR_TERMS.length)}
        >
          <View style={styles.sectionTitleRow}>
            <Icon name="grid-outline" size={15} color={colors.textMuted} />
            <Text style={styles.sectionLabel}>{t('search.popularCategories')}</Text>
          </View>
        </Animated.View>
        <View style={styles.categoryGrid}>
          {POPULAR_CATEGORIES.map((category, index) => (
            <Animated.View
              key={category.id}
              style={styles.categoryTileWrap}
              entering={m.staggerItem(recentSearches.length + 1 + POPULAR_TERMS.length + 1 + index)}
            >
              <AnimatedTouchable
                style={styles.categoryTile}
                onPress={() => onCategoryPress(category)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={category.name}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: category.bg }]}>
                  <Icon name={category.icon} size={20} color={category.tint} />
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category.name}
                </Text>
              </AnimatedTouchable>
            </Animated.View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

interface SearchSuggestionsProps {
  suggestionsFetching: boolean
  suggestionItems: SuggestionItem[]
  debouncedQuery: string
  onSuggestionPress: (item: SuggestionItem) => void
}

export function SearchSuggestions({
  suggestionsFetching,
  suggestionItems,
  debouncedQuery,
  onSuggestionPress,
}: SearchSuggestionsProps) {
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const m = useMemo(() => motion(reduced), [reduced])
  const styles = useMemo(() => makeStyles(colors), [colors])

  const renderSuggestionRow = useCallback(
    ({ item, index }: { item: SuggestionItem; index: number }) => {
      if (item.type === 'label') {
        return (
          <Animated.View
            key={item.key}
            entering={m.staggerItem(index)}
            style={styles.suggestionLabel}
          >
            <Text style={styles.suggestionLabelText}>
              {t(`search.suggestionLabel_${item.label}`, { defaultValue: item.label.toUpperCase() })}
            </Text>
          </Animated.View>
        )
      }

      if (item.type === 'product') {
        const p = item.product
        return (
          <Animated.View
            key={item.key}
            entering={m.staggerItem(index)}
          >
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => onSuggestionPress(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${formatNPR(p.price)}`}
            >
              <SafeImage
                source={p.images?.[0]?.uri}
                style={styles.suggestionThumb}
                accessibilityLabel={p.name}
              />
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {highlightMatch(p.name, debouncedQuery, colors.primary)}
                </Text>
                <Text style={styles.suggestionPrice}>{formatNPR(p.price)}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )
      }

      if (item.type === 'category') {
        const c = item.category
        return (
          <Animated.View
            key={item.key}
            entering={m.staggerItem(index)}
          >
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => onSuggestionPress(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={c.name}
            >
              <Text style={styles.suggestionCatIcon}>{c.icon}</Text>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {highlightMatch(c.name, debouncedQuery, colors.primary)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )
      }

      if (item.type === 'brand') {
        const b = item.brand
        return (
          <Animated.View
            key={item.key}
            entering={m.staggerItem(index)}
          >
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => onSuggestionPress(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={b.name}
            >
              <Text style={styles.suggestionBrandIcon}>{'\u{1F3EA}'}</Text>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {highlightMatch(b.name, debouncedQuery, colors.primary)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )
      }

      return null
    },
    [debouncedQuery, onSuggestionPress, t, styles, m, colors.primary],
  )

  return (
    <Animated.View entering={m.fadeIn()} style={styles.suggestionsContainer}>
      {suggestionsFetching && suggestionItems.length === 0 ? (
        <View style={styles.suggestionSkeletons} accessibilityState={{ busy: true }} accessibilityLabel={t('search.loadingSuggestions')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Animated.View
              key={i}
              entering={m.staggerItem(i)}
              style={styles.suggestionSkeletonRow}
            >
              <Skeleton width={40} height={40} borderRadius={radii.lg} />
              <View style={styles.suggestionSkeletonContent}>
                <Skeleton width="75%" height={16} />
                <Skeleton width="40%" height={14} />
              </View>
            </Animated.View>
          ))}
        </View>
      ) : suggestionItems.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {suggestionItems.map((item, index) => renderSuggestionRow({ item, index }))}
        </ScrollView>
      ) : !suggestionsFetching ? (
        <View style={styles.emptyTypeahead}>
          <Text style={styles.emptyText}>{t('search.noResults')}</Text>
        </View>
      ) : null}
    </Animated.View>
  )
}

interface SearchResultsProps {
  resultsLoading: boolean
  resultsError: boolean
  resultsSource: Product[] | undefined
  filteredProducts: Product[]
  resultsRefetch: () => void
  gridColumns: number
  gridItemWidth: number
  isResults: boolean
  debouncedQuery: string
  displayCount: number
  sortBy: string
  activeChipCount: number
  activeChips: { key: string; label: string }[]
  filters: FilterState
  onToggleQuickFilter: (key: string) => void
  onRemoveChip: (key: string) => void
  onClearAllFilters: () => void
  onOpenFilters: () => void
  onOpenSort: () => void
  onProductPress: (product: Product) => void
  onAddToCart: (product: Product) => void
  didYouMean: string | null
  onDidYouMean: () => void
  hasActiveFilters: boolean
  onPopularPress: (term: string) => void
  onCategoryPress: (category: { id: string; name: string }) => void
}

export function SearchResults({
  resultsLoading,
  resultsError,
  resultsSource,
  filteredProducts,
  resultsRefetch,
  gridColumns,
  gridItemWidth,
  isResults,
  debouncedQuery,
  displayCount,
  sortBy,
  activeChipCount,
  activeChips,
  filters,
  onToggleQuickFilter,
  onRemoveChip,
  onClearAllFilters,
  onOpenFilters,
  onOpenSort,
  onProductPress,
  onAddToCart,
  didYouMean,
  onDidYouMean,
  hasActiveFilters,
  onPopularPress,
  onCategoryPress,
}: SearchResultsProps) {
  const { colors } = useAppTheme()
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const m = useMemo(() => motion(reduced), [reduced])
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <Animated.View entering={m.fadeIn()} style={styles.resultsContainer}>
      {resultsLoading ? (
        <View style={styles.skeletonGrid} accessibilityState={{ busy: true }} accessibilityLabel={t('search.loadingResults')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: gridItemWidth }}>
              <View style={styles.skeletonCard}>
                <Skeleton width="100%" height={gridItemWidth * 1.2} borderRadius={radii.lg} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="85%" height={14} />
                  <Skeleton width="55%" height={12} />
                  <Skeleton width="40%" height={16} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : resultsError ? (
        <Animated.View entering={m.fadeInDown()} style={styles.errorState}>
          <Text style={styles.errorIcon}>{'\u{1F615}'}</Text>
          <Text style={styles.errorTitle}>{t('search.errorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('search.errorSubtitle')}</Text>
          <TouchableOpacity
            onPress={() => resultsRefetch()}
            style={styles.retryButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('search.retry')}
          >
            <Text style={styles.retryText}>{t('search.retry')}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : resultsSource && resultsSource.length > 0 && filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          numColumns={gridColumns}
          columnWrapperStyle={gridColumns > 1 ? { paddingHorizontal: EDGE_PADDING, gap: GAP } : undefined}
          contentContainerStyle={{ paddingTop: spacing[2], paddingBottom: spacing[16] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsQuery} numberOfLines={1}>
                  {isResults ? debouncedQuery : t(SORT_OPTIONS.find(o => o.key === sortBy)?.labelKey ?? 'categories.relevance')}
                </Text>
                <Text style={styles.resultsCount} accessibilityLiveRegion="polite">
                  {t('categories.results', { count: displayCount })}
                </Text>
              </View>
              <View style={styles.filterBar}>
                <TouchableOpacity
                  style={[styles.filterChip, activeChipCount > 0 && styles.filterChipActive]}
                  onPress={onOpenFilters}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('categories.filters')}
                >
                  <Text style={styles.filterChipIcon}>{'\u{1F527}'}</Text>
                  <Text style={[styles.filterChipText, activeChipCount > 0 && styles.filterChipTextActive]}>
                    {t('categories.filters')}
                  </Text>
                  {activeChipCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeChipCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sortChip}
                  onPress={onOpenSort}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('categories.sortBy')}
                >
                  <Text style={styles.sortChipIcon}>{'\u2195'}</Text>
                  <Text style={styles.sortChipText}>
                    {t(SORT_OPTIONS.find(o => o.key === sortBy)?.labelKey || 'categories.relevance')}
                  </Text>
                </TouchableOpacity>
              </View>
              {activeChips.length > 0 && (
                <View style={styles.activeChipsRow}>
                  {activeChips.map(chip => (
                    <Animated.View
                      key={chip.key}
                      entering={m.fadeInDown()}
                      exiting={m.fadeOut()}
                    >
                      <TouchableOpacity
                        style={styles.activeChip}
                        onPress={() => onRemoveChip(chip.key)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${chip.label}, remove`}
                      >
                        <Text style={styles.activeChipText}>{chip.label}</Text>
                        <Text style={styles.activeChipX}>{'\u00D7'}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                  <TouchableOpacity
                    onPress={onClearAllFilters}
                    style={styles.clearFiltersBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('categories.clearAll')}
                  >
                    <Text style={styles.clearFiltersText}>{t('categories.clearAll')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickFiltersScroll}
                contentContainerStyle={styles.quickFiltersContent}
              >
                {QUICK_FILTERS.map(f => {
                  const active = f.key === 'onSale' ? filters.onSale
                    : f.key === 'topRated' ? filters.minRating >= 4
                    : f.key === 'inStock' ? filters.inStock
                    : false
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.quickChip, active && styles.quickChipActive]}
                      onPress={() => onToggleQuickFilter(f.key)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                        {t(f.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={m.springIn(index)}
              style={{ width: gridItemWidth }}
            >
              <ProductCard
                product={item}
                onPress={onProductPress}
                onAddToCart={onAddToCart}
                variant="compact"
              />
            </Animated.View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyScrollContent} showsVerticalScrollIndicator={false}>
          {didYouMean && (
            <Animated.View entering={m.fadeInDown()} style={styles.didYouMeanBar}>
              <Text style={styles.didYouMeanLabel}>{t('search.didYouMean')}: </Text>
              <TouchableOpacity
                onPress={onDidYouMean}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel={`${t('search.didYouMean')} ${didYouMean}`}
              >
                <Text style={styles.didYouMeanTerm}>{didYouMean}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          <Animated.View entering={m.fadeIn(duration.slow)} style={styles.emptyStateWrap}>
            <Text style={styles.emptyTitle}>
              {isResults ? t('search.noResultsFor', { term: debouncedQuery }) : t('search.noResults')}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={onClearAllFilters}
                style={styles.clearFiltersOutlineBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('search.clearFilters')}
              >
                <Text style={styles.clearFiltersOutlineText}>{t('search.clearFilters')}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
          <View style={styles.emptyRecovery}>
            <Animated.View entering={m.staggerItem(0)}>
              <Text style={styles.emptyRecoveryTitle}>{t('search.tryTrending')}</Text>
            </Animated.View>
            <View style={styles.emptyRecoveryChips}>
              {POPULAR_TERMS.slice(0, 4).map((term, i) => (
                <Animated.View
                  key={term}
                  entering={m.staggerItem(i + 1)}
                >
                  <TouchableOpacity
                    style={styles.emptyChip}
                    onPress={() => onPopularPress(term)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={term}
                  >
                    <Text style={styles.emptyChipText}>{term}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
            <Animated.View entering={m.staggerItem(5)}>
              <Text style={[styles.emptyRecoveryTitle, { marginTop: spacing[4] }]}>
                {t('search.browseCategories')}
              </Text>
            </Animated.View>
            <View style={styles.emptyCategoryGrid}>
              {POPULAR_CATEGORIES.slice(0, 4).map((cat, i) => (
                <Animated.View
                  key={cat.id}
                  entering={m.staggerItem(i + 6)}
                  style={styles.emptyCategoryTileWrap}
                >
                  <TouchableOpacity
                    style={styles.emptyCategoryTile}
                    onPress={() => onCategoryPress(cat)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={cat.name}
                  >
                    <Text style={styles.emptyCategoryIcon}>{cat.icon}</Text>
                    <Text style={styles.emptyCategoryName}>{cat.name}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </Animated.View>
  )
}
