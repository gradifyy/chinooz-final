import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Seller session cookie — HttpOnly + Secure (prod) + SameSite=Lax, set
 * SERVER-side so client JS cannot read or forge it (fixes the mock-era
 * forgeable `chinooz-seller-logged-in=1` boolean flag set via document.cookie).
 *
 * Mock-era: `POST` issues an opaque session id after the client has verified
 * the OTP (verification still happens against the mock data layer). In
 * production this route must validate the OTP against the real backend via the
 * SellerApi auth service (`@chinooz/api` → `services.verifyOtp`) and issue a
 * signed/rotating token; the middleware then verifies presence (and, with a
 * signing secret, the signature) of this HttpOnly cookie.
 *
 * `DELETE` clears the session (logout).
 */
export const runtime = 'nodejs'

const SESSION_COOKIE = 'chinooz-seller-session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SECURE = process.env.NODE_ENV === 'production'

export async function POST() {
  const token = randomUUID()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
