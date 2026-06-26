import React from 'react'
import type { TextProps } from '@chinooz/types/components'

const variantClasses: Record<string, string> = {
  h1: 'text-[28px] leading-[38px] font-bold',
  h2: 'text-[24px] leading-[32px] font-bold',
  h3: 'text-[20px] leading-[28px] font-semibold',
  h4: 'text-[18px] leading-[26px] font-semibold',
  body: 'text-[14px] leading-[20px] font-normal',
  caption: 'text-[12px] leading-[16px] font-normal',
  label: 'text-[14px] leading-[20px] font-medium',
}

const weightMap: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

export default function Text({
  variant = 'body',
  weight,
  color,
  align,
  numberOfLines,
  children,
  className = '',
  testID,
}: TextProps) {
  return (
    <p
      data-testid={testID}
      className={`${variantClasses[variant]} ${weight ? weightMap[weight] : ''} ${className}`}
      style={{
        color,
        textAlign: align,
        overflow: numberOfLines ? 'hidden' : undefined,
        textOverflow: numberOfLines ? 'ellipsis' : undefined,
        display: numberOfLines ? '-webkit-box' : undefined,
        WebkitLineClamp: numberOfLines,
        WebkitBoxOrient: numberOfLines ? 'vertical' : undefined,
      }}
    >
      {children}
    </p>
  )
}
