'use client'

import React from 'react'
import { Skeleton, Container, Screen } from '@chinooz/ui-web'
import { useTranslation } from 'react-i18next'

export function OrderDetailSkeleton() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Container className="py-6 max-w-[800px]">
        {/* Back + title row */}
        <div className="flex items-center gap-3 mb-6" aria-busy="true" aria-label={t('seller.orders.detailLoading')}>
          <Skeleton width={40} height={40} borderRadius={9999} />
          <Skeleton width={180} height={24} />
        </div>

        {/* Header card */}
        <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton width={160} height={22} />
              <Skeleton width={120} height={14} />
            </div>
            <Skeleton width={80} height={24} borderRadius={9999} />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton width={72} height={20} borderRadius={9999} />
            <Skeleton width={100} height={14} />
          </div>
        </div>

        {/* Items section */}
        <div className="space-y-3 mb-6">
          <Skeleton width={120} height={18} />
          <div className="h-px bg-border" />
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton width={56} height={56} borderRadius={8} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="40%" height={12} />
                </div>
                <Skeleton width={60} height={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="space-y-3 mb-6">
          <Skeleton width={140} height={18} />
          <div className="h-px bg-border" />
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex justify-between">
                <Skeleton width={100} height={14} />
                <Skeleton width={60} height={14} />
              </div>
            ))}
            <div className="h-px bg-border-light my-1" />
            <div className="flex justify-between">
              <Skeleton width={60} height={18} />
              <Skeleton width={80} height={18} />
            </div>
          </div>
        </div>

        {/* Buyer & shipping */}
        <div className="space-y-3 mb-6">
          <Skeleton width={120} height={18} />
          <div className="h-px bg-border" />
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="space-y-1">
                <Skeleton width={80} height={12} />
                <Skeleton width="60%" height={16} />
              </div>
            ))}
            <div className="h-px bg-border-light" />
            <div className="flex justify-between">
              <div className="space-y-1">
                <Skeleton width={80} height={12} />
                <Skeleton width={100} height={14} />
              </div>
              <div className="space-y-1 text-right">
                <Skeleton width={80} height={12} />
                <Skeleton width={80} height={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3 mb-6">
          <Skeleton width={120} height={18} />
          <div className="h-px bg-border" />
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton width={24} height={24} borderRadius={9999} />
                <Skeleton width="40%" height={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Sticky action bar skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-light px-4 py-3">
          <div className="max-w-[800px] mx-auto flex justify-end gap-2">
            <Skeleton width={120} height={40} borderRadius={6} />
            <Skeleton width={120} height={40} borderRadius={6} />
          </div>
        </div>
      </Container>
    </Screen>
  )
}

export default OrderDetailSkeleton
