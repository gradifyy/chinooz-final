import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/onboarding', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const onboardingSeen = request.cookies.get('chinooz-seller-onboarding')?.value
  const isLoggedIn = request.cookies.get('chinooz-seller-logged-in')?.value

  if (!onboardingSeen) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|seller-icon.svg|seller-manifest.webmanifest).*)'],
}
