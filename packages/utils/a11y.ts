import { colors } from '@chinooz/theme'

function luminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)!.map(h => {
    const v = parseInt(h, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsWCAG_AA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5
}

export function meetsWCAG_AAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 7
}

export const a11yPairs = {
  primaryOnWhite: { fg: colors.primary, bg: colors.white },
  whiteOnPrimary: { fg: colors.white, bg: colors.primary },
  textOnBackground: { fg: colors.text, bg: colors.background },
  textMutedOnBackground: { fg: colors.textMuted, bg: colors.background },
  errorOnWhite: { fg: colors.error, bg: colors.white },
  successOnWhite: { fg: colors.success, bg: colors.white },
} as const

export function checkAllPairs(): Record<string, { ratio: number; aa: boolean; aaa: boolean }> {
  const results: Record<string, { ratio: number; aa: boolean; aaa: boolean }> = {}
  for (const [name, { fg, bg }] of Object.entries(a11yPairs)) {
    const ratio = contrastRatio(fg, bg)
    results[name] = { ratio: Math.round(ratio * 100) / 100, aa: ratio >= 4.5, aaa: ratio >= 7 }
  }
  return results
}
