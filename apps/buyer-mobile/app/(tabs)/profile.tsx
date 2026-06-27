import { View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Screen, Stack, Divider } from '@chinooz/ui'
import { useUIStore } from '@chinooz/state'
import type { Locale } from '@chinooz/state'

export default function ProfileScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ne' : 'en')
  }

  const menuItems = [
    { key: 'profile.myOrders', icon: '📦', onPress: () => router.push('/orders') },
    { key: 'profile.wishlist', icon: '❤️', onPress: () => {} },
    { key: 'profile.addresses', icon: '📍', onPress: () => {} },
    { key: 'profile.settings', icon: '⚙️', onPress: () => {} },
    { key: 'profile.help', icon: '❓', onPress: () => {} },
  ]

  return (
    <Screen>
      <Stack gap={20}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>{t('profile.title')}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{t('profile.subtitle')}</Text>
        </View>

        <Divider />

        <TouchableOpacity
          onPress={toggleLocale}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 4,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: '500' }}>{t('profile.language')}</Text>
          <View style={{
            backgroundColor: '#F8EAF1',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ fontSize: 14, color: '#8A1B57', fontWeight: '600' }}>
              {locale === 'en' ? t('profile.nepali') : t('profile.english')}
            </Text>
          </View>
        </TouchableOpacity>

        <Divider />

        {menuItems.map(item => (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 4,
              gap: 12,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={{ fontSize: 16, color: '#1F2937' }}>{t(item.key)}</Text>
          </TouchableOpacity>
        ))}
      </Stack>
    </Screen>
  )
}
