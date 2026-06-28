export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN')}`
}

export function formatNPRCompact(amount: number): string {
  if (amount >= 100000) {
    return `NPR ${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `NPR ${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`
  }
  return `NPR ${amount}`
}

/**
 * Integer-paisa money helpers.
 *
 * All money is stored internally as integer paisa (1 NPR = 100 paisa) to avoid
 * floating-point rounding errors. These helpers convert, format, and round
 * paisa values into NPR strings for display.
 */

export const PAISA_PER_NPR = 100

/** Convert integer paisa to NPR (rupees) as a number. */
export function paisaToNPR(paisa: number): number {
  return Math.round(paisa) / PAISA_PER_NPR
}

/** Convert NPR (rupees) to integer paisa (rounds half up to nearest paisa). */
export function nprToPaisa(rupees: number): number {
  return Math.round(rupees * PAISA_PER_NPR)
}

/** Add two paisa amounts safely (integer addition). */
export function addPaisa(a: number, b: number): number {
  return Math.round(a) + Math.round(b)
}

/** Subtract `b` from `a` in paisa (never below zero unless allowNegative). */
export function subPaisa(a: number, b: number, allowNegative = false): number {
  const result = Math.round(a) - Math.round(b)
  return allowNegative ? result : Math.max(0, result)
}

/**
 * Format integer paisa as an NPR string, e.g. 19999 -> "NPR 199.99".
 * Locale en-IN is used for digit grouping.
 */
export function formatNPRFromPaisa(paisa: number): string {
  const rupees = paisaToNPR(paisa)
  const isWhole = Math.round(paisa) % PAISA_PER_NPR === 0
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `NPR ${formatted}`
}

/**
 * Compact paisa formatter, e.g. 1999999 -> "NPR 20.0K".
 * Mirrors formatNPRCompact but operates on paisa.
 */
export function formatNPRFromPaisaCompact(paisa: number): string {
  return formatNPRCompact(paisaToNPR(paisa))
}
