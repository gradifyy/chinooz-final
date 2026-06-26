'use client'

import React from 'react'
import Link from 'next/link'
import type { Product } from '@chinooz/types'
import { formatNPR } from '@chinooz/utils'
import StarRatingWeb from './StarRatingWeb'

interface ProductCardWebProps {
  product: Product
}

export default function ProductCardWeb({ product }: ProductCardWebProps) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200"
    >
      <div className="relative aspect-square bg-gray-50">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-[#E0A93B] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">{product.brand}</p>
        <h3 className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2">{product.name}</h3>
        <div className="flex items-center mt-1">
          <StarRatingWeb rating={product.rating} />
          <span className="text-xs text-gray-400 ml-1">({product.reviewCount})</span>
        </div>
        <div className="flex items-center mt-2 gap-1.5">
          <span className="text-sm font-bold text-[#8A1B57]">{formatNPR(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-xs text-gray-400 line-through">{formatNPR(product.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
