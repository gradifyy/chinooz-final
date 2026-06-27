import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Chinooz',
  description: 'Learn how Chinooz collects, uses, and protects your personal information.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Privacy Policy — Chinooz',
    description: 'Learn how Chinooz collects, uses, and protects your personal information.',
    type: 'website',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
