import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/onboarding', '/phone-entry', '/otp', '/create-profile', '/api', '/showcase']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const onboardingSeen = request.cookies.get('chinooz-onboarding-seen')?.value
  const isLoggedIn = request.cookies.get('chinooz-logged-in')?.value
  const profileComplete = request.cookies.get('chinooz-profile-complete')?.value

  if (!onboardingSeen) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/phone-entry', request.url))
  }

  if (!profileComplete) {
    return NextResponse.redirect(new URL('/create-profile', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
