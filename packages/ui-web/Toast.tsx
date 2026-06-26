'use client'

import React from 'react'
import type { ToastProps } from '@chinooz/types/components'

const variantClasses: Record<string, string> = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-[#F59E0B]',
  info: 'bg-info',
}

export default function Toast({
  message,
  variant = 'info',
  visible,
  action,
  className = '',
  testID,
}: ToastProps) {
  if (!visible) return null

  const base = 'fixed top-[60px] left-4 right-4 z-[9999] rounded-lg px-[14px] py-[14px] flex items-center justify-between shadow-lg animate-in slide-in-from-top-2'

  return (
    <div
      data-testid={testID}
      className={`${base} ${variantClasses[variant]} text-white text-[14px] ${className}`}
    >
      <span className="flex-1">{message}</span>
      {action && (
        <button onClick={action.onPress} className="ml-3 font-bold text-white">
          {action.label}
        </button>
      )}
    </div>
  )
}
