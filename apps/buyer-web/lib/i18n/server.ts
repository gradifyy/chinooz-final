import { cookies } from 'next/headers'
import en from '@chinooz/i18n/locales/en.json'
import ne from '@chinooz/i18n/locales/ne.json'

type Locale = 'en' | 'ne'
type Resources = Record<string, unknown>

const resources: Record<Locale, Resources> = { en: en as Resources, ne: ne as Resources }

function resolveKey(obj: unknown, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{{${name}}}`,
  )
}

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get('chinooz-locale')?.value
  return stored === 'ne' ? 'ne' : 'en'
}

export async function getT(): Promise<{ t: TranslateFn; locale: Locale }> {
  const locale = await getLocale()
  const res = resources[locale]
  const fallback = resources.en

  const t: TranslateFn = (key, params) => {
    const value = resolveKey(res, key) ?? resolveKey(fallback, key) ?? key
    return interpolate(value, params)
  }

  return { t, locale }
}
