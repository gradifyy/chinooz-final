import React, { useCallback } from 'react'
import { useRouter } from 'expo-router'
import BankStep from '../components/BankStep'

export default function SetupBankScreen() {
  const router = useRouter()

  const handleContinue = useCallback(() => {
    router.push('/setup-review')
  }, [router])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  return <BankStep onContinue={handleContinue} onBack={handleBack} />
}
