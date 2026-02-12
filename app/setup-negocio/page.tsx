'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupNegocio() {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorInfo, setErrorInfo] = useState<string | null>(null) // Para ver el error rojo
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorInfo(null)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        setErrorInfo("No se encontró sesión de usuario");
        setLoading(false);
        return;
    }

    // Insertar Negocio
    const { data: negocio, error: errNegocio } = await supabase
      .from('Negocio')
      .insert([{ 
        nombre: nombre, 
        dueno_id: user.id,
        plan: 'trial',
        estado_plan: 'activo'
      }])
      .select().single()

    if (errNegocio) {
      setErrorInfo(`Error en Tabla Negocio: ${errNegocio.message} - ${errNegocio.details}`);
      setLoading(false);
      return;
    }

    // Vincular Perfil
    const { error: errPerfil } = await supabase
      .from('perfiles')
      .update({ negocio_id: negocio.id })
      .eq('id', user.id)

    if (errPerfil) {
      setErrorInfo(`Error en Tabla Perfiles: ${errPerfil.message}`);
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 w-full max-w-md">
        <h1 className="text-2xl font-black text-white mb-6 uppercase italic">Configurá tu Local</h1>
        
        {errorInfo && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl mb-4 text-sm font-mono">
            {errorInfo}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <input 
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white"
            placeholder="Nombre del local..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase">
            {loading ? 'Guardando...' : 'Crear Negocio'}
          </button>
        </form>
      </div>
    </div>
  )
}