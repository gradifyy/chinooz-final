import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ErrorBoundary } from '@chinooz/ui'
import { ThemeProvider } from '../components/ThemeProvider'
import { QueryProvider } from '../components/QueryProvider'
import { I18nProvider } from '../components/I18nProvider'
import { A11yProvider } from '../components/A11yProvider'
import { AnalyticsProvider } from '../components/AnalyticsProvider'
import { AppStateProvider } from '../components/AppStateProvider'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <I18nProvider>
            <AnalyticsProvider>
              <A11yProvider>
                <AppStateProvider>
                  <SafeAreaProvider>
                    <StatusBar style="light" />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
                      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="rider-agreement" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="jobs" options={{ animation: 'fade' }} />
                      <Stack.Screen name="hotspots" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="wallet" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="incentives" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="earnings" options={{ animation: 'slide_from_right' }} />
                      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
                    </Stack>
                  </SafeAreaProvider>
                </AppStateProvider>
              </A11yProvider>
            </AnalyticsProvider>
          </I18nProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
