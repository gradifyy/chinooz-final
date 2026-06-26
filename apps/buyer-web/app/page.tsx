'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { ProductCardWeb, CategoryCardWeb, DealCardWeb, SectionHeaderWeb, ShimmerWeb } from '@chinooz/ui-web'
import Link from 'next/link'

export default function HomePage() {
  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured'],
    queryFn: () => api.getFeaturedProducts(),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  const { data: deals } = useQuery({
    queryKey: ['deals'],
    queryFn: () => api.getDeals(),
  })

  const { data: newArrivals } = useQuery({
    queryKey: ['newArrivals'],
    queryFn: () => api.getNewArrivals(),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Banner */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#8A1B57] to-[#6E1545] h-64 md:h-80">
        <div className="absolute inset-0 flex items-center px-8 md:px-16">
          <div className="max-w-lg">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Shop Nepal, Love Local
            </h1>
            <p className="text-white/80 text-sm md:text-base mb-6">
              Discover amazing products from across Nepal at the best prices.
            </p>
            <Link
              href="/deals"
              className="inline-block bg-[#E0A93B] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#c9952e] transition-colors"
            >
              Shop Today's Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Deals */}
      {deals && deals.length > 0 && (
        <section>
          <SectionHeaderWeb title="🔥 Today's Deals" href="/deals" />
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {deals.map(deal => (
              <DealCardWeb key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section>
          <SectionHeaderWeb title="Shop by Category" href="/categories" />
          <div className="flex gap-6 overflow-x-auto pb-2 -mx-4 px-4">
            {categories.slice(0, 10).map(cat => (
              <CategoryCardWeb key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section>
        <SectionHeaderWeb title="Featured Products" />
        {loadingFeatured ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <ShimmerWeb key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured?.slice(0, 8).map(product => (
              <ProductCardWeb key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section>
        <SectionHeaderWeb title="✨ New Arrivals" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {newArrivals?.slice(0, 8).map(product => (
            <ProductCardWeb key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
