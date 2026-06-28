import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chinooz - App Showcase',
  description:
    "Discover Chinooz — Nepal's marketplace app with lightning delivery, multi-seller cart, live tracking, and full bilingual support.",
}

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
