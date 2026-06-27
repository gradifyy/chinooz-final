import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  SlideInDown,
  Easing,
  LinearTransition,
} from 'react-native-reanimated'
import {
  useSearchProducts,
  useSearchSuggestions,
  usePrefetchProduct,
} from '@chinooz/hooks'
import type { SuggestionItem } from '@chinooz/hooks'
import { colors, radii, spacing } from '@chinooz/theme'
import { ProductCard, ProductCardSkeleton, SafeImage } from '@chinooz/ui'
import { formatNPR } from '@chinooz/utils'
import { useCartStore } from '@chinooz/state'
import type { Product } from '@chinooz/types'
import FilterSheet, { type FilterState } from '../components/FilterSheet'
import SortSheet, { type SortOption } from '../components/SortSheet'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EDGE_PADDING = 16
const GAP = 12
const MAX_RECENT = 8
const DEBOUNCE_MS = 250
const STAGGER_CAP = 10
const STAGGER_DELAY = 50

const SORT_OPTIONS: SortOption[] = [
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

const DEFAULT_FILTERS: FilterState = {
  priceMin: 0,
  priceMax: 999999,
  minRating: 0,
  brands: new Set(),
  inStock: false,
  onSale: false,
}

function getGridColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w >= 1024) return 5
  if (w >= 768) return 4
  if (w >= 640) return 3
  return 2
}

function getGridItemWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

function useCountUp(target: number, duration = 200): number {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>(0)
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

let inMemoryRecentSearches: string[] = []

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

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <Text>
      {text.slice(0, idx)}
      <Text style={styles.highlightText}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  )
}

