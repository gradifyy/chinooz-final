import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Cross-library contract test (Phase 3 audit §A.2).
 *
 * `@chinooz/ui-web` (DOM) and `@chinooz/ui` (React Native) intentionally
 * duplicate a core set of same-named components. They are allowed to carry
 * platform-specific extras, but the shared core — and the shared prop-type
 * surface in `@chinooz/types/components` — must not drift silently.
 *
 * This test parses the index files statically (no RN runtime import) so it
 * runs in jsdom without pulling in react-native.
 */

function readExports(relPath: string): Set<string> {
  const file = readFileSync(resolve(__dirname, relPath), 'utf8')
  const names = new Set<string>()
  // Matches: export { default as Foo } / export { Foo, Bar } / export { default as A, B }
  const exportBlock = /export\s*\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = exportBlock.exec(file))) {
    for (const part of m[1].split(',')) {
      const token = part.trim()
      if (!token) continue
      // `default as Foo` -> Foo ; `Foo` -> Foo
      const asMatch = token.match(/(?:default\s+as\s+)?([A-Za-z0-9_]+)$/)
      if (asMatch) names.add(asMatch[1])
    }
  }
  return names
}

function readTypeNames(relPath: string): string[] {
  const file = readFileSync(resolve(__dirname, relPath), 'utf8')
  const names = new Set<string>()
  const re = /export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(file))) names.add(m[1])
  return Array.from(names).sort()
}

const webExports = readExports('../index.ts')
const nativeExports = readExports('../../ui/index.ts')

// The components that form the shared cross-platform contract. Both libraries
// must export every one of these. (Platform-specific extras are allowed.)
const SHARED_COMPONENTS = [
  'Text', 'Heading', 'Button', 'IconButton', 'Input', 'SearchBar', 'Card',
  'Badge', 'Chip', 'Avatar', 'Divider', 'Skeleton', 'Spinner', 'Modal',
  'Toast', 'Tabs', 'SegmentedControl', 'Rating', 'PriceText', 'QuantityStepper',
  'EmptyState', 'ReviewCard', 'Screen', 'Container', 'Stack', 'Row', 'Grid',
  'Section', 'ProductGrid', 'ProductCard', 'OrderCard', 'OrderStatusTimeline',
  'CartItem', 'CartSummary', 'AddedToCart', 'ErrorBoundary', 'SafeImage',
  'InventoryRow', 'BulkBar', 'StockHistorySheet', 'LowStockAlerts',
  'useReducedMotion',
] as const

describe('ui-web / ui cross-library contract', () => {
  it.each(SHARED_COMPONENTS)('"%s" is exported by both ui-web and ui', name => {
    expect(webExports.has(name), `@chinooz/ui-web missing "${name}"`).toBe(true)
    expect(nativeExports.has(name), `@chinooz/ui missing "${name}"`).toBe(true)
  })

  it('shared prop-type surface in @chinooz/types/components is stable', () => {
    // Both libraries implement these prop types. Adding/removing one should be
    // a deliberate, reviewed change (update the snapshot intentionally).
    expect(readTypeNames('../../types/components.ts')).toMatchSnapshot()
  })
})
