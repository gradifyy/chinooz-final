import React from 'react'
import type { HeadingProps } from '@chinooz/types/components'

const tags = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4' } as const
const classes: Record<string, string> = {
  h1: 'text-[28px] leading-[38px] font-bold',
  h2: 'text-[24px] leading-[32px] font-bold',
  h3: 'text-[20px] leading-[28px] font-semibold',
  h4: 'text-[18px] leading-[26px] font-semibold',
}

export default function Heading({ variant = 'h2', children, className = '', testID }: HeadingProps) {
  const Tag = tags[variant]
  return (
    <Tag data-testid={testID} className={`${classes[variant]} text-text ${className}`}>
      {children}
    </Tag>
  )
}
