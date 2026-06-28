import React, { useCallback } from 'react'
import { useRouter } from 'expo-router'
import BusinessStep from '../components/BusinessStep'

export default function SetupBusinessScreen() {
  const router = useRouter()

  const handleContinue = useCallback(() => {
    router.push('/setup-bank')
  }, [router])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  return <BusinessStep onContinue={handleContinue} onBack={handleBack} />
}
