'use client'

import React from 'react'
import type { RatingProps } from '@chinooz/types/components'

const sizeClasses: Record<string, string> = {
  sm: 'text-[14px]',
  md: 'text-[18px]',
  lg: 'text-[24px]',
}

export default function Rating({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  interactive = false,
  onChange,
  className = '',
  testID,
}: RatingProps) {
  return (
    <div data-testid={testID} className={`inline-flex items-center gap-[2px] ${className}`}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const filled = i < Math.floor(rating)
        const half = !filled && i < rating
        return (
          <button
            key={i}
            type="button"
            onClick={() => interactive && onChange?.(i + 1)}
            disabled={!interactive}
            className={`${sizeClasses[size]} transition-colors ${
              filled || half ? 'text-gold' : 'text-border'
            } ${half ? 'opacity-50' : ''} ${interactive ? 'hover:scale-110' : ''}`}
            aria-label={`${i + 1} star${i > 0 ? 's' : ''}`}
          >
            ★
          </button>
        )
      })}
      {showValue && <span className="text-[12px] text-text-muted ml-1">{rating.toFixed(1)}</span>}
    </div>
  )
}
