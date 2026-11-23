'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      if (!error) return
    } catch {
      // Transport failures also restore the form.
    }
    toast.error('No se pudo ingresar con Google. Intentá nuevamente.')
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!address || !password) {
      toast.error('Ingresá tu correo y contraseña.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: address, password })
      if (error || !data.user) {
        toast.error('No se pudo iniciar sesión. Revisá tus datos.')
        return
      }

      const { data: role } = await supabase.from('adminrol').select('role').eq('user_id', data.user.id).maybeSingle()
      router.push(String(role?.role ?? '').toLowerCase() === 'superadmin' ? '/superadmin' : '/dashboard')
    } catch {
      toast.error('No pudimos conectar. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative">
      <Link 
        href="/superadmin"
        className="absolute top-6 right-6 text-slate-800 hover:text-slate-600 transition-colors"
      >
        🔒
      </Link>

      <form onSubmit={handleLogin} className="max-w-md w-full bg-slate-900/50 p-10 rounded-[3rem] border border-slate-800 space-y-6 text-center">
        <h1 className="text-4xl font-black italic uppercase text-emerald-500">
          Hola <span className="text-white">De Nuevo</span>
        </h1>
        <div className="space-y-4 text-left">
          <input 
            type="email" aria-label="Correo electrónico" autoComplete="email" placeholder="Tu Email"
            className="w-full bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-colors"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" aria-label="Contraseña" autoComplete="current-password" placeholder="Tu Contraseña"
            className="w-full bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-colors"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button 
          disabled={loading}
          className="w-full bg-white text-black font-black uppercase italic py-4 rounded-2xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando...' : 'Entrar al Panel'}
        </button>
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-slate-600">
          <span className="h-px flex-1 bg-slate-800" />
          o
          <span className="h-px flex-1 bg-slate-800" />
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-2xl border border-slate-700 bg-white px-4 py-4 font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar con Google
        </button>
        <Link href="/recuperar" className="inline-block py-3 text-sm underline">Olvidé mi contraseña</Link>
        <p className="text-slate-500 text-sm">
          ¿No tenés cuenta?{' '}
          <a href="/registro-negocio" className="text-emerald-500 font-black hover:underline">
            Crear una gratis
          </a>
        </p>
      </form>
    </div>
  )
}
