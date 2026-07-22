/**
 * Headless behavior hooks for shared UI primitives.
 *
 * Each hook returns plain state + handlers + derived values + a11y props —
 * zero JSX, zero styling. Both `ui-web` and `ui` consume these and spread
 * the return onto their platform-specific render element.
 *
 * Convention (matching `useVariantGroups`, `useOrderActions`):
 *   hooks return `{ state, handlers, derived, a11y }` with no render.
 */

import { useCallback, useMemo } from 'react'
import { formatNPR, getInitials } from '@chinooz/utils'
import type {
  TextVariant,
  FontWeight,
  QuantityStepperProps,
  RatingProps,
  PriceTextProps,
  AvatarProps,
  BadgeProps,
} from '@chinooz/types/components'
import {
  textVariantMap,
  fontWeightMap,
  avatarSizeMap,
  ratingSizeMap,
  priceTextSizeMap,
  badgeVariantMap,
  badgeSizeMap,
  QUANTITY_STEPPER_DEFAULTS,
  A11Y_LABELS,
} from './config'

// ─── useTextStyle ─────────────────────────────────────────────────────────

export interface UseTextStyleInput {
  variant?: TextVariant
  weight?: FontWeight
  color?: string
  align?: 'left' | 'center' | 'right'
  numberOfLines?: number
}

export interface TextStyleResult {
  fontSizeToken: string
  fontWeight: '400' | '500' | '600' | '700'
  color: string | undefined
  textAlign: 'left' | 'center' | 'right' | undefined
  numberOfLines: number | undefined
}

export function useTextStyle(input: UseTextStyleInput): TextStyleResult {
  const variant = input.variant ?? 'body'
  const config = textVariantMap[variant]
  return useMemo(() => ({
    fontSizeToken: config.fontSizeToken,
    fontWeight: input.weight ? fontWeightMap[input.weight] : config.fontWeight,
    color: input.color,
    textAlign: input.align,
    numberOfLines: input.numberOfLines,
  }), [config, input.weight, input.color, input.align, input.numberOfLines])
}

// ─── useQuantityStepper ───────────────────────────────────────────────────

export interface UseQuantityStepperInput {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  disabled?: boolean
}

export interface QuantityStepperResult {
  atMin: boolean
  atMax: boolean
  decDisabled: boolean
  incDisabled: boolean
  decrement: () => void
  increment: () => void
  decA11yLabel: string
  incA11yLabel: string
}

export function useQuantityStepper(input: UseQuantityStepperInput): QuantityStepperResult {
  const min = input.min ?? QUANTITY_STEPPER_DEFAULTS.min
  const max = input.max ?? QUANTITY_STEPPER_DEFAULTS.max
  const atMin = input.value <= min
  const atMax = input.value >= max

  const decrement = useCallback(() => {
    if (!atMin && !input.disabled) input.onChange(input.value - 1)
  }, [atMin, input.disabled, input.onChange, input.value])

  const increment = useCallback(() => {
    if (!atMax && !input.disabled) input.onChange(input.value + 1)
  }, [atMax, input.disabled, input.onChange, input.value])

  return {
    atMin,
    atMax,
    decDisabled: atMin || !!input.disabled,
    incDisabled: atMax || !!input.disabled,
    decrement,
    increment,
    decA11yLabel: A11Y_LABELS.decreaseQuantity,
    incA11yLabel: A11Y_LABELS.increaseQuantity,
  }
}

// ─── useRating ────────────────────────────────────────────────────────────

export interface UseRatingInput {
  rating: number
  maxStars?: number
  interactive?: boolean
  onChange?: (value: number) => void
}

export interface StarState {
  filled: boolean
  half: boolean
  color: 'gold' | 'border'
  opacity: number
  isChecked: boolean
  a11yLabel: string
  onPress: () => void
}

export interface RatingResult {
  stars: StarState[]
  containerRole: 'radiogroup' | 'img'
  containerLabel: string
  valueLabel: string
}

export function useRating(input: UseRatingInput): RatingResult {
  const maxStars = input.maxStars ?? 5
  const interactive = !!input.interactive

  const stars: StarState[] = useMemo(() => {
    return Array.from({ length: maxStars }).map((_, i) => {
      const filled = i < Math.floor(input.rating)
      const half = !filled && i < input.rating
      return {
        filled,
        half,
        color: (filled || half ? 'gold' : 'border') as 'gold' | 'border',
        opacity: half ? 0.5 : 1,
        isChecked: i < Math.round(input.rating),
        a11yLabel: A11Y_LABELS.setRating(i, maxStars),
        onPress: () => {
          if (interactive) input.onChange?.(i + 1)
        },
      }
    })
  }, [input.rating, maxStars, interactive, input.onChange])

  return {
    stars,
    containerRole: interactive ? 'radiogroup' : 'img',
    containerLabel: interactive
      ? A11Y_LABELS.rating(input.rating, maxStars)
      : A11Y_LABELS.rated(input.rating, maxStars),
    valueLabel: input.rating.toFixed(1),
  }
}

