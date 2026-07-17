const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ne: 'ne-NP',
}

export function getLocale(lang?: string): string {
  if (!lang) return 'en-US'
  return LOCALE_MAP[lang] ?? 'en-US'
}

export function formatDateLocalized(
  iso: string,
  lang?: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Date(iso).toLocaleDateString(getLocale(lang), opts)
}

export function formatDateShort(iso: string, lang?: string): string {
  return formatDateLocalized(iso, lang, { month: 'short', day: 'numeric' })
}

export function formatDateLong(iso: string, lang?: string): string {
  return formatDateLocalized(iso, lang, { month: 'long', day: 'numeric', year: 'numeric' })
}

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

function toDevanagari(str: string): string {
  return str.replace(/[0-9]/g, d => DEVANAGARI_DIGITS[parseInt(d, 10)])
}

function localizeNumber(n: number, lang?: string): string {
  const s = String(n)
  return lang === 'ne' ? toDevanagari(s) : s
}

export function formatTimeRemaining(endsAt: string, lang?: string): string {
  const ms = new Date(endsAt).getTime() - Date.now()
  const ended = lang === 'ne' ? 'समाप्त' : 'Ended'
  const left = lang === 'ne' ? 'बाँकी' : 'left'
  if (ms <= 0) return ended
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return `${localizeNumber(day, lang)}d ${localizeNumber(hr % 24, lang)}h ${left}`
  if (hr > 0) return `${localizeNumber(hr, lang)}h ${localizeNumber(min % 60, lang)}m ${left}`
  if (min > 0) return `${localizeNumber(min, lang)}m ${localizeNumber(sec % 60, lang)}s ${left}`
  return `${localizeNumber(sec, lang)}s ${left}`
}

export function formatTimestamp(iso: string, lang?: string): string {
  const d = new Date(iso)
  const localeStr = lang === 'ne' ? 'ne-NP' : 'en-US'
  return (
    d.toLocaleDateString(localeStr, { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(localeStr, { hour: 'numeric', minute: '2-digit' })
  )
}

export function timeAgo(
  iso: string,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return t('common.daysAgo', { count: day })
  if (hr > 0) return t('common.hoursAgo', { count: hr })
  if (min > 0) return t('common.minutesAgo', { count: min })
  return t('common.justNow')
}
