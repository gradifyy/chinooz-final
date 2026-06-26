const brand = {
  primary: '#8A1B57',
  primaryDark: '#6E1545',
  primaryLight: '#B23C7E',
  primary50: '#F8EAF1',
  gold: '#E0A93B',
} as const

const neutral = {
  white: '#FFFFFF',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  text: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  textTertiary: '#9CA3AF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  shimmer: '#E8E8E8',
  shimmerHighlight: '#F5F5F5',
} as const

const semantic = {
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',
} as const

export const colors = { ...brand, ...neutral, ...semantic } as const

export type ColorToken = keyof typeof colors
export type BrandColorToken = keyof typeof brand
export type NeutralColorToken = keyof typeof neutral
export type SemanticColorToken = keyof typeof semantic

export const brandColors = brand
export const neutralColors = neutral
export const semanticColors = semantic
