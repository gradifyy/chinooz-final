import type { Metadata } from 'next'
import ShippingSettings from '@/components/ShippingSettings'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Shipping settings',
  description: 'Manage delivery zones, rates, carriers, COD and return policy.',
}

export default function ShippingPage() {
  return <ShippingSettings />
}
