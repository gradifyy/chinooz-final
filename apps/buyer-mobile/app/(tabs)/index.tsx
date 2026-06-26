import { View, Text } from 'react-native'

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-text">Home</Text>
      <Text className="text-sm text-text-muted mt-2">Your feed will appear here</Text>
    </View>
  )
}
