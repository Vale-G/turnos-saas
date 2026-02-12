'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    if (perfil?.negocio_id) {
      const { data } = await supabase.from('Staff').select('*').eq('negocio_id', perfil.negocio_id)
      setStaff(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const add = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    await supabase.from('Staff').insert([{ nombre, negocio_id: perfil?.negocio_id }])
    setNombre('')
    load()
  }

  const remove = async (id: string) => {
    await supabase.from('Staff').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="p-8 text-slate-500 font-black animate-pulse uppercase">Cargando Equipo...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Equipo / Barberos</h1>
      
      <form onSubmit={add} className="flex gap-2 bg-slate-900 p-4 rounded-3xl border border-slate-800">
        <input placeholder="Nombre del Barbero" value={nombre} onChange={e => setNombre(e.target.value)} className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <button className="px-8 rounded-2xl font-black bg-emerald-500 text-black uppercase italic shadow-lg shadow-emerald-500/20">Agregar</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map(member => (
          <div key={member.id} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center group shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl">👤</div>
              <p className="font-bold text-white text-lg">{member.nombre}</p>
            </div>
            <button onClick={() => remove(member.id)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}
