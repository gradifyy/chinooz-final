import React, { useCallback } from 'react'
import { useRouter } from 'expo-router'
import StoreStep from '../components/StoreStep'

export default function SetupStoreScreen() {
  const router = useRouter()

  const handleContinue = useCallback(() => {
    router.push('/setup-business')
  }, [router])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  return <StoreStep onContinue={handleContinue} onBack={handleBack} />
}
