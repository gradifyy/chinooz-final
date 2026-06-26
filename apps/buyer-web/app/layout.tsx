import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { QueryProvider } from '@/components/QueryProvider'
import { I18nProvider } from '@/components/I18nProvider'

export const metadata: Metadata = {
  title: 'Chinooz',
  description: "Nepal's marketplace",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text font-sans antialiased flex flex-col min-h-screen">
        <QueryProvider>
          <I18nProvider>
            <Header />
            <main className="flex-1 pb-[84px] md:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
