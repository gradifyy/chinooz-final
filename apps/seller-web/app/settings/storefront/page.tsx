import type { Metadata } from 'next'
import StorefrontSettings from '@/components/StorefrontSettings'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Storefront settings',
  description: 'Edit your store name, logo, banner, tagline and public contact details.',
}

export default function StorefrontPage() {
  return <StorefrontSettings />
}
