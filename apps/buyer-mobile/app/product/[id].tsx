import React, { useState } from 'react'
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { cartStore, wishlistStore } from '@chinooz/state'
import { formatNPR, formatDiscount } from '@chinooz/utils'
import { Badge, StarRating, Shimmer, PriceTag } from '@chinooz/ui'

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const addToCart = cartStore(s => s.addItem)
  const toggleWishlist = wishlistStore(s => s.toggleItem)
  const isWishlisted = wishlistStore(s => s.hasItem(id ?? ''))

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.getProductById(id ?? ''),
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.getReviewsForProduct(id ?? ''),
    enabled: !!id,
  })

  if (isLoading || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="p-4">
          <Shimmer width="100%" height={300} borderRadius={12} />
          <View className="mt-4">
            <Shimmer width="60%" height={20} borderRadius={4} />
            <Shimmer width="100%" height={16} borderRadius={4} className="mt-2" />
            <Shimmer width="40%" height={24} borderRadius={4} className="mt-3" />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const discount = product.compareAtPrice
    ? formatDiscount(product.compareAtPrice, product.price)
    : 0

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="relative">
          <Image
            source={{ uri: product.images[0] }}
            className="w-full h-80"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full items-center justify-center"
            style={{ elevation: 3 }}
          >
            <Text className="text-lg text-gray-700">←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleWishlist(product)}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full items-center justify-center"
            style={{ elevation: 3 }}
          >
            <Text className="text-lg">{isWishlisted ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          {discount > 0 && (
            <View className="absolute bottom-4 left-4">
              <Badge label={`${discount}% OFF`} variant="deal" />
            </View>
          )}
        </View>

        <View className="px-4 pt-4">
          {product.brand && (
            <Text className="text-xs text-gray-500 uppercase tracking-wider">{product.brand}</Text>
          )}
          <Text className="text-xl font-bold text-gray-900 mt-1">{product.name}</Text>

          <View className="flex-row items-center mt-2">
            <StarRating rating={product.rating} />
            <Text className="text-sm text-gray-500 ml-2">({product.reviewCount} reviews)</Text>
          </View>

          <View className="mt-3">
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          </View>

          {!product.inStock && (
            <View className="mt-2 bg-red-50 px-3 py-1.5 rounded-full self-start">
              <Text className="text-xs text-red-600 font-semibold">Out of Stock</Text>
            </View>
          )}

          {product.inStock && product.stockCount < 20 && (
            <Text className="text-xs text-orange-500 mt-2">Only {product.stockCount} left in stock</Text>
          )}

          <View className="mt-4">
            <Text className="text-sm font-semibold text-gray-900 mb-1">Description</Text>
            <Text className="text-sm text-gray-600 leading-5">{product.description}</Text>
          </View>

          <View className="mt-4 flex-row items-center">
            <Text className="text-xs text-gray-500">Sold by </Text>
            <Text className="text-xs font-semibold text-[#8A1B57]">{product.sellerName}</Text>
          </View>

          {reviews && reviews.length > 0 && (
            <View className="mt-6">
              <Text className="text-sm font-semibold text-gray-900 mb-3">Reviews ({reviews.length})</Text>
              {reviews.slice(0, 3).map(review => (
                <View key={review.id} className="bg-white rounded-xl p-3 mb-2" style={{ elevation: 1 }}>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-semibold text-gray-900">{review.userName}</Text>
                    <StarRating rating={review.rating} size={10} />
                  </View>
                  {review.title && <Text className="text-xs font-semibold text-gray-700 mb-1">{review.title}</Text>}
                  <Text className="text-xs text-gray-500">{review.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {product.inStock && (
        <View className="px-4 py-3 bg-white border-t border-gray-100 flex-row gap-3">
          <TouchableOpacity
            onPress={() => {
              addToCart(product)
              router.push('/cart')
            }}
            className="flex-1 bg-[#8A1B57] py-3 rounded-xl"
          >
            <Text className="text-white text-center font-semibold">Add to Cart</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
