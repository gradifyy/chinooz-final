'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { cartStore, wishlistStore } from '@chinooz/state'
import { formatNPR, formatDiscount } from '@chinooz/utils'
import { StarRatingWeb, ShimmerWeb } from '@chinooz/ui-web'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const addToCart = cartStore(s => s.addItem)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id),
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.getReviewsForProduct(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ShimmerWeb className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <ShimmerWeb className="h-6 w-1/3 rounded" />
            <ShimmerWeb className="h-8 w-2/3 rounded" />
            <ShimmerWeb className="h-6 w-1/4 rounded" />
            <ShimmerWeb className="h-24 w-full rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    )
  }

  const discount = product.compareAtPrice
    ? formatDiscount(product.compareAtPrice, product.price)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1">
        ← Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {discount > 0 && (
            <div className="absolute top-4 left-4 bg-[#E0A93B] text-white text-sm font-bold px-3 py-1 rounded-full">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.brand && (
            <p className="text-sm text-gray-500 uppercase tracking-wider">{product.brand}</p>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>

          <div className="flex items-center mt-3">
            <StarRatingWeb rating={product.rating} />
            <span className="text-sm text-gray-500 ml-2">({product.reviewCount} reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#8A1B57]">{formatNPR(product.price)}</span>
            {product.compareAtPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatNPR(product.compareAtPrice)}</span>
                <span className="text-sm text-green-600 font-semibold">You save {formatNPR(product.compareAtPrice - product.price)}</span>
              </>
            )}
          </div>

          {!product.inStock && (
            <div className="mt-3 bg-red-50 text-red-600 text-sm font-semibold px-3 py-1.5 rounded-lg inline-block">
              Out of Stock
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Sold by <span className="font-semibold text-[#8A1B57]">{product.sellerName}</span>
          </div>

          {product.inStock && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  addToCart(product)
                  router.push('/cart')
                }}
                className="flex-1 bg-[#8A1B57] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#6E1545] transition-colors"
              >
                Add to Cart
              </button>
            </div>
          )}

          {/* Reviews */}
          {reviews && reviews.length > 0 && (
            <div className="mt-10">
              <h3 className="font-semibold text-gray-900 mb-4">Reviews ({reviews.length})</h3>
              <div className="space-y-3">
                {reviews.slice(0, 3).map(review => (
                  <div key={review.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">{review.userName}</span>
                      <StarRatingWeb rating={review.rating} />
                    </div>
                    {review.title && <p className="text-sm font-semibold text-gray-700 mb-1">{review.title}</p>}
                    <p className="text-sm text-gray-500">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
