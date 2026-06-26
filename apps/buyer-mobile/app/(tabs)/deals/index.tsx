import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProductCard, DealCard, SectionHeader, Shimmer } from '@chinooz/ui'

export default function DealsScreen() {
  const router = useRouter()

  const { data: deals } = useQuery({
    queryKey: ['deals'],
    queryFn: () => api.getDeals(),
  })

  const { data: dealProducts, isLoading } = useQuery({
    queryKey: ['deal-products'],
    queryFn: () => api.getDealProducts(),
  })

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">🔥 Today's Deals</Text>
        <Text className="text-sm text-gray-500 mt-1">Limited time offers you can't miss</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {deals && deals.length > 0 && (
          <View className="mb-6">
            <SectionHeader title="Flash Sales" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              {deals.filter(d => d.type === 'flash').map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onPress={() => router.push(`/product/${deal.productId}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <SectionHeader title="All Deals" />
        {isLoading ? (
          <View>
            {[1, 2, 3].map(i => <Shimmer key={i} width="100%" height={120} borderRadius={12} className="mb-3" />)}
          </View>
        ) : (
          dealProducts?.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
