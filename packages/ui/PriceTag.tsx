import React from 'react'
import { View, Text } from 'react-native'
import { formatNPR } from '@chinooz/utils'

interface PriceTagProps {
  price: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
}

export default function PriceTag({ price, compareAtPrice, size = 'md' }: PriceTagProps) {
  const textSize = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm'
  const oldSize = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <View className="flex-row items-baseline">
      <Text className={`${textSize} font-bold text-[#8A1B57]`}>{formatNPR(price)}</Text>
      {compareAtPrice && compareAtPrice > price && (
        <Text className={`${oldSize} text-gray-400 line-through ml-2`}>{formatNPR(compareAtPrice)}</Text>
      )}
    </View>
  )
}
