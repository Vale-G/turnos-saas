'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Negocio {
  id: string
  nombre: string
  plan: string
  estado_plan: string
  slug: string
  created_at: string
}

export default function SuperAdminPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargarNegocios() {
      const { data, error } = await supabase
        .from('Negocio')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error) setNegocios(data || [])
      setLoading(false)
    }
    cargarNegocios()
  }, [])

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('Negocio')
      .update({ estado_plan: nuevoEstado })
      .eq('id', id)
    
    if (!error) {
      setNegocios(negocios.map(n => n.id === id ? { ...n, estado_plan: nuevoEstado } : n))
    }
  }

  if (loading) return <div className="text-white">Cargando consola de mando...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white uppercase italic">Consola Superadmin</h1>
        <p className="text-slate-400">Gestioná todos los negocios de la plataforma</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Negocio</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {negocios.map((n) => (
              <tr key={n.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-white font-bold">{n.nombre}</div>
                  <div className="text-slate-500 text-xs">/{n.slug}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                    {n.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    n.estado_plan === 'activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {n.estado_plan}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button 
                    onClick={() => cambiarEstado(n.id, n.estado_plan === 'activo' ? 'inactivo' : 'activo')}
                    className="bg-slate-800 hover:bg-white hover:text-black text-white text-xs font-bold py-2 px-4 rounded-xl transition-all"
                  >
                    {n.estado_plan === 'activo' ? 'Suspender' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
