// ============================================================================
// ARCHIVO: middleware.ts (raíz del proyecto)
// DESCRIPCIÓN: Protección de rutas mediante verificación de sesión
// 
// FUNCIONAMIENTO:
// 1. Se ejecuta ANTES de cada request a rutas protegidas
// 2. Verifica si existe una sesión válida en Supabase
// 3. Si NO hay sesión, redirige a /login
// 4. Si HAY sesión, permite el acceso
// 
// TRAZABILIDAD DE SEGURIDAD:
// - Supabase almacena la sesión en cookies httpOnly (seguras)
// - El middleware lee estas cookies en cada request
// - No se puede bypassear desde el cliente porque todo pasa por el servidor
// ============================================================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  
  // ==========================================================================
  // PASO 1: Crear cliente de Supabase con contexto de request/response
  // IMPORTANTE: createMiddlewareClient lee las cookies automáticamente
  // ==========================================================================
  
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // ==========================================================================
  // PASO 2: Obtener sesión actual
  // TRAZABILIDAD:
  // - getSession() lee la cookie de sesión
  // - Si la cookie es válida y no ha expirado, retorna la sesión
  // - Si no existe o expiró, retorna null
  // ==========================================================================
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // ==========================================================================
  // PASO 3: Proteger rutas del dashboard
  // Si no hay sesión, redirigir a login
  // ==========================================================================
  
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    // Construir URL de redirección
    const redirectUrl = new URL('/login', req.url)
    
    // Opcional: Guardar la URL original para redirigir después del login
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    
    return NextResponse.redirect(redirectUrl)
  }

  // ==========================================================================
  // PASO 4: Si hay sesión, verificar que tenga perfil
  // SEGURIDAD: Evitar acceso a usuarios sin perfil completo
  // ==========================================================================
  
  if (req.nextUrl.pathname.startsWith('/dashboard') && session) {
    // Verificar si existe perfil
    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('id, rol, negocio_id')
      .eq('id', session.user.id)
      .single()

    // Si no hay perfil, redirigir a página de configuración inicial
    if (error || !perfil) {
      const setupUrl = new URL('/setup-perfil', req.url)
      return NextResponse.redirect(setupUrl)
    }

    // Si no tiene negocio asignado (excepto staff), redirigir a setup
    if (!perfil.negocio_id && perfil.rol !== 'staff') {
      const setupUrl = new URL('/setup-negocio', req.url)
      return NextResponse.redirect(setupUrl)
    }
  }

  // ==========================================================================
  // PASO 5: Redirigir usuarios autenticados que intentan acceder a /login
  // ==========================================================================
  
  if (req.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // ==========================================================================
  // PASO 6: Permitir acceso
  // ==========================================================================
  
  return res
}

// ============================================================================
// CONFIGURACIÓN: Rutas donde se ejecuta el middleware
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}