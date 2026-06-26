import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCartStore } from '@chinooz/state'
import { Screen, Skeleton, Stack, Row, Divider } from '@chinooz/ui'

function CartItemSkeleton() {
  return (
    <Row gap={12} align="flex-start">
      <Skeleton width={80} height={80} borderRadius={12} />
      <Stack gap={8} style={{ flex: 1 }}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="40%" height={12} />
        <Row justify="space-between" align="center">
          <Skeleton width={90} height={32} borderRadius={8} />
          <Skeleton width={60} height={16} />
        </Row>
      </Stack>
    </Row>
  )
}

export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const count = useCartStore(s => s.count)
  const increment = useCartStore(s => s.increment)
  const decrement = useCartStore(s => s.decrement)

  return (
    <Screen safeArea={false}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 18, color: '#8A1B57', fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937' }}>Cart ({count})</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Stack gap={16}>
          <Skeleton width="40%" height={22} />
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i}>
              <CartItemSkeleton />
              {i < 2 && <Divider />}
            </View>
          ))}
          <Divider />
          <Stack gap={8}>
            <Row justify="space-between">
              <Skeleton width="25%" height={14} />
              <Skeleton width="20%" height={14} />
            </Row>
            <Row justify="space-between">
              <Skeleton width="20%" height={14} />
              <Skeleton width="15%" height={14} />
            </Row>
            <Row justify="space-between">
              <Skeleton width="15%" height={18} />
              <Skeleton width="25%" height={18} />
            </Row>
          </Stack>
          <Skeleton width="100%" height={52} borderRadius={12} />
        </Stack>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 16, paddingBottom: 32 }}>
          <TouchableOpacity onPress={decrement} style={{ backgroundColor: '#E5E5E5', borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>−</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>{count}</Text>
          <TouchableOpacity onPress={increment} style={{ backgroundColor: '#8A1B57', borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', paddingBottom: 16 }}>Use +/- to test the live badge count</Text>
      </View>
    </Screen>
  )
}
