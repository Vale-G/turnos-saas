import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/turnos', '/clientes', '/servicios', '/staff', '/ajustes', '/bloqueos', '/informes', '/upgrade', '/onboarding']
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Superadmin: verificar rol en servidor
  if (pathname.startsWith('/superadmin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { data: rol } = await supabase
      .from('adminrol')
      .select('role, rol, tipo')
      .eq('user_id', user.id)
      .maybeSingle()

    const rolValue = String(rol?.role ?? rol?.rol ?? rol?.tipo ?? '').toLowerCase()
    if (rolValue !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Negocio inactivo en reservas
  if (pathname.startsWith('/reservar/')) {
    const slug = pathname.split('/')[2]
    if (slug && slug !== 'demo') {
      const { data: negocio } = await supabase
        .from('negocio')
        .select('activo')
        .eq('slug', slug)
        .single()

      if (negocio && negocio.activo === false) {
        return NextResponse.rewrite(new URL('/negocio-inactivo', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/turnos/:path*',
    '/clientes/:path*',
    '/servicios/:path*',
    '/staff/:path*',
    '/ajustes/:path*',
    '/bloqueos/:path*',
    '/informes/:path*',
    '/upgrade/:path*',
    '/onboarding/:path*',
    '/superadmin/:path*',
    '/reservar/:path*',
  ],
}
