// ============================================================================
// ARCHIVO: middleware.ts (o proxy.ts)
// VERSIÓN: 2.0 - UNIFIED STORAGE KEY COMPATIBLE
// 
// CONFIGURACIÓN:
// ✅ Mismo storageKey que el cliente: 'plataforma-saas-auth-token'
// ✅ Bypass inteligente: si hay cookie, dejar pasar
// ✅ Validación final en cliente (Dashboard)
// ✅ Compatible con autenticación del lado del cliente
// ============================================================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  console.log('🔐 [MIDDLEWARE] Interceptando:', req.nextUrl.pathname)
  
  try {
    // ========================================================================
    // IMPORTANTE: Usar el MISMO storageKey que en el cliente
    // ========================================================================
    
    const supabase = createMiddlewareClient(
      { req, res },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        options: {
          auth: {
            // ✅ CRÍTICO: Mismo storageKey
            storageKey: 'plataforma-saas-auth-token',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
          }
        }
      }
    )

    // ========================================================================
    // Intentar obtener sesión
    // ========================================================================
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ [MIDDLEWARE] Error al obtener sesión:', error.message)
    }
    
    if (session) {
      console.log('✅ [MIDDLEWARE] Sesión activa detectada:', {
        user_id: session.user.id,
        email: session.user.email
      })
    }

    // ========================================================================
    // ESTRATEGIA: Bypass inteligente
    // ========================================================================
    
    const pathname = req.nextUrl.pathname
    
    // Rutas protegidas
    const rutasProtegidas = ['/dashboard', '/setup-negocio', '/configuracion']
    const esRutaProtegida = rutasProtegidas.some(ruta => pathname.startsWith(ruta))
    
    if (esRutaProtegida) {
      if (!session) {
        // ✅ CAMBIO CLAVE: Si no hay sesión PERO hay cookies de Supabase,
        // dejar pasar y que el Dashboard (cliente) haga la verificación final
        
        const cookies = req.cookies
        const tieneCookieSupabase = 
          cookies.has('sb-auth-token') || 
          cookies.has('plataforma-saas-auth-token') ||
          Array.from(cookies).some(([key]) => key.includes('sb-') && key.includes('auth'))
        
        if (tieneCookieSupabase) {
          console.log('⚠️ [MIDDLEWARE] Sin sesión pero con cookies → Dejando pasar (validación en cliente)')
          return res
        }
        
        // Si NO hay cookies, redirigir a login
        console.log('🚪 [MIDDLEWARE] Sin sesión ni cookies → Redirigiendo a login')
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectedFrom', pathname)
        return NextResponse.redirect(redirectUrl)
      }
      
      console.log('✅ [MIDDLEWARE] Sesión válida → Permitiendo acceso')
    }

    // ========================================================================
    // Rutas públicas
    // ========================================================================
    
    if (pathname === '/login' || pathname === '/registro') {
      if (session) {
        console.log('🔄 [MIDDLEWARE] Usuario autenticado accediendo a login → Redirigiendo a dashboard')
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    return res

  } catch (error: any) {
    console.error('💥 [MIDDLEWARE] Error crítico:', error.message)
    
    // En caso de error, dejar pasar y que el cliente maneje
    console.log('⚠️ [MIDDLEWARE] Error → Dejando pasar (validación en cliente)')
    return res
  }
}

// ============================================================================
// CONFIGURACIÓN: Qué rutas interceptar
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}