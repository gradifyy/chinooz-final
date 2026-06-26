import { View, Text } from 'react-native'

export default function DealsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-primary">🔥 Deals</Text>
      <Text className="text-sm text-text-muted mt-2">Today's best deals</Text>
    </View>
  )
}
