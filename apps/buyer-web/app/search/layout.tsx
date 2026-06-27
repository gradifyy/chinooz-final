import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search — Chinooz',
  description: 'Search products, brands, and categories on Chinooz. Find the best deals from local sellers in Nepal.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Search — Chinooz',
    description: 'Search products, brands, and categories on Chinooz.',
    type: 'website',
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
