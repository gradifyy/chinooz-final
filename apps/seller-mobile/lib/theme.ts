/**
 * Seller-only theme.
 *
 * Re-exports the shared `@chinooz/theme` package with the Seller brand palette
 * (emerald/teal, distinct from the Buyer plum identity) applied. The palette
 * itself is defined once in `@chinooz/theme` (`sellerColors` /
 * `sellerOverride`) so web (`tailwind-seller-preset`) and mobile never drift —
 * tweak the brand in `packages/theme/tokens.js` and both apps update.
 *
 * Usage in seller screens/components:
 *   import { colors, spacing, sellerFont } from '../lib/theme'   // NOT '@chinooz/theme'
 *
 * NOTE: shared `@chinooz/ui` components import `@chinooz/theme` directly and
 * therefore resolve to the Buyer plum palette. Seller-specific code should
 * import from `../lib/theme` to get the Seller emerald palette.
 */
import {
  sellerColors,
  sellerDarkColors,
  getSellerColors,
} from '@chinooz/theme'

export const colors = sellerColors
export const darkColors = sellerDarkColors
export const getColors = getSellerColors

/** Soft sage surface tokens behind onboarding/auth screens (kept for callers
 *  that import `sellerSurface` directly). Values mirror the shared palette. */
export const sellerSurface = {
  cream: sellerColors.cream,
  inkOnBrand: sellerColors.inkOnBrand,
  whiteAlpha25: sellerColors.whiteAlpha25,
} as const

/**
 * Seller typography. Sora (geometric display) for headings/numerals; the shared
 * Inter tokens (via fontFamily.*) stay for body/labels. Distinct from buyer's
 * Fraunces serif headings.
 */
export const sellerFont = {
  display: 'Sora-ExtraBold',
  displayBold: 'Sora-Bold',
  displaySemi: 'Sora-SemiBold',
} as const

/**
 * Per-slide 4-stop vertical gradients for the onboarding hue-morph
 * (graphite ink, deepening per slide).
 */
export const sellerGradients: readonly (readonly [string, string, string, string])[] = [
  ['#1C1B1F', 'rgba(28,27,31,0.82)', 'rgba(28,27,31,0.30)', 'rgba(28,27,31,0)'],
  ['#38353D', 'rgba(56,53,61,0.82)', 'rgba(56,53,61,0.30)', 'rgba(56,53,61,0)'],
  ['#100F12', 'rgba(16,15,18,0.82)', 'rgba(16,15,18,0.30)', 'rgba(16,15,18,0)'],
]

// Pass everything else through unchanged (spacing, radii, fontFamily, easing, etc.).
// Local `colors`/`darkColors`/`getColors` above take precedence over the star
// re-export of the same names.
export * from '@chinooz/theme'
