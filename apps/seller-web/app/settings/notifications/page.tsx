import type { Metadata } from 'next'
import NotificationSettings from '@/components/NotificationSettings'

export const metadata: Metadata = {
  title: 'Chinooz Seller — Notifications & preferences',
  description: 'Manage notification toggles, quiet hours, digests and app preferences.',
}

export default function NotificationsPage() {
  return <NotificationSettings />
}
