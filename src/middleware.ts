import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('lis_token')?.value

  // Root URL handler: dynamically redirect to dashboard if logged in, or login if not
  if (pathname === '/') {
    const targetUrl = new URL(token ? '/dashboard' : '/login', request.url)
    const response = NextResponse.redirect(targetUrl, 302)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return response
  }

  if (pathname.startsWith('/dashboard') && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('unauth', '1')
    const response = NextResponse.redirect(loginUrl, 302)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    return response
  }

  if (pathname === '/login' && token) {
    const isUnauthRedirect = request.nextUrl.searchParams.get('unauth') === '1' || request.nextUrl.searchParams.get('logout') === '1'
    if (!isUnauthRedirect) {
      const redirectRes = NextResponse.redirect(new URL('/dashboard', request.url))
      redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
      redirectRes.headers.set('Pragma', 'no-cache')
      return redirectRes
    }
  }

  const response = NextResponse.next()
  if (pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
  }
  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
}