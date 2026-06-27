import { useState, useEffect, useRef, useCallback } from 'react'
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
import { useSearchProducts, useCategories, usePrefetchProduct } from '@chinooz/hooks'
import { colors, radii, spacing } from '@chinooz/theme'
import { ProductCard } from '@chinooz/ui'
import type { Product, Category } from '@chinooz/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const MAX_RECENT = 8
const DEBOUNCE_MS = 300
const STAGGER_CAP = 8
const STAGGER_DELAY = 50

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

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const renderTypeaheadItem = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={styles.suggestionRow}
        onPress={() => {
          setQuery(item.name)
          setSubmitted(true)
          persistRecent(item.name)
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <Text style={styles.suggestionIcon}>{'\u2315'}</Text>
        <Text style={styles.suggestionText} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    ),
    [persistRecent],
  )

  const renderResultItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.resultCard}>
        <ProductCard product={item} onPress={handleProductPress} variant="compact" />
      </View>
    ),
    [handleProductPress],
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
          {query.length > 0 && (
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
            <Text style={styles.sectionTitle}>
              {t('search.suggestionsFor', { query: debouncedQuery })}
            </Text>
            {typeaheadLoading ? (
              <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : typeaheadResults && typeaheadResults.length > 0 ? (
              <FlatList
                data={typeaheadResults.slice(0, 8)}
                keyExtractor={item => item.id}
                renderItem={renderTypeaheadItem}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <View style={styles.emptyTypeahead}>
                <Text style={styles.emptyText}>{t('search.noResults')}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {isResults && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.resultsContainer}>
            {resultsLoading ? (
              <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : resultsData && resultsData.length > 0 ? (
              <FlatList
                data={resultsData}
                keyExtractor={item => item.id}
                renderItem={renderResultItem}
                numColumns={2}
                columnWrapperStyle={styles.resultsRow}
                contentContainerStyle={styles.resultsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
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
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  suggestionIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  loadingRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
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
  resultsRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  resultsList: {
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  resultCard: {
    flex: 1,
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