// ─── usePriceText ─────────────────────────────────────────────────────────

export interface UsePriceTextInput {
  price: number
  compareAtPrice?: number
  variant?: 'default' | 'deal' | 'muted'
  size?: 'sm' | 'md' | 'lg'
}

export interface PriceTextResult {
  formattedPrice: string
  formattedCompare: string
  isDeal: boolean
  hasDiscount: boolean
  discountLabel: string
  currentSize: number
  compareSize: number
  currentColorToken: string
  compareColorToken: string
  discountColorToken: string
}

export function usePriceText(input: UsePriceTextInput): PriceTextResult {
  const size = input.size ?? 'md'
  const sz = priceTextSizeMap[size]
  const isDeal = input.variant === 'deal'
  const hasDiscount = !!input.compareAtPrice && input.compareAtPrice > input.price
  const discountPct = hasDiscount
    ? Math.round((1 - input.price / input.compareAtPrice!) * 100)
    : 0

  return useMemo(() => ({
    formattedPrice: formatNPR(input.price),
    formattedCompare: input.compareAtPrice ? formatNPR(input.compareAtPrice) : '',
    isDeal,
    hasDiscount,
    discountLabel: hasDiscount ? `${discountPct}% OFF` : '',
    currentSize: sz.current,
    compareSize: sz.compare,
    currentColorToken: isDeal ? 'primary' : 'text',
    compareColorToken: 'textMuted',
    discountColorToken: 'success',
  }), [input.price, input.compareAtPrice, isDeal, hasDiscount, discountPct, sz])
}

// ─── useAvatar ────────────────────────────────────────────────────────────

export interface UseAvatarInput {
  source?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: React.ReactNode
}

export interface AvatarResult {
  dimension: number
  initials: string
  a11yLabel: string
  showImage: boolean
  showFallback: boolean
  showInitials: boolean
  initialsFontSize: number
}

export function useAvatar(input: UseAvatarInput): AvatarResult {
  const size = input.size ?? 'md'
  const dimension = avatarSizeMap[size]
  const safeName = typeof input.name === 'string' ? input.name : ''
  const initials = getInitials(safeName)
  const showImage = !!input.source
  const showFallback = !showImage && !!input.fallback
  const showInitials = !showImage && !showFallback

  return useMemo(() => ({
    dimension,
    initials,
    a11yLabel: safeName || A11Y_LABELS.avatar,
    showImage,
    showFallback,
    showInitials,
    initialsFontSize: Math.round(dimension * 0.35),
  }), [dimension, initials, safeName, showImage, showFallback])
}

// ─── useBadgeStyle ────────────────────────────────────────────────────────

export interface UseBadgeStyleInput {
  variant?: BadgeProps['variant']
  size?: BadgeProps['size']
}

export interface BadgeStyleResult {
  bgToken: string
  textToken: string
  px: number
  py: number
  fontSize: number
}

export function useBadgeStyle(input: UseBadgeStyleInput): BadgeStyleResult {
  const variant = input.variant ?? 'primary'
  const size = input.size ?? 'md'
  const v = badgeVariantMap[variant]
  const sz = badgeSizeMap[size]

  return useMemo(() => ({
    bgToken: v.bgToken,
    textToken: v.textToken,
    px: sz.px,
    py: sz.py,
    fontSize: sz.fontSize,
  }), [v, sz])
}

// ─── useSegmentedControl ──────────────────────────────────────────────────

export interface SegmentItem {
  key: string
  label: string
  badge?: number
}

export interface UseSegmentedControlInput {
  segments: SegmentItem[]
  activeKey: string
  onChange: (key: string) => void
}

export interface SegmentState {
  isActive: boolean
  showBadge: boolean
  badgeLabel: string
  a11ySelected: boolean
}

export interface SegmentedControlResult {
  activeIndex: number
  getSegmentState: (index: number) => SegmentState
}

export function useSegmentedControl(input: UseSegmentedControlInput): SegmentedControlResult {
  const activeIndex = useMemo(
    () => input.segments.findIndex(s => s.key === input.activeKey),
    [input.segments, input.activeKey],
  )

  const getSegmentState = useCallback((index: number): SegmentState => {
    const seg = input.segments[index]
    const isActive = seg.key === input.activeKey
    const badge = seg.badge ?? 0
    return {
      isActive,
      showBadge: badge > 0,
      badgeLabel: badge > 99 ? '99+' : String(badge),
      a11ySelected: isActive,
    }
  }, [input.segments, input.activeKey])

  return { activeIndex, getSegmentState }
}
