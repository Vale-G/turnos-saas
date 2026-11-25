'use client'

import { useState, useEffect, useCallback } from 'react'
import { getOAuthRedirectUrl, supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

function validarPassword(password: string): string | null {
  if (password.length < 8) return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'Debe incluir al menos una mayúscula'
  if (!/[0-9]/.test(password)) return 'Debe incluir al menos un número'
  return null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function RegistroNegocio() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const checkSlugDisponibilidad = useCallback(async (slugToCheck: string, signal: AbortSignal) => {
    if (slugToCheck.length < 3) return
    setSlugStatus('checking')
    try {
      const response = await fetch(`/api/public/slugs/${encodeURIComponent(slugToCheck)}`, { cache: 'no-store', signal })
      const data = response.ok ? await response.json() : null
      if (!signal.aborted) {
        setSlugStatus(typeof data?.available === 'boolean' ? data.available ? 'available' : 'taken' : 'idle')
      }
    } catch {
      if (!signal.aborted) setSlugStatus('idle')
    }
  }, [])

  useEffect(() => {
    if (!slug) return
    const request = new AbortController()
    const timer = setTimeout(() => { void checkSlugDisponibilidad(slug, request.signal) }, 500)
    return () => {
      clearTimeout(timer)
      request.abort()
    }
  }, [slug, checkSlugDisponibilidad])

  const handleNombreChange = (value: string) => {
    setNombreNegocio(value)
    if (!slugManual) {
      const nextSlug = slugify(value)
      setSlug(nextSlug)
      setSlugStatus(nextSlug.length < 3 ? 'invalid' : 'idle')
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugManual(true)
    const nextSlug = slugify(value)
    setSlug(nextSlug)
    setSlugStatus(nextSlug.length < 3 ? 'invalid' : 'idle')
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones previas
    const pwError = validarPassword(password)
    if (pwError) { 
      setPasswordError(pwError)
      return 
    }

    if (!slug || slug.length < 3) {
      toast.error('El slug debe tener al menos 3 caracteres')
      return
    }

    if (slugStatus === 'taken') {
      toast.error('Este slug ya está ocupado. Elegí otro.')
      return
    }

    if (slugStatus === 'checking') {
      toast.error('Esperá un momento, estamos verificando la disponibilidad...')
      return
    }

    setPasswordError(null)
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: getOAuthRedirectUrl('/auth/callback?next=/onboarding') },
      })
      if (authError) {
        toast.error('No pudimos crear la cuenta. Revisá los datos o iniciá sesión si ya tenés una cuenta.')
        return
      }
      if (!authData.session) {
        toast.success('Revisá tu correo para confirmar la cuenta y continuar')
        router.push('/login')
        return
      }

      const response = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreNegocio, slug, whatsapp: '', tema: 'emerald', apertura: '09:00', cierre: '18:00' }),
      }).catch(() => null)
      if (!response?.ok) {
        const payload = await response?.json().catch(() => null)
        toast.error(payload?.error ?? 'La cuenta se creó. Continuá con la configuración del negocio.')
        router.push('/onboarding')
        return
      }
      toast.success('¡Cuenta y negocio creados!')
      router.push('/dashboard')
    } catch {
      toast.error('No pudimos completar el registro. Revisá tu correo o intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener el ícono y color del estado del slug
  const getSlugStatusUI = () => {
    switch (slugStatus) {
      case 'checking':
        return { icon: '⏳', color: 'text-slate-500', text: 'Verificando...' }
      case 'available':
        return { icon: '✓', color: 'text-emerald-500', text: 'Disponible' }
      case 'taken':
        return { icon: '✗', color: 'text-rose-500', text: 'Ya está en uso' }
      case 'invalid':
        return { icon: '⚠', color: 'text-amber-500', text: 'Mínimo 3 caracteres' }
      default:
        return null
    }
  }

  const statusUI = getSlugStatusUI()

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-black uppercase italic text-emerald-500 mb-8 text-center tracking-tighter">
          Crear mi <span className="text-white">Plataforma</span>
        </h1>

        <form onSubmit={handleRegistro} className="space-y-4">
          <input
            type="text"
            aria-label="Nombre del negocio"
            autoComplete="organization"
            placeholder="Nombre de tu negocio (ej: Espacio Norte)"
            value={nombreNegocio}
            className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all"
            onChange={(e) => handleNombreChange(e.target.value)}
            required
          />

          <div className="space-y-1">
            <div className="relative">
              <input
                type="text"
                aria-label="Enlace público del negocio"
                placeholder="tu-negocio-aqui"
                value={slug}
                className={`w-full bg-black/50 border p-4 rounded-2xl outline-none font-mono text-sm transition-all ${
                  slugStatus === 'available' 
                    ? 'border-emerald-500 text-emerald-400' 
                    : slugStatus === 'taken' 
                    ? 'border-rose-500 text-rose-400'
                    : 'border-slate-800 text-slate-300 focus:border-emerald-500'
                }`}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                minLength={3}
              />
              <div className="absolute right-4 top-4 flex items-center gap-2">
                {statusUI && (
                  <>
                    <span className={`text-base ${statusUI.color}`}>{statusUI.icon}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${statusUI.color}`}>
                      {statusUI.text}
                    </span>
                  </>
                )}
              </div>
            </div>
            {slug && (
              <p className="text-[11px] text-slate-500 ml-2">
                Tu link de reservas:{' '}
                <span className={`font-mono font-bold ${slugStatus === 'available' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  /reservar/{slug}
                </span>
              </p>
            )}
          </div>

          <hr className="border-slate-800 my-2" />

          <input
            type="email"
            aria-label="Correo electrónico"
            autoComplete="email"
            placeholder="Email de acceso"
            className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="space-y-1">
            <input
              type="password"
              aria-label="Contraseña nueva"
              aria-describedby="registro-password-help"
              aria-invalid={Boolean(passwordError)}
              autoComplete="new-password"
              placeholder="Contraseña segura"
              className={`w-full bg-black/50 border p-4 rounded-2xl outline-none transition-all ${
                passwordError
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-slate-800 focus:border-emerald-500'
              }`}
              onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(null) }}
              required
            />
            {passwordError ? (
              <p id="registro-password-help" role="alert" className="text-red-400 text-xs ml-2 font-bold">{passwordError}</p>
            ) : (
              <p id="registro-password-help" className="text-slate-400 text-[11px] ml-2">Mín. 8 caracteres, una mayúscula y un número</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || slugStatus === 'taken' || slugStatus === 'checking' || slugStatus === 'invalid'}
            className="w-full bg-emerald-500 text-black font-black uppercase italic py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Procesando...' : 'Crear mi cuenta gratis'}
          </button>

          <p className="text-slate-500 text-sm text-center">
            ¿Ya tenés cuenta?{' '}
            <a href="/login" className="text-emerald-500 font-black hover:underline">
              Iniciar sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
