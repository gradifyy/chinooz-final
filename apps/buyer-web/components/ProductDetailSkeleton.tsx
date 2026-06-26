'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@chinooz/ui-web'
import { Skeleton } from '@chinooz/ui-web'

function ShimmerBar({ width, height, borderRadius = 6, className = '' }: { width?: number | string; height: number; borderRadius?: number; className?: string }) {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} className={className} />
}

export default function ProductDetailSkeleton() {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8"
    >
      {/* Gallery skeleton */}
      <div className="flex flex-col gap-3">
        <Skeleton height={400} borderRadius={16} />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={64} height={64} borderRadius={8} />
          ))}
        </div>
      </div>

      {/* Info skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton width="80%" height={28} />
        <div className="flex items-center gap-2">
          <Skeleton width={80} height={16} borderRadius={8} />
          <Skeleton width={40} height={14} />
          <Skeleton width={70} height={22} borderRadius={11} />
        </div>
        <div className="flex items-baseline gap-2">
          <Skeleton width={100} height={24} />
          <Skeleton width={70} height={16} />
          <Skeleton width={50} height={22} borderRadius={11} />
        </div>
        <div className="flex items-center gap-2 p-3 bg-background rounded-xl">
          <Skeleton width={36} height={36} circle />
          <div className="flex-1 space-y-1">
            <Skeleton width="50%" height={14} />
            <Skeleton width="70%" height={12} />
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-2">
          <Skeleton width={100} height={14} />
          <div className="flex gap-2">
            <Skeleton width={80} height={44} borderRadius={8} />
            <Skeleton width={80} height={44} borderRadius={8} />
            <Skeleton width={80} height={44} borderRadius={8} />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton width="40%" height={16} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="60%" height={14} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Skeleton width="50%" height={52} borderRadius={12} />
          <Skeleton width="50%" height={52} borderRadius={12} />
        </div>
      </div>

      {/* Reviews skeleton */}
      <div className="md:col-span-2 space-y-4">
        <Skeleton width="30%" height={20} />
        <div className="flex gap-6">
          <Skeleton width={80} height={80} borderRadius={8} />
          <div className="flex-1 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton width={12} height={12} />
                <Skeleton width="60%" height={6} borderRadius={3} />
                <Skeleton width={20} height={10} />
              </div>
            ))}
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex gap-2 py-3 border-b border-border-light">
            <Skeleton width={32} height={32} circle />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="30%" height={13} />
              <Skeleton width="100%" height={12} />
              <Skeleton width="80%" height={12} />
            </div>
          </div>
        ))}
      </div>

      {/* Related skeleton */}
      <div className="md:col-span-2 space-y-3">
        <Skeleton width="25%" height={18} />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] space-y-2">
              <Skeleton height={160} borderRadius={12} />
              <Skeleton width="80%" height={12} />
              <Skeleton width="50%" height={14} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
