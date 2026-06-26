import { View, Text } from 'react-native'

export default function InboxScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-bold text-text">Inbox</Text>
      <Text className="text-sm text-text-muted mt-2">Notifications & messages</Text>
    </View>
  )
}
