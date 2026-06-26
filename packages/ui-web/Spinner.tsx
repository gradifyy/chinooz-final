import React from 'react'
import type { SpinnerProps } from '@chinooz/types/components'

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
}

export default function Spinner({ size = 'md', color, testID }: SpinnerProps) {
  return (
    <svg
      data-testid={testID}
      className={`animate-spin ${sizeClasses[size]}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        style={{ color }}
      />
    </svg>
  )
}
