import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Inter, Noto_Sans_Devanagari } from 'next/font/google'
import './globals.css'
import { resolveLocale } from '@/lib/admin-core/i18n'
import I18nProvider from '@/components/I18nProvider'

/* ─── Fonts (token-aligned via the Tailwind preset font families) ────────── */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

// Preloaded for the bilingual (EN/NE) requirement so Devanagari never tofus.
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: 'Chinooz Admin',
  description: 'Operate and govern the Chinooz marketplace.',
  robots: { index: false, follow: false },
}

/**
 * Resolves the active locale from the `chinooz-locale` cookie, defaulting to
 * English when the cookie is absent or holds an unsupported value (Req 10.5).
 * The raw cookie value is validated by the pure `resolveLocale` helper so the
 * default-locale rule has a single, tested source of truth.
 */
async function getLocale() {
  const stored = (await cookies()).get('chinooz-locale')?.value
  return resolveLocale(stored)
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // `<html lang>` reflects the selected language so every rendered view is
  // marked up in the administrator's locale (Req 10.1).
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${inter.variable} ${notoSansDevanagari.variable}`}>
      <body className="bg-background text-text font-sans antialiased">
        {/* Client localization runtime: initializes i18next from the
            server-resolved cookie locale, hydrates the UI store, and keeps the
            active language in sync without re-authentication (Req 10.1–10.3). */}
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  )
}
