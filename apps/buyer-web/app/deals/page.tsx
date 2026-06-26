'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { ProductCardWeb, DealCardWeb, SectionHeaderWeb, ShimmerWeb } from '@chinooz/ui-web'

export default function DealsPage() {
  const { data: deals } = useQuery({
    queryKey: ['deals'],
    queryFn: () => api.getDeals(),
  })

  const { data: dealProducts, isLoading } = useQuery({
    queryKey: ['deal-products'],
    queryFn: () => api.getDealProducts(),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🔥 Today's Deals</h1>
        <p className="text-gray-500 mt-1">Limited time offers you can't miss</p>
      </div>

      {deals && deals.length > 0 && (
        <section className="mb-10">
          <SectionHeaderWeb title="Flash Sales" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            {deals.filter(d => d.type === 'flash').map(deal => (
              <DealCardWeb key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeaderWeb title="All Deals" />
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <ShimmerWeb key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dealProducts?.map(product => (
              <ProductCardWeb key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
