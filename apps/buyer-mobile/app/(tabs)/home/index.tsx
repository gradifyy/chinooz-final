import React, { useState } from 'react'
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { ProductCard, CategoryCard, DealCard, SearchBar, SectionHeader, CartBadge, Shimmer } from '@chinooz/ui'
import type { Product, Category, Deal } from '@chinooz/types'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured'],
    queryFn: () => api.getFeaturedProducts(),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  const { data: deals } = useQuery({
    queryKey: ['deals'],
    queryFn: () => api.getDeals(),
  })

  const { data: newArrivals } = useQuery({
    queryKey: ['newArrivals'],
    queryFn: () => api.getNewArrivals(),
  })

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-[#8A1B57]">Chinooz</Text>
            <Text className="text-xs text-gray-500">Nepal's marketplace</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => router.push('/search')} className="p-2">
              <Text className="text-xl">🔍</Text>
            </TouchableOpacity>
            <CartBadge onPress={() => router.push('/cart')} />
          </View>
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onSubmit={() => router.push(`/search?q=${encodeURIComponent(search)}`)}
          onClear={() => setSearch('')}
        />
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {deals && deals.length > 0 && (
          <View className="mb-6">
            <SectionHeader title="🔥 Today's Deals" actionLabel="View All" onAction={() => router.push('/(tabs)/deals')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              {deals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onPress={() => router.push(`/product/${deal.productId}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {categories && categories.length > 0 && (
          <View className="mb-6">
            <SectionHeader title="Shop by Category" actionLabel="See All" onAction={() => router.push('/(tabs)/categories')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.slice(0, 10).map(cat => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onPress={() => router.push(`/(tabs)/categories/${cat.slug}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View className="mb-6">
          <SectionHeader title="Featured Products" />
          {loadingFeatured ? (
            <View className="flex-row space-x-3">
              {[1, 2, 3].map(i => (
                <Shimmer key={i} width={140} height={200} borderRadius={12} />
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {featured?.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  horizontal
                  onPress={() => router.push(`/product/${product.id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-6">
          <SectionHeader title="✨ New Arrivals" />
          {newArrivals?.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
