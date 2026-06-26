import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen } from '@chinooz/ui'

export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <Screen safeArea={false}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 18, color: '#8A1B57', fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, backgroundColor: '#FAFAFA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Search products...</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>Search</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>Find anything on Chinooz</Text>
      </View>
    </Screen>
  )
}
