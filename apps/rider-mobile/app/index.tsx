import { Redirect } from 'expo-router'
import { useRiderSessionStore } from '@chinooz/state'

export default function Index() {
  const isLoggedIn = useRiderSessionStore(s => s.isLoggedIn)
  // First launch / logged-out lands on the value-intro Welcome screen.
  // Authenticated riders skip ahead to the jobs board.
  return <Redirect href={isLoggedIn ? '/jobs' : '/welcome'} />
}
