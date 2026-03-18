'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Error al entrar: " + error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="max-w-md w-full bg-slate-900/50 p-10 rounded-[3rem] border border-slate-800 space-y-6 text-center">
        <h1 className="text-4xl font-black italic uppercase text-emerald-500">
          Hola <span className="text-white">De Nuevo</span>
        </h1>
        <div className="space-y-4 text-left">
          <input 
            type="email" placeholder="Tu Email" 
            className="w-full bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Tu Contraseña" 
            className="w-full bg-black border border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="w-full bg-white text-black font-black uppercase italic py-4 rounded-2xl hover:bg-emerald-500 transition-colors">
          {loading ? 'Entrando...' : 'Entrar al Panel'}
        </button>
      </form>
    </div>
  )
}