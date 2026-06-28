import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ErrorBoundary } from '@chinooz/ui'
import { QueryProvider } from '../components/QueryProvider'
import { I18nProvider } from '../components/I18nProvider'
import { AnalyticsProvider } from '../components/AnalyticsProvider'
import { A11yProvider } from '../components/A11yProvider'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <I18nProvider>
          <AnalyticsProvider>
            <A11yProvider>
              <SafeAreaProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
                  <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                  <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="messages" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="messages/[thread]" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="promotions" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="reviews" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="finance" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="analytics" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="inventory" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/[id]" options={{ animation: 'slide_from_right' }} />
                </Stack>
              </SafeAreaProvider>
            </A11yProvider>
          </AnalyticsProvider>
        </I18nProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
