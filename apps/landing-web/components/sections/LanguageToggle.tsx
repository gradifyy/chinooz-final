'use client'

import { cn } from '@/lib/utils'
import type { Locale } from '@/content/landing'

interface LanguageToggleProps {
  locale: Locale
  label: string
  scrolled: boolean
  onToggle?: () => void
  className?: string
}

export function LanguageToggle({ locale, label, scrolled, onToggle, className }: LanguageToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        scrolled
          ? 'border-border text-text-muted hover:border-primary hover:text-primary'
          : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white',
        className
      )}
      aria-label={`Switch to ${locale === 'en' ? 'Nepali' : 'English'}`}
    >
      {label}
    </button>
  )
}
