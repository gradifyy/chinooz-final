import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCartStore } from '@chinooz/state'

export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const count = useCartStore(s => s.count)
  const increment = useCartStore(s => s.increment)
  const decrement = useCartStore(s => s.decrement)

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-primary font-semibold">Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-text">Cart ({count})</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-bold text-text">Your Cart</Text>
        <Text className="text-sm text-text-muted mt-2">{count} item{count !== 1 ? 's' : ''} in cart</Text>
        <View className="flex-row items-center mt-6 gap-4">
          <TouchableOpacity onPress={decrement} className="bg-border rounded-xl w-12 h-12 items-center justify-center">
            <Text className="text-xl font-bold text-text">−</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-text">{count}</Text>
          <TouchableOpacity onPress={increment} className="bg-primary rounded-xl w-12 h-12 items-center justify-center">
            <Text className="text-xl font-bold text-white">+</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-text-muted mt-4">Use +/- to test the live badge count</Text>
      </View>
    </View>
  )
}
