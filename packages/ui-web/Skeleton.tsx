'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from './hooks/useReducedMotion'
import type { SkeletonProps } from '@chinooz/types/components'

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  circle,
  className = '',
  testID,
}: SkeletonProps) {
  const reduced = useReducedMotion()

  return (
    <div
      data-testid={testID}
      className={`relative overflow-hidden bg-border ${className}`}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? 9999 : borderRadius,
      }}
    >
      {!reduced && (
        <motion.div
          className="absolute inset-0 bg-shimmer-highlight"
          style={{ opacity: 0.6 }}
          animate={{ x: [-200, 200] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  )
}
