export const iconSize = {
  '2xs': 12,
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
} as const

export type IconSizeToken = keyof typeof iconSize

export const imagery = {
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 64,
  logo: 40,
  illustrationSm: 120,
  illustrationLg: 200,
  thumb: 64,
} as const

export type ImageryToken = keyof typeof imagery
