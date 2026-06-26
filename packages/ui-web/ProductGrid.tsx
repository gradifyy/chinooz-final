import React from 'react'
import Skeleton from './Skeleton'

interface ProductGridProps {
  count?: number
  className?: string
}

export default function ProductGrid({ count = 6, className = '' }: ProductGridProps) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton height={200} borderRadius={12} />
          <Skeleton height={14} width="100%" />
          <Skeleton height={12} width="60%" />
          <Skeleton height={16} width="40%" />
        </div>
      ))}
    </div>
  )
}
