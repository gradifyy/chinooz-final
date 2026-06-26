'use client'

import { useRouter } from 'next/navigation'
import { useSessionStore } from '@chinooz/state'
import { SlideUp } from '@chinooz/ui-web'

export default function PhoneEntryPage() {
  const router = useRouter()
  const login = useSessionStore(s => s.login)

  const handleContinue = () => {
    login('user-1', 'Ayush Chaudhary')
    document.cookie = 'chinooz-logged-in=1; path=/; max-age=31536000'
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <SlideUp className="flex flex-col items-center gap-6 max-w-md text-center">
        <span className="text-6xl">📱</span>
        <h1 className="text-2xl font-bold text-text">Enter your phone number</h1>
        <p className="text-base text-text-muted leading-relaxed">
          We&apos;ll send you a verification code to confirm your identity.
        </p>
        <div className="w-full flex items-center h-13 bg-surface rounded-xl border-[1.5px] border-border px-4 mt-2">
          <span className="text-base text-text-muted mr-2">+977</span>
          <span className="text-base text-text-tertiary">98XXXXXXXX</span>
        </div>
        <button
          onClick={handleContinue}
          className="w-full bg-primary text-white h-13 rounded-xl font-semibold text-base hover:bg-primary-dark transition-colors"
        >
          Continue
        </button>
      </SlideUp>
    </div>
  )
}
