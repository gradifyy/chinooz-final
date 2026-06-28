export function maskAccountNumber(num: string): string {
  if (!num || num.length < 4) return num
  const last4 = num.slice(-4)
  const masked = '•'.repeat(Math.max(0, num.length - 4))
  return `${masked}${last4}`
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone
  return `${phone.slice(0, 3)}••${phone.slice(-2)}`
}

export function maskPan(pan: string): string {
  if (!pan || pan.length < 4) return pan
  return `••••${pan.slice(-3)}`
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  if (name.length <= 2) return `${name[0]}•@${domain}`
  return `${name.slice(0, 2)}${'•'.repeat(Math.min(name.length - 2, 4))}@${domain}`
}
