import React from 'react'
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
    <div
      data-testid={testID}
      className={`flex flex-col items-center justify-center px-8 py-12 gap-3 text-center ${className}`}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <h3 className="text-[18px] font-semibold text-text">{title}</h3>
      {subtitle && <p className="text-[14px] text-text-muted leading-[20px] max-w-sm">{subtitle}</p>}
      {action && (
        <Button variant="primary" size="md" onPress={action.onPress} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
