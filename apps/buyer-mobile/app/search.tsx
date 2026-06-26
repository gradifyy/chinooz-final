import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary font-semibold">Back</Text>
        </TouchableOpacity>
        <View className="flex-1 bg-background rounded-xl px-3 py-2.5">
          <Text className="text-text-muted text-sm">Search products...</Text>
        </View>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-text">Search</Text>
        <Text className="text-sm text-text-muted mt-2">Find anything on Chinooz</Text>
      </View>
    </View>
  )
}
