import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TOKEN_COOKIE } from '@/lib/auth'

// Rotas que exigem autenticação
const PROTECTED = ['/dashboard', '/onboarding', '/devices']
// Rotas que redirecionam para dashboard se já autenticado
const AUTH_ONLY = ['/auth/login', '/auth/register']

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}

// ✅ AQUI está a correção
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token  = req.cookies.get(TOKEN_COOKIE)?.value
  const user   = token ? await verifyToken(token) : null

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isAuthOnly  = AUTH_ONLY.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthOnly && user) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}