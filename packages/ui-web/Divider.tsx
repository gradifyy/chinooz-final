import React from 'react'
import type { DividerProps } from '@chinooz/types/components'

export default function Divider({
  orientation = 'horizontal',
  color,
  className = '',
  testID,
}: DividerProps) {
  return (
    <hr
      data-testid={testID}
      className={`
        border-0
        ${orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px'}
        ${className}
      `}
      style={{ backgroundColor: color || undefined }}
    />
  )
}
