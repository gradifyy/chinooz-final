#!/usr/bin/env node
/**
 * Design-system compliance scan — shared across all apps/packages.
 *
 * Walks source files under the configured scan dirs (recursively, `.ts`/
 * `.tsx` only) and FAILS (exit code 1) on any of the following hard-coded
 * literals or unsourced values, so that 100% of color / spacing / radius /
 * typography values are sourced from named `@chinooz/theme` tokens:
 *
 *   1. Hex color strings           — `#fff`, `#ffffff`, `#ffffffff`
 *   2. Color function strings      — `rgb()`, `rgba()`, `hsl()`, `hsla()`
 *   3. Raw dimension literals      — `<n>px` / `<n>rem` / `<n>em` / `<n>pt`
 *                                    (in style props, style objects, or
 *                                     Tailwind arbitrary `-[…]` class values)
 *   4. Non-`@chinooz/theme` fonts  — `fontFamily` / `font-family` / `font-[…]`
 *                                    referencing a family the theme does not export
 *
 * It additionally enforces that a `@chinooz/theme` token accessor
 * (`color()`, `space()`, `radius()`, `font()`, `fontSz()`) referencing a token
 * name the theme does NOT export fails the build with the missing token name —
 * it must never silently substitute a hard-coded fallback.
 *
 * Comments are stripped (string-aware) before scanning so that documentation
 * mentioning units or colors does not produce false positives. The script
 * exits 0 when the scanned tree is clean.
 *
 * Configuration:
 *   - SCAN_DIRS  — comma-separated list of dirs to scan, relative to the
 *                  consuming app's root (cwd). Defaults to `app,components`.
 *                  Set via env var, e.g. `SCAN_DIRS=app,components,lib`.
 *
 * This is a plain Node script (no input-varying logic), wired into the
 * `lint:tokens` script of each app/package. Apps that are already clean
 * (admin-web) wire it into `lint` directly; others run it via `lint:tokens`
 * until their violations are cleaned up.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
// The consuming app's root. When invoked from an app via
// `node ../../packages/config/token-scan.mjs`, cwd is the app root.
const APP_ROOT = process.cwd()
const SCAN_DIRS = (process.env.SCAN_DIRS || 'app,components')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean)
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])

const require = createRequire(import.meta.url)

// ---------------------------------------------------------------------------
// Valid token name sets, sourced directly from @chinooz/theme so the scan stays
// in lockstep with the exported tokens.
// ---------------------------------------------------------------------------
const tokens = require('@chinooz/theme/tokens')
const { tailwindPreset } = require('@chinooz/theme/tailwind-preset')

const COLOR_TOKENS = new Set([
  ...Object.keys(tokens.colors),
  ...Object.keys(tokens.darkColors),
])
const RADIUS_TOKENS = new Set(Object.keys(tokens.radii))
const SPACE_TOKENS = new Set(Object.keys(tailwindPreset.theme.extend.spacing))

// typography.ts is a TypeScript-only module; mirror its exported keys here so a
// plain Node script can validate `font()` / `fontSz()` token names.
const FONT_FAMILY_TOKENS = new Set([
  'sans',
  'sansBold',
  'sansSemiBold',
  'devanagari',
  'devanagariBold',
  'devanagariSemiBold',
])
const FONT_SIZE_TOKENS = new Set([
  '2xs',
  'xs',
  'sm',
  'base',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  'display-sm',
  'display',
  'display-xl',
  'display-lg',
  'display-md',
  'h1',
  'h2',
  'h3',
  'body-lg',
  'body',
  'caption',
])

const ACCESSOR_TOKEN_SETS = {
  color: COLOR_TOKENS,
  space: SPACE_TOKENS,
  radius: RADIUS_TOKENS,
  font: FONT_FAMILY_TOKENS,
  fontSz: FONT_SIZE_TOKENS,
}

// Actual font-family name strings the theme exports plus the CSS generic
// families the shared stacks fall back to. Any other family name in a style
// prop / `font-[…]` class is a hard-coded, non-theme font.
const ALLOWED_FONT_FAMILIES = new Set(
  [
    'Inter',
    'Inter-Bold',
    'Inter-SemiBold',
    'Noto Sans Devanagari',
    'Noto Sans Devagari',
    'Noto Sans Devanagari-Bold',
    'system-ui',
    'sans-serif',
    'serif',
    'monospace',
    'inherit',
    'initial',
    'unset',
  ].map((f) => f.toLowerCase())
)

// ---------------------------------------------------------------------------
// String-aware comment stripper. Replaces comment characters with spaces (and
// preserves newlines) so line/column numbers stay accurate, while keeping
// string and template-literal contents intact (that is where literals live).
// ---------------------------------------------------------------------------
function stripComments(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const ch = src[i]
    const next = src[i + 1]

    // Line comment
    if (ch === '/' && next === '/') {
      while (i < n && src[i] !== '\n') {
        out += ' '
        i++
      }
      continue
    }
    // Block comment
    if (ch === '/' && next === '*') {
      out += '  '
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' '
        i++
      }
      out += '  '
      i += 2
      continue
    }
    // String / template literal — copy through verbatim until the matching quote
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      out += ch
      i++
      while (i < n) {
        out += src[i]
        if (src[i] === '\\') {
          // Escaped char — copy the following char too
          if (i + 1 < n) {
            out += src[i + 1]
            i += 2
            continue
          }
        }
        if (src[i] === quote) {
          i++
          break
        }
        i++
      }
      continue
    }

    out += ch
    i++
  }
  return out
}

// ---------------------------------------------------------------------------
// Detection rules. Each returns the violation message for a matched substring.
// ---------------------------------------------------------------------------
const HEX_COLOR =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g
const COLOR_FN = /\b(?:rgba?|hsla?)\s*\(/gi
const DIMENSION = /(?<![\w.])\d*\.?\d+(?:px|rem|em|pt)\b/gi
const FONT_FAMILY_OBJ = /fontFamily\s*:\s*(['"`])([^'"`]+)\1/g
const FONT_FAMILY_CSS = /font-family\s*:\s*([^;'"`]+)/gi
const FONT_ARBITRARY = /font-\[([^\]]+)\]/g
const ACCESSOR_CALL = /\b(color|space|radius|font|fontSz)\s*\(\s*(['"])([^'"]*)\2\s*\)/g

function lineColAt(src, index) {
  let line = 1
  let lastNl = -1
  for (let k = 0; k < index; k++) {
    if (src[k] === '\n') {
      line++
      lastNl = k
    }
  }
  return { line, column: index - lastNl }
}

function scanFile(absPath, violations) {
  const raw = readFileSync(absPath, 'utf8')
  const src = stripComments(raw)
  const relPath = relative(APP_ROOT, absPath)

  const record = (index, message, snippet) => {
    const { line, column } = lineColAt(src, index)
    violations.push({ file: relPath, line, column, message, snippet })
  }

  let m
  while ((m = HEX_COLOR.exec(src))) {
    record(
      m.index,
      'Hard-coded hex color literal. Use a named @chinooz/theme color token (e.g. a `bg-primary` / `text-text-muted` token class, or `color(\'primary\')`).',
      m[0]
    )
  }
  while ((m = COLOR_FN.exec(src))) {
    record(
      m.index,
      'Hard-coded color function string (rgb/rgba/hsl/hsla). Use a named @chinooz/theme color token instead of a literal color.',
      m[0]
    )
  }
  while ((m = DIMENSION.exec(src))) {
    record(
      m.index,
      'Raw dimension literal (px/rem/em/pt). Use a named @chinooz/theme spacing/radius/type-scale token (e.g. `p-4`, `rounded-md`, `text-base`).',
      m[0]
    )
  }
  while ((m = FONT_FAMILY_OBJ.exec(src))) {
    flagFontList(m[2], m.index, record)
  }
  while ((m = FONT_FAMILY_CSS.exec(src))) {
    flagFontList(m[1], m.index, record)
  }
  while ((m = FONT_ARBITRARY.exec(src))) {
    flagFontList(m[1].replace(/_/g, ' '), m.index, record)
  }
  while ((m = ACCESSOR_CALL.exec(src))) {
    const accessor = m[1]
    const tokenName = m[3]
    const validSet = ACCESSOR_TOKEN_SETS[accessor]
    if (validSet && !validSet.has(tokenName)) {
      record(
        m.index,
        `Unknown @chinooz/theme token "${tokenName}" passed to ${accessor}(). The theme does not export this token; add it to @chinooz/theme or use an exported token name (no fallback is substituted).`,
        m[0]
      )
    }
  }
}

function flagFontList(value, index, record) {
  const families = value
    .split(',')
    .map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
    .filter(Boolean)
  for (const family of families) {
    // Skip CSS variables / theme references.
    if (family.startsWith('var(') || family.startsWith('--')) continue
    if (!ALLOWED_FONT_FAMILIES.has(family)) {
      record(
        index,
        `Non-@chinooz/theme font family "${family}". Use a theme typography token (e.g. the \`font-sans\` / \`font-devanagari\` class, or \`font('sans')\`).`,
        family
      )
      return
    }
  }
}

function collectFiles(dirAbs, files) {
  let entries
  try {
    entries = readdirSync(dirAbs)
  } catch {
    return
  }
  for (const entry of entries) {
    const abs = join(dirAbs, entry)
    const st = statSync(abs)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue
      collectFiles(abs, files)
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      files.push(abs)
    }
  }
}

function main() {
  const files = []
  for (const dir of SCAN_DIRS) {
    collectFiles(join(APP_ROOT, dir), files)
  }

  const violations = []
  for (const file of files) {
    scanFile(file, violations)
  }

  if (violations.length === 0) {
    console.log(
      `✓ token-scan: ${files.length} file(s) in ${SCAN_DIRS.join('/, ')}/ are design-system compliant (no hard-coded color/dimension/font literals or unknown tokens).`
    )
    process.exit(0)
  }

  console.error(
    `\n✗ token-scan: found ${violations.length} design-system violation(s):\n`
  )
  for (const v of violations) {
    console.error(
      `  ${v.file}:${v.line}:${v.column}  ${v.message}\n      offending: ${v.snippet}`
    )
  }
  console.error(
    `\nAll color/spacing/radius/typography values must come from named @chinooz/theme tokens. No hard-coded literals or fallbacks.\n`
  )
  process.exit(1)
}

// Only run the scan when invoked directly; importing the module (e.g. from a
// compliance test) must not trigger it or call process.exit.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main()
}

// Export internals for compliance tests.
export { stripComments, scanFile, ALLOWED_FONT_FAMILIES, ACCESSOR_TOKEN_SETS }
