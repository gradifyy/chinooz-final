/**
 * Minimal type declarations for the design-system token-literal scan
 * (`token-scan.mjs`). The script exports a few internals so the compliance
 * tests (task 20.2) can exercise the scan directly. Keep this in lockstep with
 * the `export { ... }` statement at the bottom of `token-scan.mjs`.
 */

/** A single design-system violation recorded by {@link scanFile}. */
export interface TokenScanViolation {
  /** Path of the offending file, relative to the admin-web app root. */
  file: string
  /** 1-based line number of the match. */
  line: number
  /** 1-based column number of the match. */
  column: number
  /** Human-readable explanation of the violation. */
  message: string
  /** The offending substring (e.g. `#fff`, `16px`, font family name). */
  snippet: string
}

/**
 * Reads the file at `absPath`, scans it for hard-coded color/dimension/font
 * literals and unknown `@chinooz/theme` token names, and pushes any
 * {@link TokenScanViolation}s into the provided `violations` array.
 */
export function scanFile(absPath: string, violations: TokenScanViolation[]): void

/** Strips comments (string-aware) from source, preserving line/column offsets. */
export function stripComments(src: string): string

/** Lower-cased set of font-family names the theme/CSS generics permit. */
export const ALLOWED_FONT_FAMILIES: Set<string>

/** Map of token accessor name -> set of valid token names it accepts. */
export const ACCESSOR_TOKEN_SETS: Record<string, Set<string>>
