import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Chinooz',
  description: 'Read the Terms of Service for using Chinooz, Nepal\'s trusted marketplace.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Terms of Service — Chinooz',
    description: 'Read the Terms of Service for using Chinooz, Nepal\'s trusted marketplace.',
    type: 'website',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
