import { describe, it, expect } from 'vitest'
import { getColors, darkColors } from '@chinooz/theme'
import { tailwindPreset } from '@chinooz/theme/tailwind-preset'
import tailwindConfig from '../tailwind.config'

/**
 * Theme / dark-token wiring smoke test.
 *
 * Requirement 11.3: while the dark theme is active, the Admin Dashboard must
 * resolve all color values from the dark color token set exported by the
 * `@chinooz/theme` design tokens. This verifies the app is wired to the shared
 * tokens (not hard-coded colors) so dark mode resolves correctly, and that the
 * Tailwind design-token preset is applied to the app's Tailwind config.
 *
 * Validates: Requirements 11.3
 */
describe('admin-web theme wiring', () => {
  it('getColors(true) resolves to the exported darkColors token set', () => {
    expect(getColors(true)).toEqual(darkColors)
  })

  it('applies the shared @chinooz/theme Tailwind preset', () => {
    expect(tailwindConfig.presets).toBeDefined()
    expect(tailwindConfig.presets).toContain(tailwindPreset)
  })
})
