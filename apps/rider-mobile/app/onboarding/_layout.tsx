import { Stack } from 'expo-router'

/**
 * RO3–RO6 onboarding stepper layout.
 * Each step screen renders its own ProgressStepper header; this layout just
 * provides slide transitions between steps.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="vehicle" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="documents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="review" options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
