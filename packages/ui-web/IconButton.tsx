import React from 'react'
import type { IconButtonProps } from '@chinooz/types/components'

const sizeClasses: Record<string, string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-12 h-12',
}

const variantClasses: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  ghost: 'bg-transparent text-text hover:bg-gray-100',
  outline: 'bg-transparent text-primary border border-primary hover:bg-primary/5',
}

export default function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  disabled,
  accessibilityLabel,
  className = '',
  testID,
}: IconButtonProps) {
  return (
    <button
      data-testid={testID}
      onClick={onPress}
      disabled={disabled}
      aria-label={accessibilityLabel}
      className={`
        rounded-full inline-flex items-center justify-center
        transition-colors duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        min-w-[44px] min-h-[44px]
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {icon}
    </button>
  )
}
