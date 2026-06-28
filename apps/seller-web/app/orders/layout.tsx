import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orders — Chinooz Seller',
  description: 'Manage your store orders: accept, pack, ship, print labels, handle returns and refunds.',
  robots: { index: false, follow: false },
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children
}
