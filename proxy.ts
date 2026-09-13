import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasValidSupabaseToken(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => {
    if (!c.name.startsWith('sb-')) return false
    if (c.name.includes('-code-verifier')) return false

    // Must match sb-<project>-auth-token or chunked sb-<project>-auth-token.<index>
    const isAuthToken =
      c.name.endsWith('-auth-token') || /-auth-token\.\d+$/.test(c.name)
    if (!isAuthToken) return false

    const val = c.value?.trim()
    if (!val || val === '""' || val === '[]' || val === '{}' || val === 'deleted') {
      return false
    }

    return true
  })
}

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value?.trim()
  const refreshToken = request.cookies.get('refreshToken')?.value?.trim()
  const hasAccessToken = Boolean(accessToken && accessToken !== 'deleted')
  const hasRefreshToken = Boolean(refreshToken && refreshToken !== 'deleted')
  const hasSupabaseCookie = hasValidSupabaseToken(request)

  const isAuthed = Boolean(hasAccessToken || hasRefreshToken || hasSupabaseCookie)

  const { pathname, searchParams } = request.nextUrl

  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthed ? '/dashboard' : '/login', request.url),
    )
  }

  if ((pathname === '/login' || pathname === '/register') && isAuthed) {
    const target = searchParams.get('redirect') ?? '/dashboard'
    const safeTarget =
      target.startsWith('/') && !target.startsWith('//')
        ? target
        : '/dashboard'
    return NextResponse.redirect(new URL(safeTarget, request.url))
  }

  if (pathname.startsWith('/dashboard') && !isAuthed) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register', '/dashboard/:path*'],
}