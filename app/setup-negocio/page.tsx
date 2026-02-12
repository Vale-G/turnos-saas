'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupNegocio() {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    
    // 1. Insertamos el negocio en la tabla "Negocio"
    const { data: negocio, error: errorNegocio } = await supabase
      .from('Negocio')
      .insert([{ 
        nombre: nombre, 
        dueno_id: user.id, // Ojo: verifica si tu columna se llama dueno_id o admin_id
        plan: 'trial',
        estado_plan: 'activo'
      }])
      .select()
      .single()

    if (errorNegocio) {
      console.error(errorNegocio)
      alert('Error al crear: ' + errorNegocio.message)
      setLoading(false)
      return
    }

    // 2. Vinculamos al usuario con ese negocio en la tabla "perfiles"
    const { error: errorPerfil } = await supabase
      .from('perfiles')
      .update({ negocio_id: negocio.id })
      .eq('id', user.id)

    if (errorPerfil) {
      alert('Error al vincular perfil')
    } else {
      alert('¡Negocio creado con éxito!')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 w-full max-w-md">
        <h1 className="text-2xl font-black text-white mb-6 uppercase italic">Configurá tu Local</h1>
        <form onSubmit={handleCreate} className="space-y-4">
          <input 
            required
            type="text" 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white"
            placeholder="Nombre de la Peluquería/Barbería"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase hover:scale-105 transition-all disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Empezar a usar el sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}