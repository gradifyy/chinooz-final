import { Navbar } from '@/components/sections/Navbar'
import { Hero } from '@/components/sections/Hero'
import { TrustStrip } from '@/components/sections/TrustStrip'
import { Stats } from '@/components/sections/Stats'
import { Story } from '@/components/sections/Story'
import { Ecosystem } from '@/components/sections/Ecosystem'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Payments } from '@/components/sections/Payments'
import { Waitlist } from '@/components/sections/Waitlist'
import { Download } from '@/components/sections/Download'
import { FAQ } from '@/components/sections/FAQ'
import { Footer } from '@/components/sections/Footer'

export default function LandingPage() {
  return (
    <>
      {/* Navigation */}
      <Navbar />

      {/* Main content */}
      <main id="main-content">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>

        {/* 1. Cinematic hero with aurora backdrop */}
        <Hero />

        {/* 2. Trust strip marquee */}
        <TrustStrip />

        {/* 3. Stats / social proof */}
        <Stats />

        {/* 4. Brand story */}
        <Story />

        {/* 5. Ecosystem — buyers, sellers, riders */}
        <Ecosystem />

        {/* 6. How it works */}
        <HowItWorks />

        {/* 7. Payment methods */}
        <Payments />

        {/* 8. Waitlist (primary conversion) */}
        <Waitlist />

        {/* 9. App download CTAs */}
        <Download />

        {/* 10. FAQ */}
        <FAQ />
      </main>

      {/* Footer */}
      <Footer />
    </>
  )
}
