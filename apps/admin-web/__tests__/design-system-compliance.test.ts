import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getColors, darkColors } from '@chinooz/theme'

import {
  scanFile,
  ACCESSOR_TOKEN_SETS,
  type TokenScanViolation,
} from '../scripts/token-scan.mjs'

/**
 * Design-system compliance tests (Admin Dashboard — Requirement 11).
 *
 * Two concerns are covered, per the design "Smoke / Build-Time Checks" section
 * (these are example/integration assertions, not input-varying logic):
 *
 *  - The token-literal scan flags planted violations across every category and
 *    leaves design-system-compliant code (and literals that appear only in
 *    comments) untouched (Req 11.2, 11.4).
 *  - Dark rendering resolves color values from the dark token set (Req 11.3).
 *
 * Validates: Requirements 11.2, 11.3, 11.4
 */

// A valid color token name that the theme genuinely exports, and an unknown
// one it does not — verified against the exported accessor set so the test
// stays in lockstep with the tokens.
const VALID_COLOR_TOKEN = 'primary'
const UNKNOWN_COLOR_TOKEN = 'notARealToken'

describe('token-scan accessor set sanity', () => {
  it('exports a color accessor set containing the valid token but not the unknown one', () => {
    expect(ACCESSOR_TOKEN_SETS.color.has(VALID_COLOR_TOKEN)).toBe(true)
    expect(ACCESSOR_TOKEN_SETS.color.has(UNKNOWN_COLOR_TOKEN)).toBe(false)
  })
})

describe('token-literal scan flags planted violations (Req 11.2, 11.4)', () => {
  let tmpDir: string

  const fixture = (name: string, contents: string): string => {
    const path = join(tmpDir, name)
    writeFileSync(path, contents, 'utf8')
    return path
  }

  const scan = (path: string): TokenScanViolation[] => {
    const violations: TokenScanViolation[] = []
    scanFile(path, violations)
    return violations
  }

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ds-compliance-'))
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('flags every category in a planted-violation fixture', () => {
    const path = fixture(
      'planted-violations.tsx',
      [
        'const styles = {',
        "  color: '#abcdef',",
        "  background: 'rgba(0, 0, 0, 0.5)',",
        "  padding: '16px',",
        "  fontFamily: 'Comic Sans MS',",
        '}',
        `const c = color('${UNKNOWN_COLOR_TOKEN}')`,
        'export { styles, c }',
      ].join('\n')
    )

    const violations = scan(path)
    const messages = violations.map((v) => v.message)

    expect(violations.length).toBeGreaterThan(0)
    // Hex color literal (Req 11.2)
    expect(messages.some((m) => /hex color literal/i.test(m))).toBe(true)
    // rgb/rgba/hsl/hsla color function (Req 11.2)
    expect(messages.some((m) => /color function string/i.test(m))).toBe(true)
    // Raw px/rem dimension (Req 11.2)
    expect(messages.some((m) => /Raw dimension literal/i.test(m))).toBe(true)
    // Non-theme font family (Req 11.2)
    expect(
      messages.some((m) => /Non-@chinooz\/theme font family/i.test(m))
    ).toBe(true)
    // Unknown token name passed to an accessor, with no fallback (Req 11.4)
    const unknownTokenViolation = violations.find((v) =>
      /Unknown @chinooz\/theme token/i.test(v.message)
    )
    expect(unknownTokenViolation).toBeDefined()
    expect(unknownTokenViolation?.message).toContain(UNKNOWN_COLOR_TOKEN)
    expect(unknownTokenViolation?.snippet).toContain(UNKNOWN_COLOR_TOKEN)
  })

  it('reports zero violations for design-system-compliant code', () => {
    const path = fixture(
      'clean.tsx',
      [
        "const className = 'bg-primary p-4 rounded-md text-base'",
        `const c = color('${VALID_COLOR_TOKEN}')`,
        'export { className, c }',
      ].join('\n')
    )

    expect(scan(path)).toEqual([])
  })

  it('does not flag literals that appear only inside comments', () => {
    const path = fixture(
      'comments-only.tsx',
      [
        '// Hard-coded #ffffff, 12px, and rgba(0, 0, 0, 0.5) mentioned in a comment',
        `/* fontFamily: 'Comic Sans MS' and color('${UNKNOWN_COLOR_TOKEN}') */`,
        "const ok = 'bg-primary'",
        'export { ok }',
      ].join('\n')
    )

    expect(scan(path)).toEqual([])
  })
})

describe('dark rendering resolves dark-set token values (Req 11.3)', () => {
  it('getColors(true) deep-equals the exported darkColors token set', () => {
    expect(getColors(true)).toEqual(darkColors)
  })

  it('resolves a representative color key to its dark-set value', () => {
    const resolved = getColors(true)
    // `background` is defined in the dark token set; confirm the active dark
    // value is sourced from darkColors rather than the light default.
    expect(resolved.background).toBe(darkColors.background)
    expect(resolved.surface).toBe(darkColors.surface)
    expect(resolved.text).toBe(darkColors.text)
  })
})
