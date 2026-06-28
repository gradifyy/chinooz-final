import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Messages — Chinooz Seller',
  robots: { index: false, follow: false },
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
