import { Redirect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@chinooz/mock-data'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { isLoading } = useQuery({
    queryKey: ['init'],
    queryFn: () => api.getProducts(),
  })

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#8A1B57" />
      </View>
    )
  }

  return <Redirect href="/(tabs)/home" />
}
