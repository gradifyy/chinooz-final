import React from 'react'
import { Text, Image, TouchableOpacity } from 'react-native'
import type { Category } from '@chinooz/types'

interface CategoryCardProps {
  category: Category
  onPress: (category: Category) => void
}

export default function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(category)}
      className="items-center mr-4"
    >
      <Image
        source={{ uri: category.image }}
        className="w-16 h-16 rounded-full"
        resizeMode="cover"
      />
      <Text className="text-xs text-gray-700 mt-1.5 text-center" numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  )
}
