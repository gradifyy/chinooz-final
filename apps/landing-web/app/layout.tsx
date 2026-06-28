import type { Metadata, Viewport } from 'next'
import type React from 'react'
import { Inter, Noto_Sans_Devanagari, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/lib/i18n/context'

/* ─── Fonts ─────────────────────────────────────────────────────────────── */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  preload: false, // load on demand
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
  preload: true,
})

/* ─── Metadata ───────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  metadataBase: new URL('https://chinooz.com'),
  title: {
    default: 'Chinooz — Nepal\'s Marketplace',
    template: '%s | Chinooz',
  },
  description:
    'Chinooz is Nepal\'s premier online marketplace. Shop thousands of local products, pay with Khalti or cash on delivery, and get fast delivery by Chinooz riders. Launching in Kathmandu Valley.',
  keywords: [
    'Chinooz',
    'Nepal marketplace',
    'online shopping Nepal',
    'Kathmandu',
    'Khalti',
    'eSewa',
    'cash on delivery',
    'Nepal ecommerce',
  ],
  authors: [{ name: 'Chinooz', url: 'https://chinooz.com' }],
  creator: 'Chinooz',
  publisher: 'Chinooz',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ne_NP',
    url: 'https://chinooz.com',
    siteName: 'Chinooz',
    title: 'Chinooz — Nepal\'s Marketplace',
    description:
      'Shop thousands of local products, pay with Khalti or cash on delivery, and get fast delivery by Chinooz riders.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chinooz — Nepal\'s Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chinooz — Nepal\'s Marketplace',
    description:
      'Shop thousands of local products, pay with Khalti or cash on delivery, and get fast delivery.',
    images: ['/og-image.png'],
    creator: '@chinooz',
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
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://chinooz.com',
    languages: {
      'en': 'https://chinooz.com',
      'ne': 'https://chinooz.com?lang=ne',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8A1B57',
}

/* ─── JSON-LD Structured Data ────────────────────────────────────────────── */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://chinooz.com/#organization',
      name: 'Chinooz',
      url: 'https://chinooz.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://chinooz.com/chinooz-logo.png',
      },
      description: "Nepal's premier online marketplace",
      foundingLocation: {
        '@type': 'Place',
        name: 'Kathmandu, Nepal',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Nepal',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://chinooz.com/#website',
      url: 'https://chinooz.com',
      name: 'Chinooz',
      publisher: { '@id': 'https://chinooz.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://chinooz.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'When does Chinooz launch?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "We're launching in the Kathmandu Valley very soon. Sign up for the waitlist to be among the first to know.",
          },
        },
        {
          '@type': 'Question',
          name: 'Which payment methods are supported?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We support Khalti, eSewa, and Cash on Delivery (COD).',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast is delivery?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Our Chinooz riders aim to deliver within the same day for most Kathmandu Valley locations.',
          },
        },
      ],
    },
  ],
}

/* ─── Root Layout ────────────────────────────────────────────────────────── */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoSansDevanagari.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-text font-sans antialiased">
        <I18nProvider defaultLocale="en">
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
