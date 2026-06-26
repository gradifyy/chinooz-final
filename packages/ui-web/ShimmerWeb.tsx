import React from 'react'

interface ShimmerWebProps {
  className?: string
}

export default function ShimmerWeb({ className = '' }: ShimmerWebProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
    />
  )
}
