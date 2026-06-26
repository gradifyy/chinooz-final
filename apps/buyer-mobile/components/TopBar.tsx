import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@chinooz/state'

export default function TopBar() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <View
      style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8A1B57' }}>{t('common.appName')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={{ flex: 1, marginHorizontal: 12, backgroundColor: '#FAFAFA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>{t('common.searchPlaceholder')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 20 }}>🛒</Text>
          {count > 0 && (
            <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#DC2626', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
