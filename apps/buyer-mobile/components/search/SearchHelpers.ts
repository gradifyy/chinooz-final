import React, { useState, useEffect, useRef } from 'react'
import { Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut, FadeInDown, SlideInDown, Easing } from 'react-native-reanimated'
import { colors as lightColors, radii, spacing, duration, easing, fontSz } from '@chinooz/theme'
import type { IconName } from '../Icon'

export interface FilterState {
  priceMin: number
  priceMax: number
  minRating: number
  brands: Set<string>
  inStock: boolean
  onSale: boolean
}
export interface SortOption {
  key: string
  labelKey: string
}

export const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

const { width: SCREEN_WIDTH } = Dimensions.get('window')
export const EDGE_PADDING = 16
export const GAP = 12
export const DEBOUNCE_MS = 250
export const STAGGER_CAP = 10
export const STAGGER_MS = 50

const SPRING = { damping: 18, stiffness: 300, mass: 0.8 }

export function motion(reduced: boolean) {
  return {
    fadeIn: (d: number = duration.normal) => (reduced ? FadeIn.duration(0) : FadeIn.duration(d)),
    fadeInDown: (d: number = duration.normal) =>
      reduced
        ? FadeInDown.duration(0)
        : FadeInDown.duration(d).easing(Easing.bezier(...easing.spring)),
    fadeOut: (d: number = duration.fast) => (reduced ? FadeOut.duration(0) : FadeOut.duration(d)),
    slideInDown: () =>
      reduced
        ? SlideInDown.duration(0)
        : SlideInDown.duration(duration.normal).easing(Easing.bezier(...easing.spring)),
    staggerItem(index: number) {
      const delay = reduced ? 0 : Math.min(index, STAGGER_CAP) * STAGGER_MS
      return reduced
        ? FadeInDown.duration(0)
        : FadeInDown.duration(duration.normal)
            .easing(Easing.bezier(...easing.spring))
            .delay(delay)
    },
    springIn(index: number) {
      const delay = reduced ? 0 : Math.min(index, STAGGER_CAP) * STAGGER_MS
      return reduced
        ? FadeInDown.duration(0)
        : FadeInDown.duration(duration.normal).delay(delay).springify().damping(SPRING.damping)
    },
  }
}

export const SORT_OPTIONS: SortOption[] = [
  { key: 'relevance', labelKey: 'categories.relevance' },
  { key: 'priceLow', labelKey: 'categories.priceLowHigh' },
  { key: 'priceHigh', labelKey: 'categories.priceHighLow' },
  { key: 'rating', labelKey: 'categories.rating' },
  { key: 'newest', labelKey: 'categories.newest' },
  { key: 'popular', labelKey: 'categories.mostPopular' },
]

export const QUICK_FILTERS = [
  { key: 'onSale', labelKey: 'categories.onSale' },
  { key: 'topRated', labelKey: 'categories.topRated' },
  { key: 'inStock', labelKey: 'categories.inStock' },
]

export const DEFAULT_FILTERS: FilterState = {
  priceMin: 0,
  priceMax: 999999,
  minRating: 0,
  brands: new Set(),
  inStock: false,
  onSale: false,
}

export function getGridColumns() {
  const w = SCREEN_WIDTH - EDGE_PADDING * 2
  if (w >= 1024) return 5
  if (w >= 768) return 4
  if (w >= 640) return 3
  return 2
}

export function getGridItemWidth(columns: number) {
  return (SCREEN_WIDTH - EDGE_PADDING * 2 - GAP * (columns - 1)) / columns
}

export function useCountUp(target: number, duration = 200): number {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (target === 0) {
      setDisplay(0)
      return
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])
  return display
}

export const POPULAR_TERMS = ['Headphones', 'Shoes', 'T-shirt', 'Backpack', 'Watch', 'Sunglasses']

export function getDidYouMean(query: string): string | null {
  if (!query || query.length < 2) return null
  const q = query.toLowerCase()
  for (const term of POPULAR_TERMS) {
    const t = term.toLowerCase()
    if (t.includes(q) || q.includes(t)) continue
    let diff = 0
    const len = Math.min(q.length, t.length)
    for (let i = 0; i < len; i++) {
      if (q[i] !== t[i]) diff++
    }
    if (diff <= 2 && Math.abs(q.length - t.length) <= 2) return term
  }
  return null
}

