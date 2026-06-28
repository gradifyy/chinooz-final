import type { Metadata } from 'next'
import StaffSettings from '@/components/StaffSettings'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Staff & roles',
  description: 'Manage your team, assign roles and control access.',
}

export default function StaffPage() {
  return <StaffSettings />
}
