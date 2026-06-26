import React from 'react'
import { View, Text } from 'react-native'
import { colors, spacing, radii } from '@chinooz/theme'
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
    <View>
      {specs.map((spec, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            paddingVertical: spacing[2.5],
            borderBottomWidth: i < specs.length - 1 ? 1 : 0,
            borderBottomColor: colors.borderLight,
            gap: spacing[3],
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '400', color: colors.textMuted, width: 120 }}>
            {spec.key}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: colors.text, flex: 1 }}>
            {spec.value}
          </Text>
        </View>
      ))}
    </View>
  )
}
