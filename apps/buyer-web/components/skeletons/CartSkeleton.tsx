import React from 'react'
import { Skeleton } from '@chinooz/ui-web'

function CartItemSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton width={96} height={96} borderRadius={12} />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton width="75%" height={14} />
        <Skeleton width="35%" height={12} />
        <div className="flex items-center justify-between mt-auto">
          <Skeleton width={100} height={36} borderRadius={8} />
          <Skeleton width={64} height={16} />
        </div>
      </div>
    </div>
  )
}

export default function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Skeleton width="30%" height={24} />
        {Array.from({ length: 3 }).map((_, i) => (
          <React.Fragment key={i}>
            <CartItemSkeleton />
            {i < 2 && <hr className="border-border" />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-col gap-3 p-4 border border-border rounded-xl h-fit">
        <Skeleton width="40%" height={18} />
        <div className="flex justify-between">
          <Skeleton width="30%" height={14} />
          <Skeleton width="20%" height={14} />
        </div>
        <div className="flex justify-between">
          <Skeleton width="25%" height={14} />
          <Skeleton width="15%" height={14} />
        </div>
        <hr className="border-border" />
        <div className="flex justify-between">
          <Skeleton width="20%" height={18} />
          <Skeleton width="30%" height={18} />
        </div>
        <Skeleton width="100%" height={48} borderRadius={12} />
      </div>
    </div>
  )
}
