import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { SearchBar, ProductCard, EmptyState, Shimmer } from '@chinooz/ui'

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>()
  const router = useRouter()
  const [query, setQuery] = useState(q ?? '')

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.searchProducts(query),
    enabled: query.length >= 2,
  })

  const trending = ['Samsung', 'iPhone', 'Sneakers', 'Pashmina', 'Rice']

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-4 pt-2 pb-3">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={() => {}}
          onClear={() => setQuery('')}
        />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {query.length === 0 && (
          <>
            <Text className="text-sm font-semibold text-gray-700 mb-3">Trending Now</Text>
            <View className="flex-row flex-wrap gap-2">
              {trending.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setQuery(t)}
                  className="bg-white px-4 py-2 rounded-full border border-gray-200"
                >
                  <Text className="text-sm text-gray-700">{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {query.length > 0 && isLoading && (
          <View>
            {[1, 2, 3].map(i => <Shimmer key={i} width="100%" height={120} borderRadius={12} className="mb-3" />)}
          </View>
        )}

        {query.length > 0 && !isLoading && results && results.length > 0 && (
          <>
            <Text className="text-xs text-gray-400 mb-3">{results.length} results for "{query}"</Text>
            {results.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </>
        )}

        {query.length > 0 && !isLoading && results?.length === 0 && (
          <EmptyState icon="🔍" title="No results found" subtitle={`No products matching "${query}"`} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
