'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { ProductCardWeb, ShimmerWeb, EmptyStateWeb } from '@chinooz/ui-web'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: category } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.getCategoryBySlug(slug),
  })

  const { data: products, isLoading } = useQuery({
    queryKey: ['category-products', slug],
    queryFn: () => api.getProductsByCategory(slug),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{category?.name ?? slug}</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <ShimmerWeb key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCardWeb key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyStateWeb icon="📦" title="No products found" subtitle="Check back later for new arrivals" />
      )}
    </div>
  )
}
