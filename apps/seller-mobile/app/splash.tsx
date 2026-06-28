import { Redirect } from 'expo-router'
import { useSellerSessionStore } from '@chinooz/state'

export default function SplashScreen() {
  const onboardingSeen = useSellerSessionStore(s => s.onboardingSeen)
  const isLoggedIn = useSellerSessionStore(s => s.isLoggedIn)

  if (!onboardingSeen) return <Redirect href="/onboarding" />
  if (!isLoggedIn) return <Redirect href="/onboarding" />
  return <Redirect href="/home" />
}
