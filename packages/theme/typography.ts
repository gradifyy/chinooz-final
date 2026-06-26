export const fontFamily = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  sansBold: ['Inter-Bold', 'Inter', 'system-ui', 'sans-serif'],
  sansSemiBold: ['Inter-SemiBold', 'Inter', 'system-ui', 'sans-serif'],
  devanagari: ['Noto Sans Devanagari', 'sans-serif'],
  devanagariBold: ['Noto Sans Devanagari-Bold', 'Noto Sans Devanagari', 'sans-serif'],
} as const

export const fontSize = {
  xs: [10, 14],
  sm: [12, 16],
  base: [14, 20],
  md: [16, 22],
  lg: [18, 26],
  xl: [20, 28],
  '2xl': [24, 32],
  '3xl': [28, 38],
  '4xl': [32, 42],
  '5xl': [40, 52],
} as const

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  tight: '1.2',
  normal: '1.5',
  relaxed: '1.75',
} as const

export const letterSpacing = {
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
} as const

export type FontFamilyToken = keyof typeof fontFamily
export type FontSizeToken = keyof typeof fontSize
export type FontWeightToken = keyof typeof fontWeight
