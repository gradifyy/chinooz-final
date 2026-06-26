import React from 'react'
import type { BadgeProps } from '@chinooz/types/components'

const variantClasses: Record<string, string> = {
  primary: 'bg-primary text-white',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-[#92400E]',
  error: 'bg-error/15 text-error',
  info: 'bg-info/15 text-info',
  neutral: 'bg-border text-text-secondary',
  deal: 'bg-gold text-white',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-[6px] py-[2px] text-[10px]',
  md: 'px-2 py-[2px] text-[11px]',
}

export default function Badge({
  label,
  variant = 'primary',
  size = 'md',
  className = '',
  testID,
}: BadgeProps) {
  return (
    <span
      data-testid={testID}
      className={`
        inline-flex items-center rounded-full font-bold tracking-wider uppercase
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {label}
    </span>
  )
}
