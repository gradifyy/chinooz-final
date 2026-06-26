import React from 'react'
import { getInitials, getImageSource } from '@chinooz/utils'
import SafeImage from './SafeImage'
import type { AvatarProps } from '@chinooz/types/components'

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-14 h-14 text-[20px]',
  xl: 'w-[72px] h-[72px] text-[25px]',
}

export default function Avatar({
  source,
  name,
  size = 'md',
  fallback,
  className = '',
  testID,
}: AvatarProps) {
  const safeName = typeof name === 'string' ? name : ''
  const initials = getInitials(safeName)

  return (
    <div
      data-testid={testID}
      role="img"
      aria-label={safeName || 'Avatar'}
      className={`rounded-full bg-primary-50 flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {source ? (
        <SafeImage
          src={source}
          alt={safeName || 'Avatar'}
          className="w-full h-full object-cover"
        />
      ) : fallback ? (
        fallback
      ) : (
        <span className="font-semibold text-primary" aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  )
}
