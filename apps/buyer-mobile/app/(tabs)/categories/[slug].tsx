import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProductCard, EmptyState, Shimmer } from '@chinooz/ui'

export default function CategoryProductsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()

  const { data: category } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.getCategoryBySlug(slug ?? ''),
  })

  const { data: products, isLoading } = useQuery({
    queryKey: ['category-products', slug],
    queryFn: () => api.getProductsByCategory(slug ?? ''),
  })

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold text-gray-900">{category?.name ?? slug}</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View>
            {[1, 2, 3].map(i => <Shimmer key={i} width="100%" height={120} borderRadius={12} className="mb-3" />)}
          </View>
        ) : products && products.length > 0 ? (
          products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))
        ) : (
          <EmptyState icon="📦" title="No products found" subtitle="Check back later for new arrivals" />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
