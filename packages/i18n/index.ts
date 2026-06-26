import 'intl-pluralrules'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ne from './locales/ne.json'

export const resources = {
  en: { translation: en },
  ne: { translation: ne },
} as const

export function initI18n(locale: string = 'en') {
  if (i18n.isInitialized) {
    i18n.changeLanguage(locale)
    return i18n
  }

  i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

  return i18n
}

export { i18n }
export type SupportedLocale = 'en' | 'ne'
