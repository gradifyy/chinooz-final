'use client'

import React from 'react'
import { Skeleton } from '@chinooz/ui-web'

function ShimmerBar({ width, height, borderRadius = 6, className = '' }: { width?: number | string; height: number; borderRadius?: number; className?: string }) {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} className={className} />
}

function HeroSection() {
  return <ShimmerBar width="100%" height={220} borderRadius={16} />
}

function DealsSection() {
  return (
    <div className="flex flex-col gap-3">
      <ShimmerBar width={120} height={18} />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[160px] flex flex-col gap-2">
            <ShimmerBar height={140} borderRadius={12} />
            <ShimmerBar width="80%" height={12} />
            <ShimmerBar width="50%" height={14} />
          </div>
        ))}
      </div>
    </div>
  )
}

function RailSection() {
  return (
    <div className="flex flex-col gap-3">
      <ShimmerBar width={140} height={18} />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[160px] flex flex-col gap-2">
            <ShimmerBar height={140} borderRadius={12} />
            <ShimmerBar width="80%" height={12} />
            <ShimmerBar width="50%" height={14} />
          </div>
        ))}
      </div>
    </div>
  )
}

function GridSection() {
  return (
    <div className="flex flex-col gap-3">
      <ShimmerBar width={160} height={22} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <ShimmerBar height={200} borderRadius={12} />
            <ShimmerBar width="90%" height={14} />
            <ShimmerBar width="60%" height={12} />
            <ShimmerBar width="40%" height={16} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <HeroSection />
      <DealsSection />
      <RailSection />
      <RailSection />
      <div className="flex flex-col gap-3">
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <ShimmerBar width={72} height={72} borderRadius={36} />
              <ShimmerBar width={56} height={10} />
            </div>
          ))}
        </div>
      </div>
      <RailSection />
      <GridSection />
    </div>
  )
}