// Per-category tint colors for the popular-categories grid. These are
// category-attribute data colors (one distinct hue per category), not
// @chinooz/theme brand tokens — they're intentionally outside the semantic
// palette so each category reads as visually distinct.
// eslint-disable-next-line no-restricted-syntax
export const POPULAR_CATEGORIES: {
  id: string
  name: string
  icon: IconName
  tint: string
  bg: string
}[] = [
  {
    id: 'cat-electronics',
    name: 'Electronics',
    icon: 'phone-portrait-outline',
    tint: '#2563EB',
    bg: '#EAF1FE',
  },
  { id: 'cat-fashion', name: 'Fashion', icon: 'shirt-outline', tint: '#DB2777', bg: '#FCE9F2' },
  { id: 'cat-home', name: 'Home', icon: 'home-outline', tint: '#D97706', bg: '#FCEFD7' },
  { id: 'cat-beauty', name: 'Beauty', icon: 'sparkles-outline', tint: '#7C3AED', bg: '#F2E9FD' },
  { id: 'cat-grocery', name: 'Grocery', icon: 'basket-outline', tint: '#059669', bg: '#DEF5EC' },
  { id: 'cat-sports', name: 'Sports', icon: 'basketball-outline', tint: '#EA580C', bg: '#FCEADF' },
]

