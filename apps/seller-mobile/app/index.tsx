import { Redirect } from 'expo-router'
import { useSellerSessionStore } from '@chinooz/state'

export default function Index() {
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)
  const onboardingSeen = useSellerSessionStore(s => s.onboardingSeen)

  if (!onboardingSeen) return <Redirect href="/onboarding" />
  if (!isLoggedIn) return <Redirect href="/onboarding" />
  return <Redirect href="/(tabs)/dashboard" />
}
