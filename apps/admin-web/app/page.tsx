import { cookies } from 'next/headers'
import { resources, type SupportedLocale } from '@chinooz/i18n'

async function getLocale(): Promise<SupportedLocale> {
  const stored = (await cookies()).get('chinooz-locale')?.value
  return stored === 'ne' ? 'ne' : 'en'
}

export default async function Page() {
  const locale = await getLocale()
  // Strings sourced from @chinooz/i18n (EN + NE); no hard-coded user-visible copy.
  const appName = resources[locale].translation.common.appName

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="text-2xl font-semibold text-text">{appName}</h1>
    </main>
  )
}
