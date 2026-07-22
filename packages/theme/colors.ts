const brand = {
  primary: '#8A1B57',
  primaryDark: '#6E1545',
  primaryLight: '#B23C7E',
  primary50: '#F8EAF1',
  gold: '#E0A93B',
  // Plum gradient family (headers, onboarding, seller banners)
  plumDeep: '#37091C',
  plumMid: '#7A1E50',
  plumInk: '#3A0A22',
  plumShadow: '#28081A',
  plumLight: '#9E2D68',
  plumDark2: '#4C1438',
  plumMid2: '#7A2E5A',
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
  cream: '#FCFBF9',
  creamInk: '#FFF4EA',
  inkOnBrand: '#FFFFFF',
  whiteAlpha25: 'rgba(255,255,255,0.25)',
} as const

const semantic = {
  success: '#16A34A',
  successLight: '#DCFCE7',
  successText: '#166534',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningText: '#7C2D12',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  statusProcessing: '#7C3AED',
  statusProcessingBg: '#F3E8FF',
  statusShipped: '#0284C7',
  statusShippedBg: '#E0F2FE',
  statusReturned: '#D97706',
  statusReturnedBg: '#FEF3C7',
  // Payment brand colors
  esewa: '#60BB46',
  khalti: '#5C2D91',
  // Branded decorative colors
  dealInk: '#3A2700',
  urgencyRed: '#E0523B',
  urgencyGradientEnd: '#F2674D',
  liveGreen: '#7CF6A8',
  progressTrack: '#F0E6EC',
  tierBg: '#FBF1E4',
  dangerBg: '#FCE9E9',
  inboxTint: '#FCF6FA',
  toastSurface: '#23202B',
} as const

export const colors = { ...brand, ...neutral, ...semantic } as const

export const darkColors = {
  background: '#121212',
  surface: '#1E1E1E',
  border: '#2E2E2E',
  borderLight: '#252525',
  text: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textTertiary: '#6B7280',
  overlay: 'rgba(0,0,0,0.7)',
  shimmer: '#2E2E2E',
  shimmerHighlight: '#383838',
  successLight: '#0D3320',
  successText: '#4ADE80',
  warningLight: '#3D2E0A',
  warningText: '#FBBF24',
  errorLight: '#3D1010',
  infoLight: '#0D1F3D',
  cream: '#1A1A1A',
  creamInk: '#F3F4F6',
  tierBg: '#2A2418',
  dangerBg: '#2A1010',
  inboxTint: '#1A1216',
  progressTrack: '#2A1A22',
  toastSurface: '#1E1E1E',
  statusProcessingBg: '#1A0F2A',
  statusShippedBg: '#0A1A26',
  statusReturnedBg: '#2A1A0A',
} as const

export type ColorToken = keyof typeof colors
export type BrandColorToken = keyof typeof brand
export type NeutralColorToken = keyof typeof neutral
export type SemanticColorToken = keyof typeof semantic

export const brandColors = brand
export const neutralColors = neutral
export const semanticColors = semantic
