'use client'

import React, { useEffect } from 'react'
import { initAnalytics } from '@chinooz/analytics'
import { useSellerSessionStore } from '@chinooz/state'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const devMock = useSellerSessionStore(s => s.devMock)

  useEffect(() => {
    initAnalytics({ app: 'chinooz-seller-web', devMock })
  }, [devMock])

  return <>{children}</>
}
