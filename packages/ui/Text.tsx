import React from 'react'
import { Text as RNText } from 'react-native'
import { colors } from '@chinooz/theme'
import type { TextProps } from '@chinooz/types/components'

const variantStyles: Record<string, { size: number; lineHeight: number; weight: '400' | '500' | '600' | '700' }> = {
  h1: { size: 28, lineHeight: 38, weight: '700' },
  h2: { size: 24, lineHeight: 32, weight: '700' },
  h3: { size: 20, lineHeight: 28, weight: '600' },
  h4: { size: 18, lineHeight: 26, weight: '600' },
  body: { size: 14, lineHeight: 20, weight: '400' },
  caption: { size: 12, lineHeight: 16, weight: '400' },
  label: { size: 14, lineHeight: 20, weight: '500' },
}

export default function Text({
  variant = 'body',
  weight,
  color,
  align,
  numberOfLines,
  children,
  testID,
}: TextProps) {
  const v = variantStyles[variant]
  return (
    <RNText
      testID={testID}
      numberOfLines={numberOfLines}
      style={{
        fontSize: v.size,
        lineHeight: v.lineHeight,
        fontWeight: weight ?? v.weight,
        color: color ?? colors.text,
        textAlign: align,
      }}
    >
      {children}
    </RNText>
  )
}
