'use client'

import React from 'react'
import type { QuantityStepperProps } from '@chinooz/types/components'

export default function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  disabled,
  className = '',
  testID,
}: QuantityStepperProps) {
  const atMin = value <= min
  const atMax = value >= max

  return (
    <div
      data-testid={testID}
      className={`inline-flex items-center border border-border rounded-lg overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={atMin || disabled}
        className="px-3 py-2 text-[18px] font-semibold text-text min-w-[44px] text-center
          disabled:opacity-40 hover:bg-gray-50 transition-colors"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div className="px-4 py-2 border-x border-border min-w-[48px] text-center text-[15px] font-semibold text-text">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={atMax || disabled}
        className="px-3 py-2 text-[18px] font-semibold text-text min-w-[44px] text-center
          disabled:opacity-40 hover:bg-gray-50 transition-colors"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
