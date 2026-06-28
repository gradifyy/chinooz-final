'use client'
import React from 'react'
import { AppShowcase } from '@/components/showcase/AppShowcase'
import { BentoFeaturesGrid } from '@/components/showcase/BentoFeaturesGrid'
import { BuiltForNepal } from '@/components/showcase/BuiltForNepal'
import { WaitlistSignup } from '@/components/showcase/WaitlistSignup'
import { AppDownload } from '@/components/showcase/AppDownload'
import { SocialProof } from '@/components/showcase/SocialProof'
import { FAQ } from '@/components/showcase/FAQ'

export default function ShowcasePage() {
  return (
    <div className="flex flex-col">
      <AppShowcase />
      <BentoFeaturesGrid />
      <BuiltForNepal />
      <WaitlistSignup />
      <AppDownload />
      <SocialProof />
      <FAQ />
    </div>
  )
}
