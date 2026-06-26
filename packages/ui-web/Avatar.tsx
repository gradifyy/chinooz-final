import React from 'react'
import type { AvatarProps } from '@chinooz/types/components'

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-14 h-14 text-[20px]',
  xl: 'w-[72px] h-[72px] text-[25px]',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Avatar({
  source,
  name,
  size = 'md',
  fallback,
  className = '',
  testID,
}: AvatarProps) {
  return (
    <div
      data-testid={testID}
      className={`rounded-full bg-primary-50 flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {source ? (
        <img src={source} alt={name ?? ''} className="w-full h-full object-cover" />
      ) : fallback ? (
        fallback
      ) : (
        <span className="font-semibold text-primary">{name ? getInitials(name) : '?'}</span>
      )}
    </div>
  )
}
