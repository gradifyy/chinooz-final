'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  label: string
}

export function BackButton({ label }: BackButtonProps) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background transition-colors"
      aria-label={label}
    >
      <span className="text-xl text-text">←</span>
    </button>
  )
}
