import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Products',
  description: 'Manage your product catalog on Chinooz.',
  robots: { index: false, follow: false },
}

export { default } from '@/components/ProductsScreen'
