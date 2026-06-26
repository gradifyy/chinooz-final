import React from 'react'
import { Skeleton } from '@chinooz/ui-web'

export default function CategorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton width="40%" height={28} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton height={120} borderRadius={12} />
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={10} />
          </div>
        ))}
      </div>
    </div>
  )
}
