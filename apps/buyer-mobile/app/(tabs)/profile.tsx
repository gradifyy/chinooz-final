import { View, Text } from 'react-native'

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-text">Profile</Text>
      <Text className="text-sm text-text-muted mt-2">Account, Orders & Wishlist</Text>
    </View>
  )
}
