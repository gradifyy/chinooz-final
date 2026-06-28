import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@chinooz/ui-web'
import { QueryProvider } from '@/components/QueryProvider'
import { I18nProvider } from '@/components/I18nProvider'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { A11yProvider } from '@/components/A11yProvider'
import { SellerShell } from '@/components/SellerShell'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Grow your business on Chinooz',
  description:
    'Sell across Nepal on Chinooz. Easy listings, fast payouts, and insights to grow your store.',
  robots: { index: false, follow: false },
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
            <I18nProvider>
              <AnalyticsProvider>
                <A11yProvider>
                  <SellerShell>{children}</SellerShell>
                </A11yProvider>
              </AnalyticsProvider>
            </I18nProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
