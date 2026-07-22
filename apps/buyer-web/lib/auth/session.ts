/**
 * Server-side session management using HMAC-signed, HttpOnly cookies.
 *
 * The session token is `base64url(payload).base64url(hmac)` where the HMAC is
 * SHA-256 keyed by `AUTH_SECRET`.  The cookie is set with `HttpOnly` so client
 * JS (and therefore XSS) cannot read it, and `Secure` in production so it is
 * only transmitted over HTTPS.
 *
 * Uses the Web Crypto API (`crypto.subtle`) which is available in both the
 * Edge runtime (middleware) and the Node.js runtime (route handlers), so a
 * single implementation works everywhere.
 */

import { getServerEnv } from '@/lib/env.server'

const SESSION_COOKIE_NAME = 'chinooz-session'
const SESSION_MAX_AGE_SECONDS = 31_536_000 // 1 year

export interface SessionPayload {
  userId: string
  phone: string
  profileComplete: boolean
  iat: number // issued at (epoch ms)
  exp: number // expires at (epoch ms)
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS }

function getAuthSecret(): string {
  return getServerEnv().AUTH_SECRET
}

function base64urlEncode(data: string): string {
  const bytes = new TextEncoder().encode(data)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const bytes = new Uint8Array(signature)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)
  let diff = 0
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i]
  return diff === 0
}

export async function createSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
): Promise<string> {
  const secret = getAuthSecret()
  const now = Date.now()
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  }
  const data = base64urlEncode(JSON.stringify(fullPayload))
  const mac = await hmacSign(secret, data)
  return `${data}.${mac}`
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [data, mac] = parts
  if (!data || !mac) return null

  const secret = getAuthSecret()
  const expectedMac = await hmacSign(secret, data)
  if (!(await constantTimeEquals(mac, expectedMac))) return null

  try {
    const payload = JSON.parse(base64urlDecode(data)) as SessionPayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
