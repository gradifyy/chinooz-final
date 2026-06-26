export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function getInitials(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const FALLBACK_AVATAR = 'https://ui-avatars.com/api/?background=F8EAF1&color=8A1B57&name=?'

export function getImageSource(uri: unknown, fallback: string = FALLBACK_AVATAR): string {
  if (typeof uri === 'string' && uri.startsWith('http')) return uri
  return fallback
}

export function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function truncate(str: unknown, maxLen = 100): string {
  const s = sanitizeString(str, maxLen + 10)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen).trimEnd() + '…'
}
