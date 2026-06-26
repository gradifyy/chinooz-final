import { View, Text } from 'react-native'

export default function CategoriesScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-text">Categories</Text>
      <Text className="text-sm text-text-muted mt-2">Browse by category</Text>
    </View>
  )
}
