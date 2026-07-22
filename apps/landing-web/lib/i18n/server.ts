import { cookies } from 'next/headers'
import type { Locale } from '@/content/landing'

const COOKIE_KEY = 'chinooz-locale'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(COOKIE_KEY)?.value as Locale | undefined
  if (stored === 'en' || stored === 'ne') {
    return stored
  }
  return 'en'
}
