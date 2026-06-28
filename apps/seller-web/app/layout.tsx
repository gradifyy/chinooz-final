import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@chinooz/ui-web'
import { QueryProvider } from '@/components/QueryProvider'
import { I18nProvider } from '@/components/I18nProvider'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Grow your business on Chinooz',
  description:
    'Sell across Nepal on Chinooz. Easy listings, fast payouts, and insights to grow your store.',
  openGraph: {
    title: 'Chinooz Seller — Grow your business on Chinooz',
    description:
      'Sell across Nepal on Chinooz. Easy listings, fast payouts, and insights to grow your store.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ne_NP',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text font-sans antialiased">
        <ErrorBoundary>
          <QueryProvider>
            <I18nProvider>{children}</I18nProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
