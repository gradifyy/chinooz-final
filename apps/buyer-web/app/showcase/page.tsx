'use client'
import React from 'react'
import { AppShowcase } from '@/components/showcase/AppShowcase'
import { BentoFeaturesGrid } from '@/components/showcase/BentoFeaturesGrid'
import { BuiltForNepal } from '@/components/showcase/BuiltForNepal'

export default function ShowcasePage() {
  return (
    <div className="flex flex-col">
      <AppShowcase />
      <BentoFeaturesGrid />
      <BuiltForNepal />
    </div>
  )
}
