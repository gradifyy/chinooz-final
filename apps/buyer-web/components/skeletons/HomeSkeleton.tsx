import React from 'react'
import { Skeleton, Section } from '@chinooz/ui-web'

export default function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton width="100%" height={220} borderRadius={16} />

      <Section title="Categories">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Skeleton width={72} height={72} circle />
              <Skeleton width={56} height={10} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Flash Deals" action={{ label: 'See All' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton height={160} borderRadius={12} />
              <Skeleton width="100%" height={12} />
              <Skeleton width="50%" height={14} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Popular Near You">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton height={200} borderRadius={12} />
              <Skeleton width="100%" height={14} />
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={16} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Recommended">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton height={200} borderRadius={12} />
              <Skeleton width="100%" height={14} />
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={16} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
