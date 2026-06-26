export const colors = {
  primary: '#8A1B57',
  primaryDark: '#6E1545',
  primaryLight: '#B23C7E',
  primary50: '#F8EAF1',
  gold: '#E0A93B',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E5E5',
  text: '#1F2937',
  textMuted: '#6B7280',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  shimmer: '#E8E8E8',
  shimmerHighlight: '#F5F5F5',
  overlay: 'rgba(0,0,0,0.5)',
} as const

export type ColorKey = keyof typeof colors
