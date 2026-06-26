import { colors as _colors } from './colors'
export { colors, brandColors, neutralColors, semanticColors } from './colors'
export type { ColorToken, BrandColorToken, NeutralColorToken, SemanticColorToken } from './colors'

import { spacing as _spacing } from './spacing'
export { spacing } from './spacing'
export type { SpacingToken } from './spacing'

import { radii as _radii } from './radii'
export { radii } from './radii'
export type { RadiusToken } from './radii'

import { fontFamily as _fontFamily, fontSize as _fontSize } from './typography'
export { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography'
export type { FontFamilyToken, FontSizeToken, FontWeightToken } from './typography'

export { shadows, shadow } from './shadows'
export type { ShadowLevel, ShadowValue } from './shadows'

import { zIndex as _zIndex } from './z-index'
export { zIndex } from './z-index'
export type { ZIndexToken } from './z-index'

import { duration as _duration } from './motion'
export { duration, easing } from './motion'
export type { DurationToken, EasingToken } from './motion'

export function color(token: keyof typeof _colors): string {
  return _colors[token]
}

export function space(token: keyof typeof _spacing): number {
  return _spacing[token]
}

export function radius(token: keyof typeof _radii): number {
  return _radii[token]
}

export function font(token: keyof typeof _fontFamily): readonly string[] {
  return _fontFamily[token]
}

export function fontSz(token: keyof typeof _fontSize): readonly [number, number] {
  return _fontSize[token]
}

export function z(token: keyof typeof _zIndex): number {
  return _zIndex[token]
}

export function motionDuration(token: keyof typeof _duration): number {
  return _duration[token]
}
