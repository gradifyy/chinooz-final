'use client'

import React from 'react'
import Skeleton from './Skeleton'

export function InventoryTableSkeleton() {
  return (
    <div className="hidden md:block rounded-xl border border-border-light bg-surface overflow-hidden" aria-busy="true" role="table">
      <div className="border-b border-border px-4 h-10 flex items-center gap-3">
        <Skeleton width={20} height={20} borderRadius={6} />
        <Skeleton width="30%" height={12} />
        <Skeleton width="20%" height={12} />
      </div>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="border-b border-border-light px-4 h-14 flex items-center gap-3">
          <Skeleton width={36} height={36} borderRadius={8} />
          <div className="flex-1">
            <Skeleton width="50%" height={14} />
            <div className="mt-1.5"><Skeleton width="25%" height={10} /></div>
          </div>
          <Skeleton width={60} height={14} />
          <Skeleton width={80} height={32} borderRadius={6} />
          <Skeleton width={72} height={20} borderRadius={9999} />
        </div>
      ))}
    </div>
  )
}

export function InventoryRowSkeletons() {
  return (
    <div className="md:hidden space-y-2.5" aria-busy="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border-light bg-surface p-3">
          <div className="flex items-center gap-3">
            <Skeleton width={40} height={40} borderRadius={8} />
            <div className="flex-1">
              <Skeleton width="60%" height={14} />
              <div className="mt-1.5"><Skeleton width="35%" height={10} /></div>
            </div>
            <Skeleton width={48} height={16} />
            <Skeleton width={72} height={20} borderRadius={9999} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function InventorySkeleton() {
  return (
    <>
      <InventoryTableSkeleton />
      <InventoryRowSkeletons />
    </>
  )
}
