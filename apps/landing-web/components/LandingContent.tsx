'use client'

import { useState, useCallback } from 'react'
import { Navbar } from '@/components/sections/Navbar'
import { Hero } from '@/components/sections/Hero'
import { LiveActivity } from '@/components/sections/LiveActivity'
import { Stats } from '@/components/sections/Stats'
import { Bento } from '@/components/sections/Bento'
import { Story } from '@/components/sections/Story'
import { Ecosystem } from '@/components/sections/Ecosystem'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Payments } from '@/components/sections/Payments'
import { Testimonials } from '@/components/sections/Testimonials'
import { Waitlist } from '@/components/sections/Waitlist'
import { Download } from '@/components/sections/Download'
import { FAQ } from '@/components/sections/FAQ'
import { Footer } from '@/components/sections/Footer'
import { ScrollProgressBar } from '@/components/motion/ScrollProgressBar'
import type { Locale } from '@/content/landing'

const COOKIE_KEY = 'chinooz-locale'

export function LandingContent({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)

  const toggleLocale = useCallback(() => {
    const newLocale: Locale = locale === 'en' ? 'ne' : 'en'
    document.cookie = `${COOKIE_KEY}=${newLocale};path=/;max-age=31536000;SameSite=Lax`
    document.documentElement.lang = newLocale
    setLocale(newLocale)
  }, [locale])

  return (
    <>
      <ScrollProgressBar />
      <Navbar locale={locale} onToggleLocale={toggleLocale} />

      <main id="main-content">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>

        <Hero locale={locale} />
        <LiveActivity locale={locale} />
        <Ecosystem locale={locale} />
        <Story locale={locale} />
        <Stats locale={locale} />
        <Bento locale={locale} />
        <Payments locale={locale} />
        <Testimonials locale={locale} />
        <HowItWorks locale={locale} />
        <Download locale={locale} />
        <FAQ locale={locale} />
        <Waitlist locale={locale} />
      </main>

      <Footer locale={locale} />
    </>
  )
}
