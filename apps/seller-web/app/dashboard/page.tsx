import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Dashboard',
  description: 'Seller performance dashboard',
  robots: { index: false, follow: false },
}

export { default } from '@/components/SellerDashboard'
