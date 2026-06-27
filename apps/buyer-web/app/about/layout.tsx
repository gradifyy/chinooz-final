import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Chinooz — Nepal\'s Marketplace',
  description: 'Chinooz is Nepal\'s trusted marketplace connecting you with thousands of local sellers. From electronics to handicrafts, groceries to fashion.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'About Chinooz — Nepal\'s Marketplace',
    description: 'Chinooz is Nepal\'s trusted marketplace connecting you with thousands of local sellers.',
    type: 'website',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
