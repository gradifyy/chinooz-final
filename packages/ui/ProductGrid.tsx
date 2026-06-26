import React from 'react'
import { View, Dimensions } from 'react-native'
import Skeleton from './Skeleton'

interface ProductGridProps {
  count?: number
  columns?: number
  gap?: number
}

export default function ProductGrid({
  count = 6,
  columns,
  gap = 12,
}: ProductGridProps) {
  const screenWidth = Dimensions.get('window').width
  const resolvedColumns = columns ?? (screenWidth >= 768 ? 3 : 2)
  const itemWidth = (screenWidth - 16 * 2 - gap * (resolvedColumns - 1)) / resolvedColumns
  const imageHeight = itemWidth * 1.25

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: itemWidth }}>
          <Skeleton width={itemWidth} height={imageHeight} borderRadius={12} />
          <View style={{ gap: 6, marginTop: 8 }}>
            <Skeleton width="100%" height={14} />
            <Skeleton width="60%" height={12} />
            <Skeleton width="40%" height={16} />
          </View>
        </View>
      ))}
    </View>
  )
}
