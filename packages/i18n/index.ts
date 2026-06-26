import en from './en.json'
import ne from './ne.json'
import type { Locale } from '@chinooz/types'

export type TranslationKey = keyof typeof en

const translations: Record<Locale, Record<string, string>> = { en, ne }

let currentLocale: Locale = 'en'

export function setLocale(locale: Locale) {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: TranslationKey, replacements?: Record<string, string | number>): string {
  const locale = currentLocale
  let text = translations[locale]?.[key] ?? translations.en[key] ?? key
  if (replacements) {
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, String(v))
    })
  }
  return text
}
