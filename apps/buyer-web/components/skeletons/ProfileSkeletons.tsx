'use client'

import React from 'react'
import Skeleton from '@chinooz/ui-web/Skeleton'

export function ProfileHubSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-surface rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3">
        <Skeleton width={72} height={72} circle />
        <Skeleton width={140} height={22} borderRadius={8} />
        <Skeleton width={100} height={14} borderRadius={4} />
        <Skeleton width={80} height={14} borderRadius={4} />
      </div>

      <div className="flex gap-3 px-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 bg-surface rounded-xl p-3 shadow-sm flex flex-col items-center gap-1.5">
            <Skeleton width={24} height={24} borderRadius={8} />
            <Skeleton width={20} height={16} borderRadius={4} />
            <Skeleton width={40} height={12} borderRadius={4} />
          </div>
        ))}
      </div>

      {[0, 1, 2].map(section => (
        <div key={section} className="space-y-2">
          <Skeleton width={60} height={12} borderRadius={4} />
          <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
            {[0, 1, 2].map(row => (
              <div key={row} className={`flex items-center h-14 px-4 gap-3 ${row > 0 ? 'border-t border-border-light' : ''}`}>
                <Skeleton width={32} height={32} borderRadius={8} />
                <Skeleton width={120} height={16} borderRadius={4} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AddressCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-2">
      <div className="flex justify-between">
        <Skeleton width={50} height={20} borderRadius={9999} />
        <Skeleton width={40} height={20} borderRadius={4} />
      </div>
      <Skeleton width={120} height={16} borderRadius={4} />
      <Skeleton width={100} height={12} borderRadius={4} />
      <Skeleton width="100%" height={14} borderRadius={4} />
      <Skeleton width="80%" height={14} borderRadius={4} />
    </div>
  )
}

export function PaymentMethodSkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} borderRadius={8} />
        <div className="flex-1 space-y-1">
          <Skeleton width={100} height={16} borderRadius={4} />
          <Skeleton width={140} height={12} borderRadius={4} />
        </div>
        <Skeleton width={60} height={20} borderRadius={9999} />
      </div>
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border-light p-4 md:p-5 space-y-3">
      <div className="flex justify-between">
        <Skeleton width={80} height={14} borderRadius={4} />
        <Skeleton width={60} height={20} borderRadius={9999} />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} borderRadius={8} />
        <div className="flex-1 space-y-1">
          <Skeleton width="70%" height={14} borderRadius={4} />
          <Skeleton width="40%" height={12} borderRadius={4} />
        </div>
      </div>
      <div className="flex justify-between pt-3 border-t border-border-light">
        <Skeleton width={60} height={13} borderRadius={4} />
        <Skeleton width={80} height={15} borderRadius={4} />
      </div>
    </div>
  )
}

export function WishlistGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="bg-surface rounded-xl overflow-hidden shadow-sm">
          <Skeleton width="100%" height={0} borderRadius={0} className="aspect-square" />
          <div className="p-3 space-y-1.5">
            <Skeleton width="90%" height={13} borderRadius={4} />
            <Skeleton width="50%" height={15} borderRadius={4} />
            <Skeleton width="100%" height={36} borderRadius={8} />
          </div>
        </div>
      ))}
    </div>
  )
}
