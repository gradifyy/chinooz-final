import React from 'react'
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SearchBar, Shimmer } from '@chinooz/ui'

export default function CategoriesScreen() {
  const router = useRouter()
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Categories</Text>
        <SearchBar
          value=""
          onChangeText={() => {}}
          placeholder="Search categories..."
        />
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {isLoading ? (
          <View className="flex-row flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Shimmer key={i} width="47%" height={120} borderRadius={12} />
            ))}
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {categories?.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => router.push(`/(tabs)/categories/${cat.slug}`)}
                className="w-[48%] bg-white rounded-xl overflow-hidden mb-1"
                style={{ elevation: 1 }}
              >
                <Image
                  source={{ uri: cat.image }}
                  className="w-full h-24"
                  resizeMode="cover"
                />
                <View className="p-2.5">
                  <Text className="text-sm font-semibold text-gray-900">{cat.name}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{cat.productCount} items</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
