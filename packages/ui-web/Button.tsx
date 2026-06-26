import React from 'react'
import type { ButtonProps } from '@chinooz/types/components'

const variantClasses: Record<string, string> = {
  primary: 'bg-primary text-white border-transparent',
  secondary: 'bg-primary-50 text-primary border-transparent',
  ghost: 'bg-transparent text-primary border-transparent',
  destructive: 'bg-error text-white border-transparent',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-[14px]',
  lg: 'h-[52px] px-5 text-[16px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  onPress,
  children,
  leftIcon,
  rightIcon,
  className = '',
  testID,
}: ButtonProps) {
  return (
    <button
      data-testid={testID}
      onClick={onPress}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-opacity duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}
