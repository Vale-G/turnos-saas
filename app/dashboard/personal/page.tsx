'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PersonalPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
        const { data } = await supabase.from('Staff').select('*').eq('negocio_id', perfil?.negocio_id)
        setStaff(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-emerald-500 font-black animate-pulse uppercase text-xs">Cargando Staff...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Mi <span className="text-emerald-500">Equipo</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map(s => (
          <div key={s.id} className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center font-black text-black uppercase">{s.nombre[0]}</div>
            <span className="text-xl font-bold uppercase italic">{s.nombre}</span>
          </div>
        ))}
      </div>
      {staff.length === 0 && <p className="text-slate-500 italic">No hay peluqueros cargados aún.</p>}
    </div>
  )
}
