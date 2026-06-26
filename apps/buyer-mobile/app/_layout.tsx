import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ErrorBoundary } from '@chinooz/ui'
import { QueryProvider } from '../components/QueryProvider'
import { I18nProvider } from '../components/I18nProvider'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <I18nProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="search" options={{ presentation: 'modal' }} />
              <Stack.Screen name="product/[id]" />
              <Stack.Screen name="cart" options={{ presentation: 'card' }} />
            </Stack>
          </SafeAreaProvider>
        </I18nProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
