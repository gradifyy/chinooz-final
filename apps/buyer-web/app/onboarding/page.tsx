'use client'

import { useRouter } from 'next/navigation'
import { useSessionStore } from '@chinooz/state'
import { SlideUp } from '@chinooz/ui-web'

export default function OnboardingPage() {
  const router = useRouter()
  const markOnboardingSeen = useSessionStore(s => s.markOnboardingSeen)

  const handleGetStarted = () => {
    markOnboardingSeen()
    document.cookie = 'chinooz-onboarding-seen=1; path=/; max-age=31536000'
    router.push('/phone-entry')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <SlideUp className="flex flex-col items-center gap-6 max-w-md text-center">
        <span className="text-6xl">🛍️</span>
        <h1 className="text-3xl font-bold text-text">Welcome to Chinooz</h1>
        <p className="text-base text-text-muted leading-relaxed">
          Discover Nepal&apos;s best products from local sellers. Shop electronics, fashion, handicrafts and more.
        </p>
        <button
          onClick={handleGetStarted}
          className="mt-4 bg-primary text-white h-13 px-8 rounded-xl font-semibold text-base hover:bg-primary-dark transition-colors"
        >
          Get Started
        </button>
      </SlideUp>
    </div>
  )
}
