import React from 'react'
import { View, Text } from 'react-native'

interface StarRatingProps {
  rating: number
  size?: number
}

export default function StarRating({ rating, size = 12 }: StarRatingProps) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <View className="flex-row items-center">
      <Text style={{ fontSize: size, color: '#E0A93B' }}>
        {'★'.repeat(full)}
        {half ? '½' : ''}
        {'☆'.repeat(empty)}
      </Text>
    </View>
  )
}
