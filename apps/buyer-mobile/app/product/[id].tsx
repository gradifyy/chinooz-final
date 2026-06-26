import { View, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Screen, Skeleton, Stack, Row } from '@chinooz/ui'

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <Screen safeArea={false} noScroll>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 18, color: '#8A1B57', fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937' }}>Product</Text>
        </View>
      </View>
      <Stack gap={20}>
        <Skeleton width="100%" height={320} borderRadius={0} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Skeleton width="80%" height={22} />
          <Skeleton width="40%" height={16} />
          <Row gap={8}>
            <Skeleton width={100} height={28} borderRadius={14} />
            <Skeleton width={80} height={28} borderRadius={14} />
          </Row>
          <Stack gap={8}>
            <Skeleton width="30%" height={16} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="60%" height={14} />
          </Stack>
          <Row gap={8} style={{ marginTop: 8 }}>
            <Skeleton width="50%" height={48} borderRadius={12} />
            <Skeleton width="50%" height={48} borderRadius={12} />
          </Row>
        </View>
      </Stack>
    </Screen>
  )
}
