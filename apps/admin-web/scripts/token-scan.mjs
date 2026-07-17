#!/usr/bin/env node
/**
 * Design-system token-scan wrapper for admin-web.
 *
 * The canonical scanner lives in `@chinooz/config/token-scan.mjs` so every
 * app can share it. This thin wrapper re-exports its internals (so the
 * compliance test at `__tests__/design-system-compliance.test.ts` can keep
 * importing from `../scripts/token-scan.mjs`) and invokes it with admin-web's
 * scan dirs when run directly.
 *
 * admin-web is the reference app — it is fully clean, so its scan is wired
 * into the blocking `lint` script (`node scripts/token-scan.mjs && next lint`).
 */
import { pathToFileURL } from 'node:url'

// Re-export internals for the compliance test.
export { stripComments, scanFile, ALLOWED_FONT_FAMILIES, ACCESSOR_TOKEN_SETS } from '@chinooz/config/token-scan.mjs'

// When invoked directly (via `lint`), run the shared scanner against
// admin-web's app + components.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  process.env.SCAN_DIRS = process.env.SCAN_DIRS || 'app,components'
  await import('@chinooz/config/token-scan.mjs')
}
