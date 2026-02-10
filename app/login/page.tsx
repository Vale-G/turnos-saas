// ============================================================================
// ARCHIVO: app/login/page.tsx
// VERSIÓN: 2.0 - AUTH SESSION SYNC
// 
// MEJORAS IMPLEMENTADAS:
// ✅ Login con signInWithPassword
// ✅ Espera a que la sesión se escriba en storage
// ✅ Verificación de sesión antes de redirigir
// ✅ Listener onAuthStateChange para sincronización
// ✅ Logs detallados de cada paso
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, waitForSession } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  
  // Estados
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificandoSesion, setVerificandoSesion] = useState(true)

  // ============================================================================
  // EFECTO: Verificar si ya hay sesión activa
  // ============================================================================
  
  useEffect(() => {
    console.log('🔐 [LOGIN] Verificando sesión previa...')
    verificarSesionPrevia()
  }, [])

  const verificarSesionPrevia = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('✅ [LOGIN] Sesión activa detectada, redirigiendo a dashboard...')
        router.push('/dashboard')
      } else {
        console.log('ℹ️ [LOGIN] No hay sesión activa, mostrando formulario')
      }
    } catch (error) {
      console.error('❌ [LOGIN] Error verificando sesión previa:', error)
    } finally {
      setVerificandoSesion(false)
    }
  }

  // ============================================================================
  // HANDLER: Login con espera de sesión
  // ============================================================================
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 [LOGIN] Iniciando proceso de login...')
    setLoading(true)
    setError('')

    try {
      // -----------------------------------------------------------------------
      // PASO 1: Autenticar con Supabase
      // -----------------------------------------------------------------------
      console.log('📡 [LOGIN] Enviando credenciales a Supabase...')
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (signInError) {
        console.error('❌ [LOGIN] Error de autenticación:', signInError)
        
        // Mensajes de error legibles
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión')
        } else {
          setError(signInError.message)
        }
        
        setLoading(false)
        return
      }

      if (!data.session) {
        console.error('❌ [LOGIN] Login exitoso pero sin sesión')
        setError('Error al crear la sesión. Intenta de nuevo.')
        setLoading(false)
        return
      }

      console.log('✅ [LOGIN] Autenticación exitosa:', {
        user_id: data.user.id,
        email: data.user.email,
        session_expires: new Date(data.session.expires_at! * 1000).toISOString()
      })

      // -----------------------------------------------------------------------
      // PASO 2: CRÍTICO - Esperar a que la sesión se escriba en storage
      // -----------------------------------------------------------------------
      console.log('⏳ [LOGIN] Esperando a que la sesión se guarde en localStorage...')
      
      // Esperar 300ms para dar tiempo al navegador
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // -----------------------------------------------------------------------
      // PASO 3: Verificar que la sesión está disponible
      // -----------------------------------------------------------------------
      console.log('🔍 [LOGIN] Verificando disponibilidad de sesión...')
      
      const session = await waitForSession(3, 500) // 3 intentos, 500ms entre cada uno
      
      if (!session) {
        console.error('❌ [LOGIN] La sesión no está disponible después de esperar')
        setError('Error al sincronizar la sesión. Recarga la página.')
        setLoading(false)
        return
      }

      console.log('✅ [LOGIN] Sesión verificada y disponible')

      // -----------------------------------------------------------------------
      // PASO 4: Suscribirse a cambios de autenticación (opcional pero útil)
      // -----------------------------------------------------------------------
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔔 [LOGIN] Auth state change:', event)
        
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ [LOGIN] onAuthStateChange confirmó SIGNED_IN')
        }
      })

      // -----------------------------------------------------------------------
      // PASO 5: Redirigir al dashboard
      // -----------------------------------------------------------------------
      console.log('🎯 [LOGIN] Redirigiendo a dashboard...')
      
      // IMPORTANTE: Pequeño delay adicional para asegurar sincronización
      await new Promise(resolve => setTimeout(resolve, 200))
      
      router.push('/dashboard')
      
      // Limpiar suscripción después de redirigir
      setTimeout(() => subscription.unsubscribe(), 1000)

    } catch (error: any) {
      console.error('💥 [LOGIN] Error crítico:', error)
      setError(`Error inesperado: ${error.message}`)
      setLoading(false)
    }
  }

  // ============================================================================
  // HANDLER: Login con Google (opcional)
  // ============================================================================
  
  const handleGoogleLogin = async () => {
    console.log('🔐 [LOGIN] Iniciando login con Google...')
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        console.error('❌ [LOGIN] Error con Google:', error)
        setError('Error al iniciar sesión con Google')
      }
    } catch (error: any) {
      console.error('💥 [LOGIN] Error crítico con Google:', error)
      setError(`Error: ${error.message}`)
    }
  }

  // ============================================================================
  // PANTALLA DE CARGA INICIAL
  // ============================================================================
  
  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDERIZADO DEL FORMULARIO
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-3xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
            <span className="text-4xl">✂️</span>
          </div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
            Bienvenido
          </h1>
          <p className="text-slate-500 text-sm">
            Inicia sesión para acceder al dashboard
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Email */}
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#10b981] transition-colors"
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#10b981] transition-colors"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
              <p className="text-red-400 text-sm text-center font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#10b981] hover:bg-[#059669] disabled:bg-slate-700 disabled:cursor-not-allowed text-black font-black uppercase text-sm tracking-widest py-5 rounded-2xl transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#020617] px-4 text-slate-600 font-bold">o continúa con</span>
            </div>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 disabled:bg-slate-700 disabled:cursor-not-allowed text-gray-900 font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </button>

        </form>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          ¿No tienes cuenta?{' '}
          <a href="/registro" className="text-[#10b981] hover:underline font-bold">
            Regístrate aquí
          </a>
        </p>

      </div>
    </div>
  )
}