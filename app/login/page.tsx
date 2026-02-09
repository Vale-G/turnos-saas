// ============================================================================
// ARCHIVO: app/login/page.tsx
// DESCRIPCIÓN: Página de login profesional con autenticación Supabase
// 
// FLUJO DE AUTENTICACIÓN:
// 1. Usuario ingresa email y password
// 2. Se valida con supabase.auth.signInWithPassword()
// 3. Si es exitoso, Supabase crea una sesión automáticamente
// 4. El middleware verifica la sesión y permite acceso a /dashboard
// 5. El dashboard carga el perfil del usuario desde la tabla 'perfiles'
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================================================
// TIPOS LOCALES
// ============================================================================

type Message = {
  texto: string
  tipo: 'success' | 'error' | 'info' | 'warning'
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function LoginPage() {
  
  // ==========================================================================
  // ESTADO
  // ==========================================================================
  
  const router = useRouter()
  
  // Estado del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Estados de UI
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<Message>({ texto: '', tipo: 'info' })
  
  // Estado para toggle entre login y registro
  const [modo, setModo] = useState<'login' | 'registro'>('login')

  // ==========================================================================
  // EFECTO: Verificar si ya hay sesión activa
  // TRAZABILIDAD: 
  // 1. Al montar el componente, verifica si existe una sesión
  // 2. Si existe, redirige automáticamente al dashboard
  // 3. Esto evita que usuarios ya autenticados vean la pantalla de login
  // ==========================================================================
  
  useEffect(() => {
    verificarSesionActiva()
  }, [])

  const verificarSesionActiva = async () => {
    try {
      // PASO 1: Obtener sesión actual de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      // PASO 2: Si existe sesión, redirigir al dashboard
      if (session) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error verificando sesión:', error)
    }
  }

  // ==========================================================================
  // FUNCIÓN: Sistema de notificaciones
  // ==========================================================================
  
  const notify = (texto: string, tipo: Message['tipo']) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: 'info' }), 5000)
  }

  // ==========================================================================
  // HANDLER: Login con email y password
  // TRAZABILIDAD:
  // 1. Usuario envía credenciales
  // 2. Supabase valida contra auth.users
  // 3. Si es válido, crea una sesión en el navegador (cookie httpOnly)
  // 4. La sesión persiste automáticamente entre recargas
  // 5. El middleware verifica esta sesión en cada request
  // ==========================================================================
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // VALIDACIÓN: Email y password requeridos
      if (!email || !password) {
        notify('⚠️ Completa todos los campos', 'warning')
        setLoading(false)
        return
      }

      // PASO 1: Intentar autenticación con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      // PASO 2: Manejar errores de autenticación
      if (error) {
        // Mensajes de error personalizados según el tipo
        if (error.message.includes('Invalid login credentials')) {
          notify('❌ Email o contraseña incorrectos', 'error')
        } else if (error.message.includes('Email not confirmed')) {
          notify('⚠️ Por favor confirma tu email antes de iniciar sesión', 'warning')
        } else {
          notify(`❌ Error: ${error.message}`, 'error')
        }
        setLoading(false)
        return
      }

      // PASO 3: Verificar que exista un perfil para este usuario
      // IMPORTANTE: El trigger debería haberlo creado, pero validamos por seguridad
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', data.user?.id)
        .single()

      if (perfilError || !perfil) {
        notify('⚠️ No se encontró tu perfil. Contacta al administrador.', 'error')
        
        // IMPORTANTE: Cerrar sesión si no hay perfil
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // PASO 4: Login exitoso
      notify('✅ Bienvenido!', 'success')
      
      // PASO 5: Redirigir al dashboard
      // El middleware verificará la sesión y permitirá el acceso
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)

    } catch (error: any) {
      console.error('Error en login:', error)
      notify(`❌ Error inesperado: ${error.message}`, 'error')
      setLoading(false)
    }
  }

  // ==========================================================================
  // HANDLER: Registro de nuevo usuario
  // TRAZABILIDAD:
  // 1. Usuario envía datos de registro
  // 2. Supabase crea usuario en auth.users
  // 3. El TRIGGER ejecuta handle_new_user() automáticamente
  // 4. Se crea un perfil en la tabla 'perfiles' con rol 'staff' por defecto
  // 5. Supabase envía email de confirmación
  // ==========================================================================
  
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!email || !password) {
        notify('⚠️ Completa todos los campos', 'warning')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        notify('⚠️ La contraseña debe tener al menos 6 caracteres', 'warning')
        setLoading(false)
        return
      }

      // PASO 1: Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          // Metadata que se puede usar en el trigger
          data: {
            nombre: email.split('@')[0],
            rol: 'staff' // Rol por defecto
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          notify('⚠️ Este email ya está registrado', 'warning')
        } else {
          notify(`❌ Error: ${error.message}`, 'error')
        }
        setLoading(false)
        return
      }

      // PASO 2: Registro exitoso
      notify('✅ Cuenta creada! Revisa tu email para confirmar.', 'success')
      
      // PASO 3: Cambiar a modo login
      setTimeout(() => {
        setModo('login')
        setPassword('')
      }, 2000)

    } catch (error: any) {
      console.error('Error en registro:', error)
      notify(`❌ Error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================================================
  // RENDERIZADO
  // ==========================================================================
  
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      
      {/* Contenedor principal */}
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl shadow-[#10b981]/20">
            🏢
          </div>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">
            {modo === 'login' ? 'Bienvenido' : 'Registro'}
          </h1>
          <p className="text-slate-500 text-sm font-bold">
            Sistema de Gestión de Turnos
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-10">
          
          <form onSubmit={modo === 'login' ? handleLogin : handleRegistro} className="space-y-6">
            
            {/* Campo: Email */}
            <div>
              <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none focus:border-[#10b981] transition-colors"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Campo: Password */}
            <div>
              <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#020617] border border-white/5 p-5 rounded-2xl text-white text-sm outline-none focus:border-[#10b981] transition-colors"
                disabled={loading}
                autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : (
                modo === 'login' ? '🔓 Iniciar Sesión' : '✨ Crear Cuenta'
              )}
            </button>
          </form>

          {/* Toggle Login/Registro */}
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-slate-400 mb-3">
              {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </p>
            <button
              onClick={() => {
                setModo(modo === 'login' ? 'registro' : 'login')
                setMensaje({ texto: '', tipo: 'info' })
              }}
              className="text-[#10b981] font-black uppercase text-xs hover:underline"
              disabled={loading}
            >
              {modo === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div className={`mt-6 p-4 rounded-2xl text-center text-sm font-black ${
            mensaje.tipo === 'success' ? 'bg-[#10b981]/20 text-[#10b981]' :
            mensaje.tipo === 'error' ? 'bg-red-500/20 text-red-500' :
            mensaje.tipo === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
            'bg-blue-500/20 text-blue-500'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-8 font-bold">
          Powered by Supabase Auth • Seguro y Encriptado
        </p>
      </div>
    </div>
  )
}