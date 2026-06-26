import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Screen } from '@chinooz/ui'

export default function DealsScreen() {
  const { t } = useTranslation()

  return (
    <Screen>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#8A1B57' }}>🔥 {t('deals.title')}</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>{t('deals.subtitle')}</Text>
      </View>
    </Screen>
  )
}
