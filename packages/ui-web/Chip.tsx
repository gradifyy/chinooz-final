import React from 'react'
import type { ChipProps } from '@chinooz/types/components'

export default function Chip({
  label,
  variant = 'default',
  onPress,
  onRemove,
  className = '',
  testID,
}: ChipProps) {
  return (
    <button
      data-testid={testID}
      onClick={onPress}
      disabled={!onPress}
      className={`
        inline-flex items-center gap-1 rounded-full px-3 py-[6px] text-[13px] font-medium
        border min-h-[36px]
        transition-colors duration-150
        ${variant === 'active' ? 'bg-primary text-white border-primary' : 'bg-background text-text border-border'}
        ${!onPress ? 'cursor-default' : ''}
        ${className}
      `}
    >
      {label}
      {variant === 'removable' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
          className="text-[12px] ml-1"
          aria-label="Remove"
        >
          ✕
        </button>
      )}
    </button>
  )
}
