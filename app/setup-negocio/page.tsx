'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupNegocio() {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Aquí iría la lógica para insertar en la tabla "Negocio"
    // Por ahora, solo simulamos para que veas que el flujo sigue
    alert('Negocio creado (Simulado). Ahora deberías ir al Dashboard.')
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 w-full max-w-md">
        <h1 className="text-2xl font-black text-white mb-6 uppercase">Configurá tu Negocio</h1>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm block mb-2 font-bold uppercase">Nombre del Local</label>
            <input 
              required
              type="text" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ej: Barbería Los Pibes"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase hover:scale-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Finalizar Configuración'}
          </button>
        </form>
      </div>
    </div>
  )
}
