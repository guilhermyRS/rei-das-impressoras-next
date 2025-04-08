import { NextResponse } from 'next/server'

// Rotas que não precisam de autenticação
const publicRoutes = ['/login', '/register']

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Ignorar rotas públicas
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  // Verificar se existe um cookie de autenticação
  const authCookie = request.cookies.get('auth')
  
  if (!authCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    // Tentar parsear o cookie
    const auth = JSON.parse(authCookie.value)
    
    // Verificar se o token expirou
    const tokenExpiresAt = new Date(auth.token.expiresAt)
    
    if (tokenExpiresAt <= new Date()) {
      // Token expirado, redirecionar para login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth')
      return response
    }
  } catch (error) {
    // Erro ao parsear o cookie, redirecionar para login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth')
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}