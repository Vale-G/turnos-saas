'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

function validarPassword(password: string): string | null {
  if (password.length < 8) return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'Debe incluir al menos una mayúscula'
  if (!/[0-9]/.test(password)) return 'Debe incluir al menos un número'
  return null
}

export default function RegistroNegocio() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()

    const pwError = validarPassword(password)
    if (pwError) {
      setPasswordError(pwError)
      return
    }
    setPasswordError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({ email, password })

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Este email ya está en uso. ¿Querés iniciar sesión?', {
            action: {
              label: 'Iniciar sesión',
              onClick: () => router.push('/login'),
            },
          })
        } else {
          toast.error('No se pudo crear tu cuenta en este momento.')
        }
        return
      }

      toast.success('¡Cuenta creada! Serás redirigido para configurar tu negocio.')
      setTimeout(() => router.push('/onboarding'), 1500)
    } catch {
      toast.error('Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-black uppercase italic text-emerald-500 mb-8 text-center tracking-tighter">
          Crear tu <span className="text-white">Cuenta</span>
        </h1>

        <form onSubmit={handleRegistro} className="space-y-4">
          <input
            type="email"
            placeholder="Tu email de acceso"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all"
          />

          <div className="space-y-1">
            <input
              type="password"
              placeholder="Contraseña segura"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (passwordError) setPasswordError(null)
              }}
              required
              className={`w-full bg-black/50 border p-4 rounded-2xl outline-none transition-all ${
                passwordError
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {passwordError ? (
              <p className="text-red-400 text-xs ml-2 font-bold">
                {passwordError}
              </p>
            ) : (
              <p className="text-slate-600 text-[11px] ml-2">
                Mín. 8 caracteres, una mayúscula y un número
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-black font-black uppercase italic py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Procesando...' : 'Crear mi cuenta gratis'}
          </button>

          <p className="text-slate-500 text-sm text-center pt-4">
            ¿Ya tenés cuenta?{' '}
            <a
              href="/login"
              className="text-emerald-500 font-black hover:underline"
            >
              Iniciar sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
