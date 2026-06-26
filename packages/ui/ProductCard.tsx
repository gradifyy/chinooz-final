import React from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { Product } from '@chinooz/types'
import { formatNPR } from '@chinooz/utils'
import Badge from './Badge'
import StarRating from './StarRating'

interface ProductCardProps {
  product: Product
  onPress: (product: Product) => void
  horizontal?: boolean
}

export default function ProductCard({ product, onPress, horizontal }: ProductCardProps) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0

  if (horizontal) {
    return (
      <TouchableOpacity
        onPress={() => onPress(product)}
        className="bg-white rounded-xl overflow-hidden mr-3 w-40"
        style={{ elevation: 1 }}
      >
        <View className="relative">
          <Image
            source={{ uri: product.images[0] }}
            className="w-full h-36"
            resizeMode="cover"
          />
          {discount > 0 && (
            <View className="absolute top-2 left-2">
              <Badge label={`-${discount}%`} variant="deal" />
            </View>
          )}
          {!product.inStock && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center">
              <Text className="text-white text-sm font-semibold">Out of Stock</Text>
            </View>
          )}
        </View>
        <View className="p-2.5">
          <Text className="text-xs text-gray-500" numberOfLines={1}>{product.brand}</Text>
          <Text className="text-sm font-semibold text-gray-900 mt-0.5" numberOfLines={1}>{product.name}</Text>
          <View className="flex-row items-center mt-1">
            <StarRating rating={product.rating} size={10} />
            <Text className="text-xs text-gray-400 ml-1">({product.reviewCount})</Text>
          </View>
          <View className="flex-row items-center mt-1.5">
            <Text className="text-sm font-bold text-[#8A1B57]">{formatNPR(product.price)}</Text>
            {product.compareAtPrice && (
              <Text className="text-xs text-gray-400 line-through ml-1.5">
                {formatNPR(product.compareAtPrice)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(product)}
      className="bg-white rounded-xl overflow-hidden mb-3 flex-row"
      style={{ elevation: 1 }}
    >
      <View className="relative">
        <Image
          source={{ uri: product.images[0] }}
          className="w-28 h-28"
          resizeMode="cover"
        />
        {discount > 0 && (
          <View className="absolute top-1 left-1">
            <Badge label={`-${discount}%`} variant="deal" size="sm" />
          </View>
        )}
      </View>
      <View className="flex-1 p-3 justify-center">
        <Text className="text-xs text-gray-500">{product.brand}</Text>
        <Text className="text-sm font-semibold text-gray-900 mt-0.5" numberOfLines={2}>{product.name}</Text>
        <View className="flex-row items-center mt-1">
          <StarRating rating={product.rating} size={10} />
          <Text className="text-xs text-gray-400 ml-1">({product.reviewCount})</Text>
        </View>
        <View className="flex-row items-center mt-1.5">
          <Text className="text-sm font-bold text-[#8A1B57]">{formatNPR(product.price)}</Text>
          {product.compareAtPrice && (
            <Text className="text-xs text-gray-400 line-through ml-1.5">
              {formatNPR(product.compareAtPrice)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}
