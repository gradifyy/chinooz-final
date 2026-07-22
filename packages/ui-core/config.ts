/**
 * Shared config maps — the single source of truth for variant/size token
 * tables that were previously duplicated in both `ui-web` and `ui`.
 *
 * Each map returns *token names* or *numeric values* that each platform
 * resolves to its own styling system (Tailwind classes or theme numbers).
 *
 * Consumed by the headless hooks in this package.
 */

import type {
  TextVariant,
  FontWeight,
  BadgeVariant,
  BadgeSize,
  AvatarSize,
  RatingSize,
  PriceTextSize,
} from '@chinooz/types/components'

// ─── Text ────────────────────────────────────────────────────────────────

export interface TextVariantConfig {
  fontSizeToken: '3xl' | '2xl' | 'xl' | 'lg' | 'base' | 'sm'
  fontWeight: '400' | '500' | '600' | '700'
}

export const textVariantMap: Record<TextVariant, TextVariantConfig> = {
  h1: { fontSizeToken: '3xl', fontWeight: '700' },
  h2: { fontSizeToken: '2xl', fontWeight: '700' },
  h3: { fontSizeToken: 'xl', fontWeight: '600' },
  h4: { fontSizeToken: 'lg', fontWeight: '600' },
  body: { fontSizeToken: 'base', fontWeight: '400' },
  caption: { fontSizeToken: 'sm', fontWeight: '400' },
  label: { fontSizeToken: 'base', fontWeight: '500' },
}

export const fontWeightMap: Record<FontWeight, '400' | '500' | '600' | '700'> = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

// ─── Avatar ──────────────────────────────────────────────────────────────

export const avatarSizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
}

// ─── Rating ──────────────────────────────────────────────────────────────

export const ratingSizeMap: Record<RatingSize, number> = {
  sm: 14,
  md: 18,
  lg: 24,
}

// ─── PriceText ───────────────────────────────────────────────────────────

export interface PriceTextSizeConfig {
  current: number
  compare: number
}

export const priceTextSizeMap: Record<PriceTextSize, PriceTextSizeConfig> = {
  sm: { current: 14, compare: 11 },
  md: { current: 18, compare: 13 },
  lg: { current: 24, compare: 16 },
}

// ─── Badge ───────────────────────────────────────────────────────────────

export interface BadgeVariantConfig {
  bgToken: string
  textToken: string
}

export const badgeVariantMap: Record<BadgeVariant, BadgeVariantConfig> = {
  primary: { bgToken: 'primary', textToken: 'white' },
  success: { bgToken: 'successLight', textToken: 'success' },
  warning: { bgToken: 'warningLight', textToken: 'warningText' },
  error: { bgToken: 'errorLight', textToken: 'error' },
  info: { bgToken: 'infoLight', textToken: 'info' },
  neutral: { bgToken: 'border', textToken: 'textSecondary' },
  deal: { bgToken: 'gold', textToken: 'text' },
}

export interface BadgeSizeConfig {
  px: number
  py: number
  fontSize: number
}

export const badgeSizeMap: Record<BadgeSize, BadgeSizeConfig> = {
  sm: { px: 6, py: 2, fontSize: 10 },
  md: { px: 8, py: 2, fontSize: 11 },
}

// ─── QuantityStepper ─────────────────────────────────────────────────────

export const QUANTITY_STEPPER_DEFAULTS = {
  min: 1,
  max: 99,
} as const

// ─── A11y label templates ────────────────────────────────────────────────

export const A11Y_LABELS = {
  decreaseQuantity: 'Decrease quantity',
  increaseQuantity: 'Increase quantity',
  avatar: 'Avatar',
  rating: (rating: number, max: number) => `Rating: ${rating} of ${max}`,
  rated: (rating: number, max: number) => `Rated ${rating} of ${max}`,
  setRating: (i: number, max: number) => `Set rating to ${i + 1} of ${max}`,
} as const
