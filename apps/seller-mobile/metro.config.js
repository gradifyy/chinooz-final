/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

/**
 * Seller brand alias: redirect `@chinooz/theme` → `@chinooz/seller-theme` so
 * shared `@chinooz/ui` components (which import `@chinooz/theme` directly and
 * are also used by the buyer & rider apps) render in the Seller emerald brand
 * inside this app. `@chinooz/seller-theme` itself imports the real
 * `@chinooz/theme`, so the redirect is skipped for modules inside it (no
 * infinite loop). Type-checking is unaffected — tsc resolves `@chinooz/theme`
 * normally; the seller palette has the same type shape.
 */
let sellerThemeEntry = ''
try {
  sellerThemeEntry = require.resolve('@chinooz/seller-theme')
} catch {
  // Dependency not installed yet (e.g. fresh clone before `pnpm install`).
  // Fall back to default resolution — the app still works in buyer plum.
}
const sellerThemeDir = sellerThemeEntry ? path.dirname(sellerThemeEntry) : ''

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (sellerThemeDir && moduleName === '@chinooz/theme') {
    const origin = context.originModulePath || ''
    if (!origin.startsWith(sellerThemeDir)) {
      return { type: 'sourceFile', filePath: sellerThemeEntry }
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
