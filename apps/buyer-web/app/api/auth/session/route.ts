import { NextRequest, NextResponse } from 'next/server'
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session'

const isProduction = process.env.NODE_ENV === 'production'

const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
}

// POST /api/auth/session — create a new session (called after OTP verification)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const token = await createSessionToken({
    userId: body.userId,
    phone: typeof body.phone === 'string' ? body.phone : '',
    profileComplete: false,
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions)
  return response
}

// PATCH /api/auth/session — mark profile as complete
export async function PATCH(request: NextRequest) {
  const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(existingToken)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await createSessionToken({
    userId: session.userId,
    phone: session.phone,
    profileComplete: true,
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions)
  return response
}

// DELETE /api/auth/session — clear session (logout / delete account)
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions,
    maxAge: 0,
  })
  return response
}
