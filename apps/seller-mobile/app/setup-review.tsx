import React, { useCallback } from 'react'
import { useRouter } from 'expo-router'
import ReviewStep from '../components/ReviewStep'

export default function SetupReviewScreen() {
  const router = useRouter()

  const handleEditStore = useCallback(() => {
    router.push('/setup-store')
  }, [router])

  const handleEditBusiness = useCallback(() => {
    router.push('/setup-business')
  }, [router])

  const handleEditBank = useCallback(() => {
    router.push('/setup-bank')
  }, [router])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleApproved = useCallback(() => {
    router.replace('/(tabs)')
  }, [router])

  return (
    <ReviewStep
      onEditStore={handleEditStore}
      onEditBusiness={handleEditBusiness}
      onEditBank={handleEditBank}
      onBack={handleBack}
      onApproved={handleApproved}
    />
  )
}