/** Map a deep-link `sort` param (e.g. from "See all" rails) to a sort key the grid understands. */
export function mapSortParam(sort: string): string {
  switch (sort) {
    case 'trending':
    case 'recommended':
    case 'popular':
      return 'popular'
    case 'recent':
    case 'newest':
      return 'newest'
    case 'priceLow':
    case 'priceHigh':
    case 'rating':
    case 'relevance':
      return sort
    default:
      return 'relevance'
  }
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function highlightMatch(
  text: string,
  query: string,
  highlightColor?: string,
): React.ReactNode {
  if (!query || query.length < 2) return text
  const idx = text.normalize('NFC').toLowerCase().indexOf(query.normalize('NFC').toLowerCase())
  if (idx === -1) return text
  return React.createElement(
    Text,
    null,
    text.slice(0, idx),
    React.createElement(
      Text,
      { style: { color: highlightColor ?? lightColors.primary, fontWeight: '600' } },
      text.slice(idx, idx + query.length),
    ),
    text.slice(idx + query.length),
  )
}

export const makeStyles = (c: typeof lightColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FCFBF9',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: '#FCFBF9',
      gap: spacing[3],
    },
    backButton: {
      paddingVertical: spacing[2],
    },
    backText: {
      fontSize: fontSz('md')[0],
      fontWeight: '600',
      color: c.primary,
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing[3],
      height: 48,
    },
    inputWrapFocused: {
      borderColor: c.primary,
      borderWidth: 2,
    },
    searchIcon: {
      fontSize: fontSz('xl')[0],
      color: c.textMuted,
      marginRight: spacing[2],
    },
    input: {
      flex: 1,
      fontSize: fontSz('md')[0],
      fontWeight: '400',
      color: c.text,
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
      fontSize: fontSz('lg')[0],
      color: c.textMuted,
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
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      marginBottom: spacing[3],
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing[4],
      marginBottom: spacing[3],
    },
    sectionTitleInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionLabel: {
      fontSize: fontSz('sm')[0],
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 0.5,
      paddingHorizontal: spacing[4],
      marginBottom: spacing[2],
    },
    clearAllText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.primary,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      gap: spacing[3],
    },
    recentIcon: {
      fontSize: fontSz('md')[0],
      color: c.textMuted,
      width: 20,
      textAlign: 'center',
    },
    recentText: {
      flex: 1,
      fontSize: fontSz('md')[0],
      fontWeight: '400',
      color: c.text,
    },
    removeButton: {
      padding: spacing[1],
    },
    removeIcon: {
      fontSize: fontSz('md')[0],
      color: c.textMuted,
      fontWeight: '600',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing[4],
      gap: 6,
    },
    chip: {
      backgroundColor: c.primary50,
      borderRadius: radii.full,
      paddingHorizontal: spacing[4],
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: c.primary50,
    },
    chipText: {
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.primary,
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
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      gap: spacing[3],
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    categoryIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryName: {
      flex: 1,
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.text,
    },
    suggestionLabel: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    suggestionLabelText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.textMuted,
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
      backgroundColor: c.shimmer,
    },
    suggestionCatIcon: {
      fontSize: fontSz('md')[0],
      width: 40,
      textAlign: 'center',
      color: c.textMuted,
    },
    suggestionBrandIcon: {
      fontSize: fontSz('md')[0],
      width: 40,
      textAlign: 'center',
    },
    suggestionContent: {
      flex: 1,
      gap: 2,
    },
    suggestionName: {
      fontSize: fontSz('md')[0],
      fontWeight: '400',
      color: c.text,
    },
    suggestionPrice: {
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.textMuted,
      fontVariant: ['tabular-nums'],
    },
    highlightText: {
      color: c.primary,
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
      fontSize: fontSz('base')[0],
      color: c.textMuted,
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
      fontSize: fontSz('md')[0],
      fontWeight: '600',
      color: c.text,
    },
    resultsCount: {
      fontSize: fontSz('sm')[0],
      fontWeight: '400',
      color: c.textMuted,
      marginTop: 2,
    },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: EDGE_PADDING,
      paddingVertical: spacing[2],
      gap: spacing[2],
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primary50,
    },
    filterChipIcon: {
      fontSize: fontSz('base')[0],
    },
    filterChipText: {
      fontSize: fontSz('base')[0],
      fontWeight: '500',
      color: c.text,
    },
    filterChipTextActive: {
      color: c.primary,
    },
    filterBadge: {
      backgroundColor: c.primary,
      borderRadius: radii.md,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      marginLeft: 2,
    },
    filterBadgeText: {
      color: c.white,
      fontSize: fontSz('xs')[0],
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
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    sortChipIcon: {
      fontSize: fontSz('base')[0],
    },
    sortChipText: {
      fontSize: fontSz('base')[0],
      fontWeight: '500',
      color: c.text,
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
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    quickChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    quickChipText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '500',
      color: c.text,
    },
    quickChipTextActive: {
      color: c.white,
    },
    activeChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: EDGE_PADDING,
      paddingVertical: spacing[2],
      gap: spacing[2],
      alignItems: 'center',
    },
    activeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: radii.full,
      backgroundColor: c.primary50,
    },
    activeChipText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '500',
      color: c.primary,
    },
    activeChipX: {
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.primary,
    },
    clearFiltersBtn: {
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
    },
    clearFiltersText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.textMuted,
    },
    skeletonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GAP,
      paddingHorizontal: EDGE_PADDING,
      paddingTop: spacing[4],
    },
    skeletonCard: {
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      overflow: 'hidden',
    },
    skeletonBody: {
      padding: spacing[3],
      gap: spacing[2],
    },
    suggestionSkeletons: {
      paddingTop: spacing[4],
      paddingHorizontal: spacing[4],
    },
    suggestionSkeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[3],
    },
    suggestionSkeletonContent: {
      flex: 1,
      gap: spacing[2],
    },
    errorState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[8],
      paddingVertical: spacing[16],
      gap: spacing[3],
    },
    errorIcon: {
      fontSize: fontSz('display')[0],
      marginBottom: spacing[2],
    },
    errorTitle: {
      fontSize: fontSz('lg')[0],
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
    },
    errorSubtitle: {
      fontSize: fontSz('base')[0],
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      marginTop: spacing[2],
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[2.5],
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    retryText: {
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.primary,
    },
    didYouMeanBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: EDGE_PADDING,
      paddingVertical: spacing[3],
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    didYouMeanLabel: {
      fontSize: fontSz('base')[0],
      fontWeight: '500',
      color: c.textMuted,
    },
    didYouMeanTerm: {
      fontSize: fontSz('base')[0],
      fontWeight: '500',
      color: c.primary,
      textDecorationLine: 'underline',
    },
    emptyScrollContent: {
      paddingBottom: spacing[16],
    },
    emptyStateWrap: {
      alignItems: 'center',
      paddingHorizontal: spacing[8],
      paddingTop: spacing[10],
      gap: spacing[3],
    },
    emptyIllustration: {
      width: 96,
      height: 96,
      borderRadius: radii.full,
      backgroundColor: c.primary50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[2],
    },
    emptyIllustrationIcon: {
      fontSize: fontSz('display')[0],
    },
    emptyTitle: {
      fontSize: fontSz('md')[0],
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
    },
    clearFiltersOutlineBtn: {
      marginTop: spacing[2],
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[2.5],
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    clearFiltersOutlineText: {
      fontSize: fontSz('base')[0],
      fontWeight: '600',
      color: c.primary,
    },
    emptyRecovery: {
      paddingTop: spacing[6],
      paddingHorizontal: EDGE_PADDING,
    },
    emptyRecoveryTitle: {
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 0.5,
      marginBottom: spacing[3],
    },
    emptyRecoveryChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    emptyChip: {
      paddingHorizontal: spacing[3],
      paddingVertical: 8,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.surface,
    },
    emptyChipText: {
      fontSize: fontSz('sm')[0],
      fontWeight: '500',
      color: c.primary,
    },
    emptyCategoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[3],
    },
    emptyCategoryTileWrap: {
      width: '47%',
    },
    emptyCategoryTile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: radii.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      gap: spacing[2],
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyCategoryIcon: {
      fontSize: fontSz('3xl')[0],
    },
    emptyCategoryName: {
      flex: 1,
      fontSize: fontSz('sm')[0],
      fontWeight: '600',
      color: c.text,
    },
  })
