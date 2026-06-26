import React, { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { colors } from '@chinooz/theme'
import { useReducedMotion } from '@chinooz/ui/hooks/useReducedMotion'
import { useSessionStore } from '@chinooz/state'
import SplashLogo from '../components/SplashLogo'

const MIN_DELAY = 1200
const REDUCED_DELAY = 100

export default function SplashScreen() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [checksDone, setChecksDone] = useState(false)

  const onboardingSeen = useSessionStore(s => s.onboardingSeen)
  const isLoggedIn = useSessionStore(s => s.isLoggedIn)
  const profileComplete = useSessionStore(s => s.profileComplete)

  const navigate = useCallback(() => {
    try {
      if (!onboardingSeen) {
        router.replace('/onboarding')
      } else if (!isLoggedIn) {
        router.replace('/phone-entry')
      } else if (!profileComplete) {
        router.replace('/create-profile')
      } else {
        router.replace('/(tabs)')
      }
    } catch {
      router.replace('/onboarding')
    }
  }, [onboardingSeen, isLoggedIn, profileComplete, router])

  useEffect(() => {
    const delay = reduced ? REDUCED_DELAY : MIN_DELAY
    const timer = setTimeout(() => {
      setChecksDone(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [reduced])

  useEffect(() => {
    if (ready && checksDone) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch {}
      navigate()
    }
  }, [ready, checksDone, navigate])

  return (
    <View style={styles.container}>
      <SplashLogo onAnimationDone={() => setReady(true)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
