'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { ProductCardWeb, SearchBarWeb, ShimmerWeb, EmptyStateWeb } from '@chinooz/ui-web'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.searchProducts(query),
    enabled: query.length >= 2,
  })

  const trending = ['Samsung', 'iPhone', 'Sneakers', 'Pashmina', 'Rice']

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="max-w-xl mb-8">
        <SearchBarWeb value={query} onChange={setQuery} />
      </div>

      {query.length === 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Trending Now</h2>
          <div className="flex flex-wrap gap-2">
            {trending.map(t => (
              <button
                key={t}
                onClick={() => setQuery(t)}
                className="bg-white px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-[#8A1B57] hover:text-[#8A1B57] transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {query.length > 0 && isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <ShimmerWeb key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      )}

      {query.length > 0 && !isLoading && results && results.length > 0 && (
        <>
          <p className="text-sm text-gray-400 mb-4">{results.length} results for "{query}"</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(product => (
              <ProductCardWeb key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      {query.length > 0 && !isLoading && results?.length === 0 && (
        <EmptyStateWeb icon="🔍" title="No results found" subtitle={`No products matching "${query}"`} />
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><ShimmerWeb className="h-10 w-80 rounded-xl" /></div>}>
      <SearchContent />
    </Suspense>
  )
}
