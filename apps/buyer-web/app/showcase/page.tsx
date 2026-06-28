'use client'
import React from 'react'
import { AppShowcase } from '@/components/showcase/AppShowcase'
import { BentoFeaturesGrid } from '@/components/showcase/BentoFeaturesGrid'
import { BuiltForNepal } from '@/components/showcase/BuiltForNepal'
import { WaitlistSignup } from '@/components/showcase/WaitlistSignup'
import { AppDownload } from '@/components/showcase/AppDownload'
import { SocialProof } from '@/components/showcase/SocialProof'
import { FAQ } from '@/components/showcase/FAQ'
import { ScrollProgress } from '@/components/showcase/ScrollProgress'
import { LenisScroll } from '@/components/showcase/LenisScroll'

export default function ShowcasePage() {
  return (
    <>
      <ScrollProgress />
      <LenisScroll />
      <div className="flex flex-col">
        <AppShowcase />
        <BentoFeaturesGrid />
        <BuiltForNepal />
        <WaitlistSignup />
        <AppDownload />
        <SocialProof />
        <FAQ />
      </div>
    </>
  )
}
