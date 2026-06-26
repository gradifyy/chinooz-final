import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { MobileBottomNav } from '@/components/MobileBottomNav'

export const metadata: Metadata = {
  title: 'Chinooz',
  description: "Nepal's marketplace",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text font-sans antialiased">
        <Header />
        <main className="pb-[84px] md:pb-0">{children}</main>
        <MobileBottomNav />
      </body>
    </html>
  )
}
