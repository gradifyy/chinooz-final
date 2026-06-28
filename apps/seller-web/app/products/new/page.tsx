import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Add Product',
  description: 'Create a new product for your store.',
  robots: { index: false, follow: false },
}

export { default } from '@/components/ProductFormScreen'
