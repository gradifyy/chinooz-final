import type { Metadata } from 'next'
import BusinessSettings from '@/components/BusinessSettings'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Business & KYC',
  description: 'Verify your business details, upload documents and track verification status.',
}

export default function BusinessPage() {
  return <BusinessSettings />
}