export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const inputRef = useRef<TextInput>(null)
  const prefetch = usePrefetchProduct()

  const [query, setQuery] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [pressedRow, setPressedRow] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [showSortSheet, setShowSortSheet] = useState(false)

  const addItem = useCartStore(s => s.addItem)

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

  const gridColumns = getGridColumns()
  const gridItemWidth = getGridItemWidth(gridColumns)

  useEffect(() => {
    setRecentSearches([...inMemoryRecentSearches])
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(t('search.searchScreenOpened'))
    }
    return () => clearTimeout(timer)
  }, [])

  const persistRecent = useCallback((term: string) => {
    inMemoryRecentSearches = [term, ...inMemoryRecentSearches.filter(s => s !== term)].slice(
      0,
      MAX_RECENT,
    )
    setRecentSearches([...inMemoryRecentSearches])
  }, [])

  const handleRemoveRecent = useCallback((term: string) => {
    inMemoryRecentSearches = inMemoryRecentSearches.filter(s => s !== term)
    setRecentSearches([...inMemoryRecentSearches])
    setPressedRow(null)
  }, [])

  const handleClearAll = useCallback(() => {
    setClearingAll(true)
    setTimeout(() => {
      inMemoryRecentSearches = []
      setRecentSearches([])
      setClearingAll(false)
    }, 200)
  }, [])

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text)
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
      persistRecent(debouncedQuery.trim())
      inputRef.current?.blur()
    }
  }, [debouncedQuery, persistRecent])

  const handleRecentPress = useCallback(
    (term: string) => {
      setQuery(term)
      setSubmitted(true)
      persistRecent(term)
    },
    [persistRecent],
  )

  const handlePopularPress = useCallback(
    (term: string) => {
      setQuery(term)
      setSubmitted(true)
      persistRecent(term)
    },
    [persistRecent],
  )

  const handleCategoryPress = useCallback(
    (category: { id: string; name: string }) => {
      router.push(`/category/${category.id}`)
    },
    [router],
  )

  const handleProductPress = useCallback(
    (product: Product) => {
      prefetch(product.id)
      router.push(`/product/${product.id}`)
    },
    [prefetch, router],
  )

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem({
        id: `ci-${product.id}`,
        productId: product.id,
        name: product.name,
        image: product.images?.[0]?.uri ?? '',
        price: product.price,
        quantity: 1,
        maxQuantity: 10,
      })
    },
    [addItem],
  )

  const handleSuggestionPress = useCallback(
    (item: SuggestionItem) => {
      if (item.type === 'product') {
        prefetch(item.product.id)
        router.push(`/product/${item.product.id}`)
      } else if (item.type === 'category') {
        router.push(`/category/${item.category.id}`)
      } else if (item.type === 'brand') {
        setQuery(item.brand.name)
        setSubmitted(true)
        persistRecent(item.brand.name)
      } else if (item.type === 'term') {
        setQuery(item.term)
        setSubmitted(true)
        persistRecent(item.term)
      }
    },
    [prefetch, router, persistRecent],
  )

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const renderSuggestionRow = useCallback(
    ({ item, index }: { item: SuggestionItem; index: number }) => {
      if (item.type === 'label') {
        return (
          <Animated.View
            key={item.key}
            entering={FadeInDown.duration(200)
              .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
              .delay(staggerDelay(index))}
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
            entering={FadeInDown.duration(200)
              .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
              .delay(staggerDelay(index))}
          >
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => handleSuggestionPress(item)}
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
                  {highlightMatch(p.name, debouncedQuery)}
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
            entering={FadeInDown.duration(200)
              .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
              .delay(staggerDelay(index))}
          >
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => handleSuggestionPress(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={c.name}
            >
              <Text style={styles.suggestionCatIcon}>{c.icon}</Text>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {highlightMatch(c.name, debouncedQuery)}
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
            entering={FadeInDown.duration(200)
              .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
              .delay(staggerDelay(index))}
          >
            <TouchableOpacity
              style={styles.suggestionRow}
              onPress={() => handleSuggestionPress(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={b.name}
            >
              <Text style={styles.suggestionBrandIcon}>{'\u{1F3EA}'}</Text>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {highlightMatch(b.name, debouncedQuery)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )
      }

      return null
    },
    [debouncedQuery, handleSuggestionPress, t],
  )

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top }]}
      entering={SlideInDown.duration(250).easing(Easing.bezier(0.34, 1.56, 0.64, 1))}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <View style={[styles.inputWrap, inputFocused && styles.inputWrapFocused]}>
          <Text style={styles.searchIcon}>{'\u2315'}</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={t('search.inputPlaceholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('common.search')}
          />
          {showSpinner && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.spinner}
            />
          )}
          {query.length > 0 && !showSpinner && (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
              <TouchableOpacity
                onPress={handleClear}
                style={styles.clearButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('search.clearSearch')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearIcon}>{'\u00D7'}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {isEmpty && (
          <ScrollView
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {recentSearches.length > 0 && !clearingAll && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('search.recent')}</Text>
                  <TouchableOpacity
                    onPress={handleClearAll}
                    accessibilityRole="button"
                    accessibilityLabel={t('search.clearAll')}
                  >
                    <Text style={styles.clearAllText}>{t('search.clearAll')}</Text>
                  </TouchableOpacity>
                </View>
                {recentSearches.map((term, index) => (
                  <Animated.View
                    key={term}
                    entering={FadeInDown.duration(250)
                      .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
                      .delay(staggerDelay(index))}
                    exiting={FadeOut.duration(200)}
                    layout={LinearTransition.springify()}
                  >
                    <TouchableOpacity
                      style={styles.recentRow}
                      onPress={() => handleRecentPress(term)}
                      onLongPress={() => setPressedRow(pressedRow === term ? null : term)}
                      onPressIn={() => setPressedRow(term)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={term}
                    >
                      <Text style={styles.recentIcon}>{'\u{1F552}'}</Text>
                      <Text style={styles.recentText} numberOfLines={1}>
                        {term}
                      </Text>
                      {pressedRow === term && (
                        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
                          <TouchableOpacity
                            onPress={() => handleRemoveRecent(term)}
                            style={styles.removeButton}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={t('search.removeSearch', { term })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.removeIcon}>{'\u00D7'}</Text>
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            <View style={styles.section}>
              <Animated.View
                entering={FadeInDown.duration(250)
                  .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
                  .delay(staggerDelay(recentSearches.length))}
              >
                <Text style={styles.sectionTitle}>{t('search.trending')}</Text>
              </Animated.View>
              <View style={styles.chipsWrap}>
                {POPULAR_TERMS.map((term, index) => (
                  <Animated.View
                    key={term}
                    entering={FadeInDown.duration(250)
                      .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
                      .delay(staggerDelay(recentSearches.length + 1 + index))}
                  >
                    <AnimatedTouchable
                      style={styles.chip}
                      onPress={() => handlePopularPress(term)}
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
                entering={FadeInDown.duration(250)
                  .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
                  .delay(staggerDelay(recentSearches.length + 1 + POPULAR_TERMS.length))}
              >
                <Text style={styles.sectionTitle}>{t('search.popularCategories')}</Text>
              </Animated.View>
              <View style={styles.categoryGrid}>
                {POPULAR_CATEGORIES.map((category, index) => (
                  <Animated.View
                    key={category.id}
                    style={styles.categoryTileWrap}
                    entering={FadeInDown.duration(250)
                      .easing(Easing.bezier(0.34, 1.56, 0.64, 1))
                      .delay(
                        staggerDelay(
                          recentSearches.length + 1 + POPULAR_TERMS.length + 1 + index,
                        ),
                      )}
                  >
                    <AnimatedTouchable
                      style={styles.categoryTile}
                      onPress={() => handleCategoryPress(category)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={category.name}
                    >
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {category.name}
                      </Text>
                    </AnimatedTouchable>
                  </Animated.View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {isTyping && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.suggestionsContainer}>
            {suggestionItems.length > 0 ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {suggestionItems.map((item, index) => renderSuggestionRow({ item, index }))}
              </ScrollView>
            ) : !suggestionsFetching ? (
              <View style={styles.emptyTypeahead}>
                <Text style={styles.emptyText}>{t('search.noResults')}</Text>
              </View>
            ) : null}
          </Animated.View>
        )}

        {isResults && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.resultsContainer}>
            {searchLoading ? (
              <View style={styles.skeletonGrid} accessibilityState={{ busy: true }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={{ width: gridItemWidth }}>
                    <ProductCardSkeleton variant="compact" />
                  </View>
                ))}
              </View>
            ) : searchResults && searchResults.length > 0 ? (
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
                      <Text style={styles.resultsQuery} numberOfLines={1}>{debouncedQuery}</Text>
                      <Text style={styles.resultsCount} accessibilityLiveRegion="polite">
                        {t('categories.results', { count: displayCount })}
                      </Text>
                    </View>
                    <View style={styles.filterBar}>
                      <TouchableOpacity
                        style={[styles.filterChip, activeChipCount > 0 && styles.filterChipActive]}
                        onPress={() => setShowFilterSheet(true)}
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
                        onPress={() => setShowSortSheet(true)}
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
                            onPress={() => {
                              if (f.key === 'onSale') setFilters(prev => ({ ...prev, onSale: !prev.onSale }))
                              else if (f.key === 'topRated') setFilters(prev => ({ ...prev, minRating: prev.minRating >= 4 ? 0 : 4 }))
                              else if (f.key === 'inStock') setFilters(prev => ({ ...prev, inStock: !prev.inStock }))
                            }}
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
                    entering={FadeInDown.duration(250)
                      .delay(Math.min(index, 9) * 50)
                      .springify()
                      .damping(18)}
                    style={{ width: gridItemWidth }}
                  >
                    <ProductCard
                      product={item}
                      onPress={handleProductPress}
                      onAddToCart={handleAddToCart}
                      variant="compact"
                    />
                  </Animated.View>
                )}
              />
            ) : (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyResultsIcon}>{'\u{1F50D}'}</Text>
                <Text style={styles.emptyResultsTitle}>{t('search.noResults')}</Text>
                <Text style={styles.emptyResultsSubtitle}>{t('search.noResultsSubtitle')}</Text>
              </View>
            )}
          </Animated.View>
        )}

        <FilterSheet
          visible={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          products={searchResults ?? []}
          filters={filters}
          onApply={f => { setFilters(f); setShowFilterSheet(false) }}
          onReset={() => { setFilters(DEFAULT_FILTERS); setShowFilterSheet(false) }}
        />
        <SortSheet
          visible={showSortSheet}
          onClose={() => setShowSortSheet(false)}
          options={SORT_OPTIONS}
          activeKey={sortBy}
          onSelect={setSortBy}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing[3],
  },
  backButton: {
    paddingVertical: spacing[2],
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  searchIcon: {
    fontSize: 20,
    color: colors.textMuted,
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    height: '100%',
    paddingVertical: 0,
  },
  spinner: {
    marginLeft: spacing[2],
  },
  clearButton: {
    padding: spacing[1],
    marginLeft: spacing[1],
  },
  clearIcon: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  suggestionsContainer: {
    flex: 1,
    paddingTop: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  recentIcon: {
    fontSize: 16,
    color: colors.textMuted,
    width: 20,
    textAlign: 'center',
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  removeButton: {
    padding: spacing[1],
  },
  removeIcon: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  categoryTileWrap: {
    width: '47%',
  },
  categoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  suggestionLabel: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  suggestionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  suggestionThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.shimmer,
  },
  suggestionCatIcon: {
    fontSize: 16,
    width: 40,
    textAlign: 'center',
    color: colors.textMuted,
  },
  suggestionBrandIcon: {
    fontSize: 16,
    width: 40,
    textAlign: 'center',
  },
  suggestionContent: {
    flex: 1,
    gap: 2,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  suggestionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyTypeahead: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: EDGE_PADDING,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  resultsQuery: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: EDGE_PADDING,
    paddingVertical: spacing[2],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
  },
  filterChipIcon: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipIcon: {
    fontSize: 14,
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  quickFiltersScroll: {
    maxHeight: 48,
  },
  quickFiltersContent: {
    paddingHorizontal: EDGE_PADDING,
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  quickChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  quickChipTextActive: {
    color: colors.white,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: EDGE_PADDING,
    paddingTop: spacing[4],
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[16],
  },
  emptyResultsIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyResultsSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
