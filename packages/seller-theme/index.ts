/**
 * Seller theme package — `@chinooz/theme` re-exported with the Seller emerald
 * palette overriding `colors` / `darkColors` / `getColors`.
 *
 * Why this exists: shared `@chinooz/ui` components (used by buyer, rider AND
 * seller mobile apps) import `@chinooz/theme` directly, so they resolve to the
 * Buyer plum palette. The seller-mobile `metro.config.js` aliases
 * `@chinooz/theme` → `@chinooz/seller-theme` (for every importer except this
 * package itself), so those shared components render in the Seller brand at
 * runtime — with zero per-component changes — while type-checking still uses
 * the real `@chinooz/theme` types (identical shape).
 *
 * The palette itself is defined once in `@chinooz/theme` (`sellerColors` /
 * `sellerOverride` in `packages/theme/tokens.js`), so web and mobile never
 * drift.
 */
import {
  sellerColors,
  sellerDarkColors,
  getSellerColors,
} from '@chinooz/theme'

export const colors = sellerColors
export const darkColors = sellerDarkColors
export const getColors = getSellerColors

// Re-export everything else (spacing, radii, fontFamily, motion, etc.) and the
// seller palette helpers. Local `colors`/`darkColors`/`getColors` above take
// precedence over the star re-export of the same names.
export * from '@chinooz/theme'
