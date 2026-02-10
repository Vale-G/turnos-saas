import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Creamos la respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Inicializamos el cliente de Supabase específico para SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Si el login setea una cookie, la pasamos a la petición y a la respuesta
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Obtenemos la sesión
  const { data: { session } } = await supabase.auth.getSession()

  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')
  const isLoginPage = request.nextUrl.pathname === '/login'

  // 🚨 REGLA 1: Si hay sesión y el usuario está en el Login, mandalo al Dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 🚨 REGLA 2: Si NO hay sesión y quiere entrar al Dashboard, mandalo al Login
  if (!session && isDashboardPage) {
    // Agregamos un pequeño bypass: si la cookie acaba de ser seteada, intentamos dejar pasar
    const hasAuthCookie = request.cookies.has('sb-auth-token') || request.cookies.has('supabase-auth-token')
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  // Protegemos dashboard y setup. Excluimos login para evitar bucles.
  matcher: [
    '/dashboard/:path*', 
    '/setup-negocio/:path*',
  ],
}