import { View, Text } from 'react-native'
import { Screen } from '@chinooz/ui'

export default function InboxScreen() {
  return (
    <Screen>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937' }}>Inbox</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>Notifications &amp; messages</Text>
      </View>
    </Screen>
  )
}
