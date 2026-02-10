// ============================================================================
// ARCHIVO: lib/supabase.ts
// VERSIÓN: 3.0 - GENERIC BUILD (Sin dependencias de database.types)
// 
// CONFIGURACIÓN:
// ✅ Cliente genérico sin tipos específicos
// ✅ persistSession y autoRefreshToken habilitados
// ✅ Storage adapter con logs
// ✅ Compatible con Vercel build
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

console.log('🔧 [SUPABASE] Inicializando cliente con:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  timestamp: new Date().toISOString()
})

// ============================================================================
// STORAGE ADAPTER COMPATIBLE CON SSR
// ============================================================================

const isClient = typeof window !== 'undefined'

const customStorageAdapter = {
  getItem: (key: string): string | null => {
    if (!isClient) return null
    
    try {
      const item = localStorage.getItem(key)
      console.log(`📦 [STORAGE] getItem("${key}"):`, item ? 'encontrado' : 'null')
      return item
    } catch (error) {
      console.error('❌ [STORAGE] Error en getItem:', error)
      return null
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (!isClient) return
    
    try {
      localStorage.setItem(key, value)
      console.log(`💾 [STORAGE] setItem("${key}"): guardado`)
    } catch (error) {
      console.error('❌ [STORAGE] Error en setItem:', error)
    }
  },
  
  removeItem: (key: string): void => {
    if (!isClient) return
    
    try {
      localStorage.removeItem(key)
      console.log(`🗑️ [STORAGE] removeItem("${key}"): eliminado`)
    } catch (error) {
      console.error('❌ [STORAGE] Error en removeItem:', error)
    }
  }
}

// ============================================================================
// CLIENTE DE SUPABASE (GENÉRICO - SIN TIPOS ESPECÍFICOS)
// ============================================================================

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: customStorageAdapter,
      flowType: 'pkce',
      storageKey: 'sb-auth-token',
      debug: process.env.NODE_ENV === 'development'
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-web'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// ============================================================================
// HELPER: Verificar si hay sesión activa
// ============================================================================

export const checkSession = async () => {
  console.log('🔍 [SESSION] Verificando sesión actual...')
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ [SESSION] Error al obtener sesión:', error)
      return null
    }
    
    if (session) {
      console.log('✅ [SESSION] Sesión activa encontrada:', {
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
// LISTENER: Monitor de cambios de autenticación
// ============================================================================

if (isClient) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔔 [AUTH_EVENT]', {
      event,
      hasSession: !!session,
      user: session?.user?.email || 'ninguno',
      timestamp: new Date().toISOString()
    })
    
    if (event === 'SIGNED_IN' && session) {
      console.log('✅ [AUTH] Usuario logueado, sesión guardada')
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('🚪 [AUTH] Usuario deslogueado, limpiando sesión')
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