'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error("Error al entrar: " + error.message)
      setLoading(false)
    } else if (data.user) {
      // 1. Verificar si es superadmin para redirección inteligente
      const { data: rol } = await supabase
        .from('adminrol')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle()

      const rolValue = String(rol?.role ?? rol?.rol ?? rol?.tipo ?? '').toLowerCase()
      
      if (rolValue === 'superadmin') {
        toast.success("Bienvenido, Administrador")
        router.push('/superadmin')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative">
      {/* Icono discreto de acceso directo arriba a la derecha */}
      <button 
        onClick={() => router.push('/superadmin')}
        className="absolute top-6 right-6 text-slate-800 hover:text-slate-600 transition-colors"
      >
        🔒
      </button>

      <form onSubmit={handleLogin} className="max-w-md w-full bg-slate-900/50 p-10 rounded-[3rem] border border-slate-800 space-y-6 text-center">
        <h1 className="text-4xl font-black italic uppercase text-emerald-500">
          Hola <span className="text-white">De Nuevo</span>
        </h1>
        <div className="space-y-4 text-left">
          <input 
            type="email" placeholder="Tu Email" 
            className="w-full bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" placeholder="Tu Contraseña" 
            className="w-full bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button 
          disabled={loading}
          className="w-full bg-white text-black font-black uppercase italic py-4 rounded-2xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar al Panel'}
        </button>
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
