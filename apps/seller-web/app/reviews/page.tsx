import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Reviews',
  description: 'Read and respond to buyer reviews across your products.',
  robots: { index: false, follow: false },
}

export { default } from '@/components/ReviewsScreen'
