import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { wishlistStore } from '@chinooz/state'
import { ProductCard, EmptyState } from '@chinooz/ui'

export default function WishlistScreen() {
  const router = useRouter()
  const items = wishlistStore(s => s.items)

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold text-gray-900">My Wishlist</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {items.length === 0 ? (
          <EmptyState icon="❤️" title="Your wishlist is empty" subtitle="Save items you love to your wishlist" />
        ) : (
          items.map(product => (
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
