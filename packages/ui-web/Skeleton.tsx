import React from 'react'
import type { SkeletonProps } from '@chinooz/types/components'

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  circle,
  className = '',
  testID,
}: SkeletonProps) {
  return (
    <div
      data-testid={testID}
      className={`animate-pulse bg-border ${className}`}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? 9999 : borderRadius,
      }}
    />
  )
}
