'use client'

import { CheckCircle } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import { landingContent } from '@/content/landing'

export function TrustStrip() {
  const { locale } = useLocale()
  const t = landingContent[locale].trust
  const items = [...t.items, ...t.items] // duplicate for seamless loop

  return (
    <div
      className="bg-primary py-4 overflow-hidden"
      aria-label="Trust indicators"
      role="complementary"
    >
      <div className="flex animate-marquee whitespace-nowrap motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-4 motion-reduce:py-2">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-2 mx-8 text-white/90 text-sm font-medium"
          >
            <CheckCircle size={14} className="text-gold shrink-0" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
