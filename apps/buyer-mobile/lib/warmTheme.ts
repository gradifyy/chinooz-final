/**
 * @deprecated Use `@chinooz/theme` colors (cream / primary / gold) instead.
 * Kept as a thin alias so any lingering imports stay brand-aligned.
 */
import { colors } from '@chinooz/theme'

export const warm = {
  orangeDeep: colors.primaryDark,
  orange: colors.primary,
  orangeLight: colors.primaryLight,
  orange50: colors.primary50,
  orange100: colors.primary50,
  cream: colors.cream,
  creamInk: colors.creamInk,
  gold: colors.gold,
  ink: colors.text,
  inkSecondary: colors.textSecondary,
  inkMuted: colors.textMuted,
  inkTertiary: colors.textTertiary,
  border: colors.border,
  surface: colors.surface,
  error: colors.error,
  success: colors.success,
} as const

export type WarmColor = (typeof warm)[keyof typeof warm]
