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
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="splash" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="phone-entry" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="search" options={{ presentation: 'modal' }} />
              <Stack.Screen name="product/[id]" />
              <Stack.Screen name="cart" options={{ presentation: 'card' }} />
              <Stack.Screen name="orders" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="orders/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="wishlist" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="payments" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="help" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="contact" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="feedback" options={{ animation: 'slide_from_right' }} />
            </Stack>
          </SafeAreaProvider>
        </I18nProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
