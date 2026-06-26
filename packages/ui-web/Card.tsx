import React from 'react'
import type { CardProps } from '@chinooz/types/components'

export default function Card({
  padded = true,
  elevated = false,
  onPress,
  children,
  className = '',
  testID,
}: CardProps) {
  const Tag = onPress ? 'button' : 'div'
  return (
    <Tag
      data-testid={testID}
      onClick={onPress}
      className={`
        bg-surface rounded-2xl border border-border-light text-left
        ${padded ? 'p-4' : ''}
        ${elevated ? 'shadow-md' : ''}
        ${onPress ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </Tag>
  )
}
