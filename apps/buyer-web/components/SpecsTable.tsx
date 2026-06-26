'use client'

import React from 'react'
import type { Product } from '@chinooz/types'

interface SpecsTableProps {
  product: Product
}

export default function SpecsTable({ product }: SpecsTableProps) {
  const specs = [
    { key: 'Brand', value: product.sellerName },
    { key: 'Category', value: product.categoryId },
    { key: 'Rating', value: `${product.rating} / 5 (${product.reviewCount} reviews)` },
    { key: 'Stock', value: product.stock === 'in_stock' ? 'In Stock' : product.stock === 'low_stock' ? 'Low Stock' : 'Out of Stock' },
    { key: 'Currency', value: product.currency },
    ...product.variants.flatMap(v =>
      Object.entries(v.attributes).map(([k, val]) => ({
        key: `${v.name} — ${k}`,
        value: val,
      }))
    ),
  ]

  return (
    <div>
      {specs.map((spec, i) => (
        <div
          key={i}
          className={`flex py-2.5 gap-3 ${
            i < specs.length - 1 ? 'border-b border-border-light' : ''
          }`}
        >
          <span className="text-sm text-text-muted w-32 shrink-0">{spec.key}</span>
          <span className="text-sm text-text flex-1">{spec.value}</span>
        </div>
      ))}
    </div>
  )
}
