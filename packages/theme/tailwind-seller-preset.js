/* eslint-disable @typescript-eslint/no-var-requires */
const { buildPreset } = require('./tailwind-preset')
const { sellerColors, sellerDarkColors, sellerGlows } = require('./tokens')

/**
 * Tailwind preset for the Seller product. Identical structure to the default
 * (Buyer) `tailwindPreset`, but built from the emerald `sellerColors` palette
 * so the entire seller-web app — including shared `@chinooz/ui-web` components
 * that read `bg-primary` / `text-primary` — renders in the Seller brand.
 *
 * Single source of truth: the palette lives in `./tokens` (`sellerOverride`)
 * and is re-exported from `@chinooz/theme` as `sellerColors`, so web and
 * mobile never drift.
 */
const tailwindSellerPreset = buildPreset({ colors: sellerColors, glows: sellerGlows })

module.exports = { tailwindSellerPreset, sellerColors, sellerDarkColors }
