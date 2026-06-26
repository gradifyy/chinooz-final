import React from 'react'
import type { PriceTextProps } from '@chinooz/types/components'

function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`
}

const sizeClasses: Record<string, string> = {
  sm: 'text-[14px]',
  md: 'text-[18px]',
  lg: 'text-[24px]',
}

const compareSizeClasses: Record<string, string> = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[16px]',
}

export default function PriceText({
  price,
  compareAtPrice,
  size = 'md',
  variant = 'default',
  className = '',
  testID,
}: PriceTextProps) {
  const isDeal = variant === 'deal'

  return (
    <div data-testid={testID} className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className={`font-bold ${sizeClasses[size]} ${isDeal ? 'text-gold' : 'text-text'}`}>
        {formatPrice(price)}
      </span>
      {compareAtPrice && compareAtPrice > price && (
        <>
          <span className={`text-text-muted line-through ${compareSizeClasses[size]}`}>
            {formatPrice(compareAtPrice)}
          </span>
          <span className={`font-semibold text-success ${compareSizeClasses[size]}`}>
            {Math.round((1 - price / compareAtPrice) * 100)}% OFF
          </span>
        </>
      )}
    </div>
  )
}
