import { View, Text } from 'react-native'
import { Screen } from '@chinooz/ui'

export default function DealsScreen() {
  return (
    <Screen>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#8A1B57' }}>🔥 Deals</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>Today's best deals</Text>
      </View>
    </Screen>
  )
}
