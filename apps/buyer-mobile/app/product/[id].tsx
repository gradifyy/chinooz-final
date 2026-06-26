import { View, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary font-semibold">Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-text">Product</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-text">Product Detail</Text>
        <Text className="text-sm text-text-muted mt-2">ID: {id}</Text>
      </View>
    </View>
  )
}
