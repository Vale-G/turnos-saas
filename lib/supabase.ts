// ============================================================================
// ARCHIVO: lib/supabase.ts
// VERSIÓN: 8.0 - UNIFIED STORAGE KEY
// 
// SOLUCIÓN AL PROBLEMA DE "ISLAS DE DATOS":
// ✅ Storage key unificado: 'plataforma-saas-auth-token'
// ✅ Sin custom storage adapter (usa nativo de Supabase)
// ✅ persistSession y autoRefreshToken habilitados
// ✅ Compatible con SSR/CSR
// ============================================================================

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL no está definida en .env.local')
}

if (!supabaseAnonKey) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida en .env.local')
}

console.log('🔧 [SUPABASE] Inicializando cliente unificado...')

// ============================================================================
// CLIENTE DE SUPABASE - CONFIGURACIÓN SIMPLIFICADA
// ============================================================================

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // ✅ CRÍTICO: Nombre de llave único y consistente
      storageKey: 'plataforma-saas-auth-token',
      
      // ✅ Persistir sesión entre recargas
      persistSession: true,
      
      // ✅ Auto-renovar tokens
      autoRefreshToken: true,
      
      // ✅ Detectar sesión en URL (OAuth redirects)
      detectSessionInUrl: true,
      
      // ✅ Flow PKCE para seguridad
      flowType: 'pkce',
      
      // ✅ Debug mode (solo desarrollo)
      debug: process.env.NODE_ENV === 'development'
    },
    
    global: {
      headers: {
        'x-client-info': 'supabase-js-web'
      }
    }
  }
)

// ============================================================================
// HELPER: Verificar sesión actual
// ============================================================================

export const checkSession = async () => {
  console.log('🔍 [SESSION] Verificando sesión actual...')
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ [SESSION] Error:', error.message)
      return null
    }
    
    if (session) {
      console.log('✅ [SESSION] Sesión activa:', {
        user_id: session.user.id,
        email: session.user.email,
        expires_at: new Date(session.expires_at! * 1000).toISOString()
      })
    } else {
      console.warn('⚠️ [SESSION] No hay sesión activa')
    }
    
    return session
  } catch (error) {
    console.error('💥 [SESSION] Error crítico:', error)
    return null
  }
}

// ============================================================================
// HELPER: Esperar a que la sesión esté lista (CON REINTENTOS)
// ============================================================================

export const waitForSession = async (maxAttempts = 5, delayMs = 500): Promise<any> => {
  console.log(`⏳ [SESSION] Esperando sesión (máximo ${maxAttempts} intentos)...`)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 [SESSION] Intento ${attempt}/${maxAttempts}`)
    
    const session = await checkSession()
    
    if (session) {
      console.log('🎉 [SESSION] Sesión recuperada exitosamente')
      return session
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏸️ [SESSION] Esperando ${delayMs}ms antes del siguiente intento...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  console.error('❌ [SESSION] Fallo definitivo: no se pudo recuperar la sesión')
  return null
}

// ============================================================================
// HELPER: Refrescar sesión (SACUDÓN DE SESIÓN)
// ============================================================================

export const refreshSession = async () => {
  console.log('🔄 [REFRESH] Intentando refrescar sesión...')
  
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('❌ [REFRESH] Error al refrescar:', error.message)
      return null
    }
    
    if (data.session) {
      console.log('✅ [REFRESH] Sesión refrescada exitosamente')
      return data.session
    }
    
    console.warn('⚠️ [REFRESH] No se pudo refrescar la sesión')
    return null
    
  } catch (error: any) {
    console.error('💥 [REFRESH] Error crítico:', error.message)
    return null
  }
}

// ============================================================================
// LISTENER: Monitor de cambios de autenticación (SOLO CLIENTE)
// ============================================================================

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔔 [AUTH_EVENT]', {
      event,
      hasSession: !!session,
      user: session?.user?.email || 'ninguno',
      timestamp: new Date().toISOString()
    })
    
    // Verificar que la llave esté presente
    const storageKey = 'plataforma-saas-auth-token'
    const storedValue = localStorage.getItem(storageKey)
    
    if (event === 'SIGNED_IN' && session) {
      console.log('✅ [AUTH] Usuario logueado')
      console.log(`🔍 [DEBUG] localStorage["${storageKey}"] existe:`, !!storedValue)
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('🚪 [AUTH] Usuario deslogueado')
      console.log(`🔍 [DEBUG] Limpiando localStorage["${storageKey}"]`)
    }
    
    if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 [AUTH] Token renovado automáticamente')
    }
  })
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default supabase