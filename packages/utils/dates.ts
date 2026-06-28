const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ne: 'ne-NP',
}

export function getLocale(lang?: string): string {
  if (!lang) return 'en-US'
  return LOCALE_MAP[lang] ?? 'en-US'
}

export function formatDateLocalized(iso: string, lang?: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString(getLocale(lang), opts)
}

export function formatDateShort(iso: string, lang?: string): string {
  return formatDateLocalized(iso, lang, { month: 'short', day: 'numeric' })
}

export function formatDateLong(iso: string, lang?: string): string {
  return formatDateLocalized(iso, lang, { month: 'long', day: 'numeric', year: 'numeric' })
}
