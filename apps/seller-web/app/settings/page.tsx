import type { Metadata } from 'next'
import StoreSettingsHub from '@/components/StoreSettingsHub'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Store settings',
  description: 'Manage your storefront, business & KYC, shipping, notifications, staff and account security.',
}

export default function SettingsPage() {
  return <StoreSettingsHub />
}
