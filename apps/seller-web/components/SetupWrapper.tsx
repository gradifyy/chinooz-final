'use client'

import React from 'react'
import SellerOfflineBanner from './SellerOfflineBanner'
import ResumeToast from './ResumeToast'

export default function SetupWrapper({ children, showResume }: { children: React.ReactNode; showResume?: boolean }) {
  return (
    <>
      <SellerOfflineBanner />
      {showResume && <ResumeToast />}
      {children}
    </>
  )
}
