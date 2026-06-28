import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chinooz.com'

export const metadata: Metadata = {
  title: 'Chinooz - Nepal\'s Fastest Marketplace | Lightning Delivery, Live Tracking',
  description:
    'Chinooz brings fast, affordable shopping to Kathmandu Valley. Multi-seller cart, real-time tracking, COD payments, and full bilingual support. Join the waitlist today.',
  keywords: [
    'Chinooz',
    'Nepal marketplace',
    'fast delivery',
    'e-commerce',
    'Kathmandu',
    'online shopping',
    'Nepali app',
  ],
  canonical: `${siteUrl}/showcase`,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ne_NP'],
    url: `${siteUrl}/showcase`,
    siteName: 'Chinooz',
    title: 'Chinooz - Nepal\'s Fastest Marketplace',
    description:
      'Lightning delivery, multi-seller cart, live tracking, and bilingual support. Shop on Chinooz today.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Chinooz - Nepal\'s Fastest Marketplace',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@chinooz',
    creator: '@chinooz',
    title: 'Chinooz - Nepal\'s Fastest Marketplace',
    description:
      'Lightning delivery, multi-seller cart, live tracking, and bilingual support. Shop on Chinooz today.',
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
}

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Chinooz',
            url: siteUrl,
            logo: `${siteUrl}/logo.png`,
            description:
              "Nepal's fastest marketplace with lightning delivery, multi-seller cart, live tracking, and bilingual support.",
            sameAs: [
              'https://twitter.com/chinooz',
              'https://facebook.com/chinooz',
              'https://instagram.com/chinooz',
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'Customer Service',
              email: 'hello@chinooz.com',
            },
          }),
        }}
      />
      {children}
    </>
  )
}
