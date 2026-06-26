import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Navbar from './navbar'
import { CartBadgeWeb } from '@chinooz/ui-web'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Chinooz - Nepal\'s Online Marketplace',
  description: 'Shop Nepal, Love Local. Find the best products from across Nepal.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#FAFAFA] text-gray-900 antialiased`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <footer className="border-t border-gray-100 bg-white py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-sm text-gray-500">© 2026 Chinooz. Nepal's marketplace.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
