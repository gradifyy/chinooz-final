import React, { useEffect } from 'react'
import { initAnalytics } from '@chinooz/analytics'
import { useRiderSessionStore } from '@chinooz/state'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const devMock = useRiderSessionStore(s => s.devMock)

  useEffect(() => {
    initAnalytics({ app: 'chinooz-rider', devMock })
  }, [devMock])

  return <>{children}</>
}
