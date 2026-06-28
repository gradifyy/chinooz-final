import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Inventory',
  description: 'Manage stock across every product variant.',
  robots: { index: false, follow: false },
}

export { default } from '@/components/InventoryScreen'
