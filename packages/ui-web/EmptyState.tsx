'use client'

import React from 'react'
import { SlideUp } from './Animate'
import Button from './Button'
import type { EmptyStateProps } from '@chinooz/types/components'

export default function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className = '',
  testID,
}: EmptyStateProps) {
  return (
    <SlideUp className={`flex flex-col items-center justify-center px-8 py-12 gap-3 text-center ${className}`}>
      {icon && <div className="mb-2">{icon}</div>}
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {subtitle && <p className="text-sm text-text-muted leading-5 max-w-sm">{subtitle}</p>}
      {action && (
        <Button variant="primary" size="md" onPress={action.onPress} className="mt-2">
          {action.label}
        </Button>
      )}
    </SlideUp>
  )
}
