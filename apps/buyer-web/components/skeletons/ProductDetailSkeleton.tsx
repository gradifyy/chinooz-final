import React from 'react'
import { Skeleton } from '@chinooz/ui-web'

export default function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton height={400} borderRadius={16} />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={64} height={64} borderRadius={8} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton width="80%" height={28} />
        <Skeleton width="30%" height={18} />
        <div className="flex gap-2">
          <Skeleton width={100} height={32} borderRadius={16} />
          <Skeleton width={80} height={32} borderRadius={16} />
        </div>
        <hr className="border-border" />
        <div className="flex flex-col gap-2">
          <Skeleton width="25%" height={16} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="60%" height={14} />
        </div>
        <hr className="border-border" />
        <div className="flex gap-3 items-center">
          <Skeleton width={48} height={48} circle />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton width="35%" height={14} />
            <Skeleton width="55%" height={12} />
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <Skeleton width="50%" height={52} borderRadius={12} />
          <Skeleton width="50%" height={52} borderRadius={12} />
        </div>
      </div>
    </div>
  )
}
