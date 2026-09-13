import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value
  const refreshToken = request.cookies.get('refreshToken')?.value

  const isAuthed = Boolean(accessToken || refreshToken)

  const { pathname, searchParams } = request.nextUrl

  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthed ? '/dashboard' : '/login', request.url),
    )
  }

  if (pathname === '/login' && isAuthed) {
    const target = searchParams.get('redirect') ?? '/dashboard'
    const safeTarget = target.startsWith('/') && !target.startsWith('//')
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
  matcher: ['/', '/login', '/dashboard/:path*'],
}